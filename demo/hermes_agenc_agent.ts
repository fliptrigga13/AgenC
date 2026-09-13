/**
 * Hermes 3 Autonomous Agent Execution Demo for AgenC
 *
 * Runs Hermes 3 via Ollama to autonomously inspect and complete an AgenC task,
 * streaming its chain-of-thought and producing verifiable cryptographic output.
 */

import { PublicKey } from '@solana/web3.js';
import {
  OllamaProvider,
  LLMTaskExecutor,
  type Task,
  type LLMTool,
} from '../runtime/src';

async function main() {
  console.log('='.repeat(65));
  console.log('       AgenC x Hermes 3 Autonomous Agent Execution');
  console.log('='.repeat(65));
  console.log('');

  // 1. Define Protocol Simulation Tools
  const mockTools: LLMTool[] = [
    {
      name: 'get_protocol_config',
      description: 'Fetch AgenC protocol parameters including fee rates and min stake',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'estimate_optimal_fee',
      description: 'Calculate optimal priority fee for settlement on Solana Devnet',
      parameters: {
        type: 'object',
        properties: {
          urgency: { type: 'string', enum: ['normal', 'high', 'urgent'] },
        },
        required: ['urgency'],
      },
    },
  ];

  // Tool call handler
  const toolHandler = async (call: { name: string; arguments?: Record<string, unknown> }) => {
    console.log(`\n[Hermes Tool Call] Executing '${call.name}' with params:`, JSON.stringify(call.arguments || {}));
    if (call.name === 'get_protocol_config') {
      return {
        protocolFeeBps: 250, // 2.5%
        minStake: '500000000', // 0.5 SOL
        programId: '5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7',
        status: 'active',
      };
    }
    if (call.name === 'estimate_optimal_fee') {
      return {
        microLamports: 15000,
        estimatedLatencyMs: 400,
        confidence: 0.98,
      };
    }
    return { error: 'Unknown tool' };
  };

  // 2. Instantiate Ollama Provider with Hermes 3
  console.log('[1/4] Initializing Ollama Provider (model: hermes3:latest)...');
  const provider = new OllamaProvider({
    model: 'hermes3:latest',
    tools: mockTools,
    temperature: 0.2,
    maxTokens: 1024,
  });

  // 3. Configure LLM Task Executor
  console.log('[2/4] Initializing AgenC LLMTaskExecutor...');
  const executor = new LLMTaskExecutor({
    provider,
    toolHandler,
    systemPrompt: [
      'You are Hermes, an autonomous AI agent working inside the AgenC protocol on Solana.',
      'Your role is to analyze tasks, query protocol configuration or fees if relevant,',
      'and synthesize a concise, structured analysis and execution resolution.',
      'Always respond clearly and conclude with your final execution hash or recommendation.',
    ].join(' '),
    streaming: true,
    onStreamChunk: (chunk) => {
      if (chunk.content) {
        process.stdout.write(chunk.content);
      }
    },
  });

  // 4. Construct a sample AgenC Task
  const taskPrompt = 'Analyze protocol economics for a high-value confidential settlement. Query protocol parameters and return fee recommendation.';
  const taskIdBuffer = Buffer.alloc(32);
  taskIdBuffer.writeUInt32BE(101, 28);

  const mockTask: Task = {
    pda: new PublicKey('CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i'),
    taskId: new Uint8Array(taskIdBuffer),
    creator: new PublicKey('EHNevtRqGs13r6H9A7aL7J3K37Vdqisfo8nggV7MtLGe'),
    requiredCapabilities: 3n,
    reward: 1000000000n, // 1 SOL
    description: Buffer.from(taskPrompt, 'utf-8'),
    constraintHash: new Uint8Array(32),
    deadline: Math.floor(Date.now() / 1000) + 3600,
    maxWorkers: 1,
    currentClaims: 1,
    status: 1 as any, // InProgress
  };

  console.log('[3/4] Dispatching Task to Hermes 3:');
  console.log(`      Task PDA: ${mockTask.pda.toBase58()}`);
  console.log(`      Reward:   ${Number(mockTask.reward) / 1e9} SOL`);
  console.log(`      Prompt:   "${taskPrompt}"`);
  console.log('\n--- Streaming Hermes 3 Reasoning & Output ---');

  const startTime = Date.now();
  const outputBigints = await executor.execute(mockTask);
  const elapsedMs = Date.now() - startTime;

  console.log('\n' + '-'.repeat(65));
  console.log('[4/4] Task Execution Completed Successfully!');
  console.log(`      Execution Time: ${(elapsedMs / 1000).toFixed(2)}s`);
  console.log(`      Output BigInts: [${outputBigints.map(b => '0x' + b.toString(16)).join(', ')}]`);
  console.log('='.repeat(65));
}

main().catch((err) => {
  console.error('\nExecution failed:', err);
  process.exit(1);
});
