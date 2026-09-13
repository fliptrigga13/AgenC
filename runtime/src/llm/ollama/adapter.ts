/**
 * Ollama local LLM provider adapter.
 *
 * Uses the `ollama` SDK for local model inference.
 * The SDK is loaded lazily on first use — it's an optional dependency.
 *
 * @module
 */

import type {
  LLMChatOptions,
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMToolCall,
  LLMUsage,
  LLMTool,
  StreamProgressCallback,
} from "../types.js";
import { validateToolCall } from "../types.js";
import type { OllamaProviderConfig } from "./types.js";
import { LLMProviderError, mapLLMError } from "../errors.js";
import { ensureLazyImport } from "../lazy-import.js";
import { withTimeout } from "../timeout.js";
import { validateToolTurnSequence } from "../tool-turn-validator.js";
import { randomUUID } from "node:crypto";

const DEFAULT_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "llama3";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  private client: unknown | null = null;
  private readonly config: OllamaProviderConfig;
  private readonly tools: LLMTool[];

  constructor(config: OllamaProviderConfig) {
    this.config = {
      ...config,
      model: config.model ?? DEFAULT_MODEL,
      host: config.host ?? DEFAULT_HOST,
    };
    this.tools = config.tools ?? [];
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMChatOptions,
  ): Promise<LLMResponse> {
    const client = await this.ensureClient();
    const params = this.buildParams(messages, options);

    try {
      const response = await withTimeout(
        async (signal) => (client as any).chat(params, { signal }),
        this.config.timeoutMs,
        this.name,
      );
      return this.parseResponse(response);
    } catch (err: unknown) {
      throw this.mapError(err);
    }
  }

  async chatStream(
    messages: LLMMessage[],
    onChunk: StreamProgressCallback,
    options?: LLMChatOptions,
  ): Promise<LLMResponse> {
    const client = await this.ensureClient();
    const params = { ...this.buildParams(messages, options), stream: true };
    let content = "";
    let model = this.config.model;
    let toolCalls: LLMToolCall[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let isBufferingPotentialToolCall = true;
    let bufferedText = "";

    try {
      const stream = await withTimeout(
        async (signal) => (client as any).chat(params, { signal }),
        this.config.timeoutMs,
        this.name,
      );

      for await (const chunk of stream as AsyncIterable<any>) {
        if (chunk.message?.content) {
          const chunkText = chunk.message.content;
          content += chunkText;

          if (isBufferingPotentialToolCall) {
            bufferedText += chunkText;
            const trimmed = bufferedText.trimStart();
            if (trimmed.startsWith("{") || trimmed.startsWith("```")) {
              // Still accumulating potential JSON tool call payload — hold back from streaming
            } else {
              // Output does not start with JSON / code block — flush buffer and stream normally
              isBufferingPotentialToolCall = false;
              onChunk({ content: bufferedText, done: false });
              bufferedText = "";
            }
          } else {
            onChunk({ content: chunkText, done: false });
          }
        }

        // Accumulate native tool calls if present
        if (chunk.message?.tool_calls) {
          for (const tc of chunk.message.tool_calls) {
            const id =
              tc.id ??
              (tc.function?.name
                ? `call_${tc.function.name}_${randomUUID().slice(0, 8)}`
                : `call_${randomUUID().slice(0, 8)}`);
            const validated = validateToolCall({
              id,
              name: tc.function?.name ?? "",
              arguments: JSON.stringify(tc.function?.arguments ?? {}),
            });
            if (validated) {
              toolCalls.push(validated);
            }
          }
        }

        if (chunk.model) model = chunk.model;
        if (chunk.prompt_eval_count) promptTokens = chunk.prompt_eval_count;
        if (chunk.eval_count) completionTokens = chunk.eval_count;
      }

      // If no native tool_calls were emitted, check if the model outputted tool calls in content
      if (toolCalls.length === 0 && content.trim().length > 0) {
        const extracted = extractToolCallsFromText(content, this.tools);
        if (extracted.toolCalls.length > 0) {
          toolCalls.push(...extracted.toolCalls);
          content = extracted.cleanedContent;
        }
      }

      // If we were buffering and it wasn't a tool call, flush the buffered text
      if (isBufferingPotentialToolCall && bufferedText.length > 0 && toolCalls.length === 0) {
        onChunk({ content: bufferedText, done: false });
      }

      const finishReason: LLMResponse["finishReason"] =
        toolCalls.length > 0 ? "tool_calls" : "stop";
      onChunk({ content: "", done: true, toolCalls });

      return {
        content,
        toolCalls,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        model,
        finishReason,
      };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const isDoneError = errMessage.includes(
        "Did not receive done or success response in stream",
      );

      // If stream generated tokens and reached EOF without done marker:
      if (isDoneError && content.length > 0) {
        if (toolCalls.length === 0 && content.trim().length > 0) {
          const extracted = extractToolCallsFromText(content, this.tools);
          if (extracted.toolCalls.length > 0) {
            toolCalls.push(...extracted.toolCalls);
            content = extracted.cleanedContent;
          }
        }
        if (isBufferingPotentialToolCall && bufferedText.length > 0 && toolCalls.length === 0) {
          onChunk({ content: bufferedText, done: false });
        }
        const finishReason: LLMResponse["finishReason"] =
          toolCalls.length > 0 ? "tool_calls" : "stop";
        onChunk({ content: "", done: true, toolCalls });
        return {
          content,
          toolCalls,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
          model,
          finishReason,
        };
      }

      if (content.length > 0) {
        const mappedError = this.mapError(err);
        onChunk({ content: "", done: true, toolCalls });
        return {
          content,
          toolCalls,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
          model,
          finishReason: "error",
          error: mappedError,
          partial: true,
        };
      }
      throw this.mapError(err);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      await (client as any).list();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureClient(): Promise<unknown> {
    if (this.client) return this.client;

    this.client = await ensureLazyImport("ollama", this.name, (mod) => {
      const OllamaClass = (mod.Ollama ?? mod.default) as any;
      return new OllamaClass({ host: this.config.host });
    });
    return this.client;
  }

  private buildParams(
    messages: LLMMessage[],
    options?: LLMChatOptions,
  ): Record<string, unknown> {
    validateToolTurnSequence(messages, { providerName: this.name });

    const params: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map((m) => this.toOllamaMessage(m)),
    };

    // Build model options
    const modelOptions: Record<string, unknown> = {};
    if (this.config.temperature !== undefined)
      modelOptions.temperature = this.config.temperature;
    if (this.config.maxTokens !== undefined)
      modelOptions.num_predict = this.config.maxTokens;
    if (this.config.numCtx !== undefined) modelOptions.num_ctx = this.config.numCtx;
    if (this.config.numGpu !== undefined) modelOptions.num_gpu = this.config.numGpu;
    if (Object.keys(modelOptions).length > 0) params.options = modelOptions;

    if (this.config.keepAlive !== undefined)
      params.keep_alive = this.config.keepAlive;

    // Tools — Ollama uses OpenAI-compatible format
    if (this.tools.length > 0) {
      const routedToolNames = options?.toolRouting?.allowedToolNames;
      if (routedToolNames && routedToolNames.length > 0) {
        const allowed = new Set(
          routedToolNames
            .map((name) => name.trim())
            .filter((name) => name.length > 0),
        );
        const filtered = this.tools.filter((tool) =>
          allowed.has(tool.function.name),
        );
        params.tools = filtered.length > 0 ? filtered : this.tools;
      } else {
        params.tools = this.tools;
      }
    }

    return params;
  }

  private toOllamaMessage(msg: LLMMessage): Record<string, unknown> {
    if (msg.role === "tool") {
      let content: string;
      if (Array.isArray(msg.content)) {
        content =
          msg.content
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("\n") || "Tool executed successfully.";
      } else {
        content = msg.content;
      }
      return {
        role: "tool",
        content,
        tool_call_id: msg.toolCallId,
      };
    }

    if (msg.role === "assistant") {
      const record: Record<string, unknown> = {
        role: "assistant",
        content: typeof msg.content === "string" ? msg.content : "",
      };
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        record.tool_calls = msg.toolCalls.map((tc) => {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs =
              typeof tc.arguments === "string"
                ? JSON.parse(tc.arguments)
                : (tc.arguments as Record<string, unknown>) ?? {};
          } catch {
            parsedArgs = {};
          }
          return {
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: parsedArgs,
            },
          };
        });
      }
      return record;
    }

    return { role: msg.role, content: msg.content };
  }

  private parseResponse(response: any): LLMResponse {
    const message = response.message ?? {};
    let content = message.content ?? "";

    const toolCalls: LLMToolCall[] = (message.tool_calls ?? [])
      .map((tc: any) => {
        const id =
          tc.id ??
          (tc.function?.name
            ? `call_${tc.function.name}_${randomUUID().slice(0, 8)}`
            : `call_${randomUUID().slice(0, 8)}`);
        return validateToolCall({
          id,
          name: tc.function?.name ?? "",
          arguments: JSON.stringify(tc.function?.arguments ?? {}),
        });
      })
      .filter(
        (toolCall: LLMToolCall | null): toolCall is LLMToolCall =>
          toolCall !== null,
      );

    // If Ollama model emitted tool calls in message.content instead of message.tool_calls:
    if (toolCalls.length === 0 && typeof content === "string" && content.trim().length > 0) {
      const extracted = extractToolCallsFromText(content, this.tools);
      if (extracted.toolCalls.length > 0) {
        toolCalls.push(...extracted.toolCalls);
        content = extracted.cleanedContent;
      }
    }

    const usage: LLMUsage = {
      promptTokens: response.prompt_eval_count ?? 0,
      completionTokens: response.eval_count ?? 0,
      totalTokens:
        (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
    };

    return {
      content,
      toolCalls,
      usage,
      model: response.model ?? this.config.model,
      finishReason: toolCalls.length > 0 ? "tool_calls" : "stop",
    };
  }

  private mapError(err: unknown): Error {
    // Ollama-specific: connection refused means server isn't running
    const e = err as any;
    if (e?.code === "ECONNREFUSED") {
      return new LLMProviderError(
        this.name,
        `Cannot connect to Ollama at ${this.config.host}. Is the server running?`,
      );
    }

    return mapLLMError(this.name, err, this.config.timeoutMs ?? 0);
  }
}

/**
 * Extract structured tool calls that local models (like qwen2.5-coder or llama3)
 * sometimes output into conversational text or markdown code blocks instead of
 * the native provider tool_calls field.
 */
export function extractToolCallsFromText(
  text: string,
  availableTools?: LLMTool[],
): { toolCalls: LLMToolCall[]; cleanedContent: string } {
  const toolCalls: LLMToolCall[] = [];
  if (!text || typeof text !== "string") {
    return { toolCalls, cleanedContent: "" };
  }

  const toolNames = new Set(
    (availableTools ?? []).map((t) => t.function?.name ?? (t as any).name),
  );

  function isRecognizedToolName(name: string): boolean {
    if (!name || typeof name !== "string") return false;
    const trimmed = name.trim();
    if (toolNames.size > 0) {
      return toolNames.has(trimmed);
    }
    return trimmed.length > 0 && /^[a-zA-Z0-9_.:-]+$/.test(trimmed);
  }

  function tryParseObjectAsToolCall(obj: unknown): LLMToolCall | null {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;

    const record = obj as Record<string, unknown>;
    // Format 1: { name, arguments | parameters | args }
    let name = record.name ?? record.tool;
    let args = record.arguments ?? record.parameters ?? record.args;

    // Format 2: { type: 'function', function: { name, arguments } }
    if (!name && record.function && typeof record.function === "object") {
      const fn = record.function as Record<string, unknown>;
      name = fn.name;
      args = fn.arguments ?? fn.parameters;
    }

    if (name && typeof name === "string" && isRecognizedToolName(name)) {
      const argsString =
        typeof args === "string" ? args : JSON.stringify(args ?? {});
      const validated = validateToolCall({
        id: `call_extracted_${randomUUID().slice(0, 8)}`,
        name: name.trim(),
        arguments: argsString,
      });
      return validated;
    }
    return null;
  }

  // 1. Try parsing entire text as JSON (single object or array)
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const tc = tryParseObjectAsToolCall(item);
          if (tc) toolCalls.push(tc);
        }
        if (toolCalls.length > 0) {
          return { toolCalls, cleanedContent: "" };
        }
      } else {
        const tc = tryParseObjectAsToolCall(parsed);
        if (tc) {
          toolCalls.push(tc);
          return { toolCalls, cleanedContent: "" };
        }
      }
    } catch {
      // Fall through to markdown code block extraction
    }
  }

  // 2. Try markdown fenced code blocks: ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let remainingText = "";

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const blockContent = match[1].trim();
    let foundInBlock = false;
    try {
      const parsed = JSON.parse(blockContent) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const tc = tryParseObjectAsToolCall(item);
          if (tc) {
            toolCalls.push(tc);
            foundInBlock = true;
          }
        }
      } else {
        const tc = tryParseObjectAsToolCall(parsed);
        if (tc) {
          toolCalls.push(tc);
          foundInBlock = true;
        }
      }
    } catch {
      // Non-JSON code block
    }

    if (foundInBlock) {
      remainingText += text.slice(lastIndex, match.index);
      lastIndex = match.index + match[0].length;
    }
  }

  if (toolCalls.length > 0) {
    remainingText += text.slice(lastIndex);
    return { toolCalls, cleanedContent: remainingText.trim() };
  }

  return { toolCalls: [], cleanedContent: text };
}

