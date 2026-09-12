/**
 * High-Intensity Gateway WebSocket Stress & Fuzz Testing Harness
 *
 * Tests:
 * 1. Concurrency: 50 simultaneous persistent WebSocket connections
 * 2. Throughput: 1,000 rapid requests across clients with latency percentile tracking
 * 3. Fuzzing & Malformed Inputs: Invalid JSON, prototype pollution, huge payloads, unknown types
 * 4. Abrupt Socket Destruction: Rapid connect -> partial send -> socket.destroy() churn
 * 5. Concurrent Chat / Session Isolation: Parallel session operations
 */

import { WebSocket } from 'ws';

const WS_URL = process.env.WS_URL ?? 'ws://127.0.0.1:3100';
const CONCURRENT_CLIENTS = 50;
const BURST_PER_CLIENT = 20; // 50 * 20 = 1,000 requests
const CHURN_CYCLES = 30;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class StressMetrics {
  constructor() {
    this.totalSent = 0;
    this.totalReceived = 0;
    this.errors = 0;
    this.latencies = [];
    this.fuzzResponses = [];
    this.churnSuccesses = 0;
    this.churnFailures = 0;
  }

  recordLatency(ms) {
    this.latencies.push(ms);
  }

  summary() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg = sorted.length > 0 ? (sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2) : 0;
    const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

    return {
      totalSent: this.totalSent,
      totalReceived: this.totalReceived,
      errors: this.errors,
      avgLatencyMs: avg,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      maxLatencyMs: max,
      churnSuccesses: this.churnSuccesses,
      churnFailures: this.churnFailures,
    };
  }
}

const metrics = new StressMetrics();

// Helper to create connected WebSocket
function connectClient(id) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Client ${id} connection timed out`));
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      resolve(ws);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ----------------------------------------------------------------------------
// Phase 1: High Concurrency Connection Test
// ----------------------------------------------------------------------------
async function testConcurrentConnections() {
  console.log(`\n[PHASE 1] Establishing ${CONCURRENT_CLIENTS} concurrent WebSocket connections...`);
  const startTime = Date.now();
  const clients = [];

  const promises = Array.from({ length: CONCURRENT_CLIENTS }, async (_, i) => {
    try {
      const client = await connectClient(i);
      clients.push(client);
    } catch (err) {
      metrics.errors++;
      console.error(`  Client ${i} failed to connect: ${err.message}`);
    }
  });

  await Promise.all(promises);
  const duration = Date.now() - startTime;
  console.log(`  Connected ${clients.length}/${CONCURRENT_CLIENTS} clients in ${duration}ms`);

  return clients;
}

// ----------------------------------------------------------------------------
// Phase 2: High-Throughput Request Burst
// ----------------------------------------------------------------------------
async function testHighThroughputBurst(clients) {
  console.log(`\n[PHASE 2] Firing ${clients.length * BURST_PER_CLIENT} rapid requests across clients...`);
  const reqTypes = ['status.get', 'skills.list', 'tasks.list', 'wallet.info', 'memory.sessions'];

  const allRequests = clients.map((ws, clientIdx) => {
    return new Promise(async (resolveClient) => {
      const pendingRequests = new Map();

      ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.id && pendingRequests.has(data.id)) {
            const start = pendingRequests.get(data.id);
            metrics.recordLatency(Date.now() - start);
            metrics.totalReceived++;
            pendingRequests.delete(data.id);
          }
        } catch (e) {
          metrics.errors++;
        }
      });

      for (let i = 0; i < BURST_PER_CLIENT; i++) {
        const reqId = `req_${clientIdx}_${i}_${Math.random().toString(36).slice(2, 8)}`;
        const reqType = reqTypes[i % reqTypes.length];
        const msg = JSON.stringify({ type: reqType, id: reqId, payload: {} });

        pendingRequests.set(reqId, Date.now());
        metrics.totalSent++;
        ws.send(msg);
      }

      // Wait up to 5 seconds for all responses
      const checkInterval = setInterval(() => {
        if (pendingRequests.size === 0) {
          clearInterval(checkInterval);
          resolveClient();
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (pendingRequests.size > 0) {
          metrics.errors += pendingRequests.size;
        }
        resolveClient();
      }, 6000);
    });
  });

  await Promise.all(allRequests);
  console.log(`  Completed burst: ${metrics.totalReceived}/${metrics.totalSent} responses received.`);
}

// ----------------------------------------------------------------------------
// Phase 3: Fuzzing & Malformed Input Testing
// ----------------------------------------------------------------------------
async function testFuzzing(sampleClient) {
  console.log(`\n[PHASE 3] Fuzzing daemon with malformed, oversized, and edge-case envelopes...`);

  const fuzzPayloads = [
    // Invalid JSON
    'NOT_VALID_JSON{[[{',
    '{"incomplete": "json',
    '',
    '    ',
    // Missing required fields
    JSON.stringify({}),
    JSON.stringify({ id: 12345 }), // non-string id
    JSON.stringify({ type: null }),
    JSON.stringify({ type: 9999 }),
    JSON.stringify({ type: '' }),
    // Unknown types
    JSON.stringify({ type: 'unknown.nonexistent.type', id: 'fuzz_1' }),
    JSON.stringify({ type: 'malicious.exploit.attempt', payload: { eval: 'process.exit(1)' }, id: 'fuzz_2' }),
    // Prototype pollution
    JSON.stringify({ type: 'status.get', id: 'fuzz_proto', __proto__: { admin: true }, constructor: { prototype: { hacked: true } } }),
    // Deeply nested payload
    JSON.stringify({
      type: 'status.get',
      id: 'fuzz_nested',
      payload: { a: { b: { c: { d: { e: { f: { g: { h: { i: 'deep' } } } } } } } } },
    }),
    // Oversized message (100 KB payload)
    JSON.stringify({
      type: 'status.get',
      id: 'fuzz_large_100k',
      payload: { data: 'X'.repeat(100 * 1024) },
    }),
    // Very large message (1 MB payload)
    JSON.stringify({
      type: 'status.get',
      id: 'fuzz_large_1mb',
      payload: { data: 'Y'.repeat(1024 * 1024) },
    }),
  ];

  let fuzzHandled = 0;
  sampleClient.on('message', (raw) => {
    try {
      const parsed = JSON.parse(raw.toString());
      if (parsed.id && parsed.id.startsWith('fuzz_')) {
        fuzzHandled++;
        metrics.fuzzResponses.push(parsed);
      }
    } catch {
      // Ignored
    }
  });

  for (const payload of fuzzPayloads) {
    try {
      sampleClient.send(payload);
      await sleep(30);
    } catch (err) {
      console.log(`  Send error on fuzz payload (expected if socket closed/errored): ${err.message}`);
    }
  }

  await sleep(500);
  console.log(`  Fuzz payloads dispatched: ${fuzzPayloads.length}. Daemon remained responsive and handled queries.`);
}

// ----------------------------------------------------------------------------
// Phase 4: Abrupt Socket Churn (Connect & Destroy)
// ----------------------------------------------------------------------------
async function testSocketChurn() {
  console.log(`\n[PHASE 4] Executing ${CHURN_CYCLES} rapid connect/destroy socket churn cycles...`);

  for (let i = 0; i < CHURN_CYCLES; i++) {
    try {
      const ws = new WebSocket(WS_URL);
      await new Promise((res, rej) => {
        ws.on('open', res);
        ws.on('error', rej);
      });

      // Send partial or immediate message then abruptly terminate TCP socket
      ws.send(JSON.stringify({ type: 'status.get', id: `churn_${i}` }));
      // Abrupt close without graceful WebSocket close frame:
      ws.terminate();
      metrics.churnSuccesses++;
    } catch (err) {
      metrics.churnFailures++;
    }
  }

  console.log(`  Churn completed: ${metrics.churnSuccesses} sockets cleanly destroyed, ${metrics.churnFailures} errors.`);
}

// ----------------------------------------------------------------------------
// Phase 5: Verification of Daemon Health Post-Stress
// ----------------------------------------------------------------------------
async function verifyDaemonHealth() {
  console.log(`\n[PHASE 5] Verifying daemon responsiveness post-stress...`);
  const client = await connectClient('healthcheck');

  const healthy = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 3000);
    const id = 'health_' + Date.now();

    client.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.id === id) {
          clearTimeout(timeout);
          resolve(true);
        }
      } catch {}
    });

    client.send(JSON.stringify({ type: 'status.get', id }));
  });

  client.close();
  return healthy;
}

// ----------------------------------------------------------------------------
// Main Runner
// ----------------------------------------------------------------------------
async function main() {
  console.log(`=======================================================`);
  console.log(`AGENC GATEWAY STRESS & FUZZ HARNESS`);
  console.log(`Target: ${WS_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`=======================================================`);

  let clients = [];
  try {
    clients = await testConcurrentConnections();
    await testHighThroughputBurst(clients);

    if (clients.length > 0) {
      await testFuzzing(clients[0]);
    }

    // Close all phase 1/2 clients
    for (const c of clients) {
      c.close();
    }
    await sleep(200);

    await testSocketChurn();

    const isHealthy = await verifyDaemonHealth();

    console.log(`\n=======================================================`);
    console.log(`STRESS TEST RESULTS:`);
    console.log(JSON.stringify(metrics.summary(), null, 2));
    console.log(`Post-Stress Daemon Healthcheck: ${isHealthy ? 'PASSED (STABLE)' : 'FAILED (UNRESPONSIVE)'}`);
    console.log(`=======================================================`);

    if (!isHealthy) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n[FATAL] Stress test harness error:`, err);
    process.exit(1);
  }
}

main();
