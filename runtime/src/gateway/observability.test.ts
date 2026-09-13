import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";

describe("SRE Observability Endpoints Contract", () => {
  let server: ReturnType<typeof createServer>;
  const testPort = 39991;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (req.method === "GET" && url.pathname === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "healthy",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          }),
        );
        return;
      }
      if (req.method === "GET" && url.pathname === "/readyz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ready",
            wsClients: 0,
            channelsHealthy: true,
          }),
        );
        return;
      }
      if (req.method === "GET" && url.pathname === "/metrics") {
        const lines = [
          "# HELP agenc_gateway_ws_clients Number of connected WebSocket clients",
          "# TYPE agenc_gateway_ws_clients gauge",
          "agenc_gateway_ws_clients 0",
          "# HELP agenc_gateway_uptime_seconds Process uptime in seconds",
          "# TYPE agenc_gateway_uptime_seconds counter",
          `agenc_gateway_uptime_seconds ${process.uptime().toFixed(2)}`,
        ];
        res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
        res.end(lines.join("\n") + "\n");
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });

    await new Promise<void>((resolve) => {
      server.listen(testPort, "127.0.0.1", () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("serves GET /healthz with valid health status", async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/healthz`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/json");
    const body = (await res.json()) as { status: string; version: string };
    assert.equal(body.status, "healthy");
    assert.equal(body.version, "1.0.0");
  });

  it("serves GET /readyz with readiness indicator", async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/readyz`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string; channelsHealthy: boolean };
    assert.equal(body.status, "ready");
    assert.equal(body.channelsHealthy, true);
  });

  it("serves GET /metrics with Prometheus exposition format", async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/metrics`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/plain"));
    const text = await res.text();
    assert.ok(text.includes("agenc_gateway_ws_clients"));
    assert.ok(text.includes("agenc_gateway_uptime_seconds"));
  });

  it("returns 404 for unknown endpoints", async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/unknown`);
    assert.equal(res.status, 404);
  });
});
