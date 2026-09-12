import { describe, expect, it, vi } from "vitest";
import {
  computeReconnectDelayMs,
  enqueueBounded,
  flushQueueIfOpen,
  parseJsonMessage,
  safeStringifyMessage,
  serializeAuthMessage,
  serializePingMessage,
} from "./socket-client-core.js";

describe("socket-client-core", () => {
  it("computes exponential reconnect delay with jitter bounds", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const delay = computeReconnectDelayMs(2, {
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0.2,
    });
    randomSpy.mockRestore();
    expect(delay).toBe(4400);
  });

  it("maintains bounded queue size", () => {
    const queue = ["a", "b"];
    enqueueBounded(queue, "c", 2);
    expect(queue).toEqual(["b", "c"]);
  });

  it("flushes queue only when socket is open", () => {
    const sent: string[] = [];
    const queue = ["one", "two"];
    const socket = {
      readyState: 1,
      send: (data: string) => sent.push(data),
    };
    const remaining = flushQueueIfOpen(socket, 1, queue);
    expect(remaining).toBe(0);
    expect(sent).toEqual(["one", "two"]);
  });

  it("serializes ping/auth payloads consistently", () => {
    expect(serializePingMessage()).toBe(JSON.stringify({ type: "ping" }));
    expect(serializeAuthMessage("token")).toBe(
      JSON.stringify({ type: "auth", payload: { token: "token" } }),
    );
  });

  it("parses JSON strings, passes through non-strings, and handles malformed strings gracefully", () => {
    expect(parseJsonMessage("{\"ok\":true}")).toEqual({ ok: true });
    expect(parseJsonMessage({ ok: true })).toEqual({ ok: true });
    expect(parseJsonMessage("not valid json")).toBe("not valid json");
  });

  it("safely stringifies BigInt values without throwing", () => {
    const payload = { lamports: 1000000000n, nested: { value: 42n } };
    const serialized = safeStringifyMessage(payload);
    expect(serialized).toBe(JSON.stringify({ lamports: "1000000000", nested: { value: "42" } }));
  });
});

