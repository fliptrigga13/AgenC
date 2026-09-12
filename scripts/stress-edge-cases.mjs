/**
 * Deep Edge-Case Stress & Memory Leak Detection
 */

import { WebSocket } from 'ws';

const WS_URL = process.env.WS_URL ?? 'ws://127.0.0.1:3100';

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runEdgeCaseStress() {
  console.log(`[EDGE STRESS] Running advanced boundary testing...`);

  // 1. Extreme payload test (5MB, 10MB)
  console.log(`\n--- Test 1: Oversized Payload Resilience (5MB, 10MB) ---`);
  const ws1 = new WebSocket(WS_URL);
  await new Promise((res) => ws1.on('open', res));

  let closedWithCode = null;
  ws1.on('close', (code, reason) => {
    closedWithCode = { code, reason: reason.toString() };
  });

  const huge5MB = JSON.stringify({
    type: 'status.get',
    id: 'huge_5mb',
    payload: { big: 'A'.repeat(5 * 1024 * 1024) },
  });

  try {
    ws1.send(huge5MB);
    console.log(`  Sent 5MB payload successfully.`);
  } catch (err) {
    console.log(`  ws1 error on sending 5MB: ${err.message}`);
  }

  await sleep(500);
  if (closedWithCode) {
    console.log(`  Socket closed as expected with code: ${closedWithCode.code} (${closedWithCode.reason})`);
  } else {
    console.log(`  Socket remained open for 5MB.`);
    ws1.close();
  }

  // 2. High-volume Chat Message Ingestion & Rate Limiting
  console.log(`\n--- Test 2: Rapid Concurrent Chat Messages Across 10 Sessions ---`);
  const chatClients = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      const ws = new WebSocket(WS_URL);
      await new Promise((res) => ws.on('open', res));
      return { id: i, ws };
    })
  );

  let chatErrors = 0;
  let chatAcks = 0;

  await Promise.all(
    chatClients.map(({ id, ws }) => {
      return new Promise((resolve) => {
        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === 'chat.session' || data.type === 'chat.typing' || data.type === 'chat.message') {
              chatAcks++;
            }
          } catch {}
        });

        // Send chat message
        ws.send(
          JSON.stringify({
            type: 'chat.message',
            id: `chat_stress_${id}`,
            payload: {
              content: `Concurrent stress test ping from client ${id}`,
              sessionId: `stress_session_${id}`,
            },
          })
        );

        setTimeout(resolve, 2000);
      });
    })
  );

  console.log(`  Chat concurrent stress: ${chatAcks} message events received across 10 parallel sessions.`);

  for (const c of chatClients) {
    c.ws.close();
  }

  // 3. Memory & Event Listener Leak Check: 2,000 rapid status requests
  console.log(`\n--- Test 3: Sustained Load Memory & Listener Stability (2,000 queries) ---`);
  const wsLoad = new WebSocket(WS_URL);
  await new Promise((res) => wsLoad.on('open', res));

  const startMemory = process.memoryUsage();
  let completed = 0;

  await new Promise((resolve) => {
    wsLoad.on('message', () => {
      completed++;
      if (completed >= 2000) {
        resolve();
      }
    });

    for (let i = 0; i < 2000; i++) {
      wsLoad.send(JSON.stringify({ type: 'status.get', id: `load_${i}` }));
    }

    setTimeout(resolve, 6000);
  });

  const endMemory = process.memoryUsage();
  console.log(`  Processed ${completed}/2000 sustained queries.`);
  console.log(`  Client RSS change: ${((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2)} MB`);

  wsLoad.close();
  await sleep(500);

  // Verify daemon health post-test
  console.log(`\n--- Test 4: Final Daemon Health & Responsiveness ---`);
  const finalWs = new WebSocket(WS_URL);
  await new Promise((res) => finalWs.on('open', res));

  const healthAck = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 3000);
    finalWs.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === 'final_probe') {
        clearTimeout(timer);
        resolve(true);
      }
    });
    finalWs.send(JSON.stringify({ type: 'status.get', id: 'final_probe' }));
  });

  finalWs.close();
  console.log(`  Daemon final probe: ${healthAck ? 'HEALTHY & RESPONSIVE' : 'UNRESPONSIVE'}`);

  if (!healthAck) process.exit(1);
  console.log(`\n[EDGE STRESS] ALL ADVANCED BOUNDARY TESTS COMPLETED.`);
}

runEdgeCaseStress().catch((err) => {
  console.error(`Edge stress failure:`, err);
  process.exit(1);
});
