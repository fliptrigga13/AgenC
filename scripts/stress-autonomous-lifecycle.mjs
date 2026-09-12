/**
 * scripts/stress-autonomous-lifecycle.mjs
 *
 * In-House Stress & Fault Injection Test:
 * Autonomous Heartbeat Scheduler & Long-Running Agent Lifecycle.
 *
 * Built from scratch without external libraries.
 */

import { HeartbeatScheduler, HeartbeatTimeoutError } from '../runtime/dist/index.mjs';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runAutonomousLifecycleStress() {
  console.log(`==============================================================`);
  console.log(`[ROUND 1] Autonomous Agent Lifecycle & Scheduler Stress Harness`);
  console.log(`==============================================================`);

  let messagesSent = 0;
  const mockSendToChannels = async (msg) => {
    messagesSent++;
  };

  const scheduler = new HeartbeatScheduler(
    {
      enabled: true,
      intervalMs: 100,
      timeoutMs: 50, // fast timeout for stress testing
    },
    {
      sendToChannels: mockSendToChannels,
    }
  );

  let normalRuns = 0;
  let errorRuns = 0;
  let hangingRuns = 0;

  // 1. Normal fast action
  scheduler.registerAction({
    name: 'fast-action',
    enabled: true,
    execute: async () => {
      normalRuns++;
      return { hasOutput: true, output: `fast output ${normalRuns}`, quiet: false };
    },
  });

  // 2. Action that throws error
  scheduler.registerAction({
    name: 'failing-action',
    enabled: true,
    execute: async () => {
      errorRuns++;
      throw new Error(`Simulated catastrophic failure in action ${errorRuns}`);
    },
  });

  // 3. Action that hangs (exceeds timeoutMs)
  scheduler.registerAction({
    name: 'hanging-action',
    enabled: true,
    execute: async () => {
      hangingRuns++;
      await sleep(200); // 200ms > 50ms timeout
      return { hasOutput: true, output: 'late output', quiet: false };
    },
  });

  console.log(`\n--- Test 1: Rapid 50-Cycle Execution with Fault Injection ---`);
  const start = performance.now();

  for (let i = 1; i <= 50; i++) {
    const summary = await scheduler.runOnce();
    if (summary.actionsRun !== 3) {
      throw new Error(`Expected 3 actions run, got ${summary.actionsRun}`);
    }
    if (summary.actionsFailed !== 2) {
      throw new Error(`Expected 2 actions failed (1 throw + 1 timeout), got ${summary.actionsFailed}`);
    }
    if (summary.messagesPosted !== 1) {
      throw new Error(`Expected 1 message posted from fast-action, got ${summary.messagesPosted}`);
    }
  }

  const elapsed = performance.now() - start;
  console.log(`  Completed 50 cycles (150 action executions) in ${elapsed.toFixed(1)}ms`);
  console.log(`  Normal runs   : ${normalRuns}`);
  console.log(`  Handled throws: ${errorRuns} (100% isolated)`);
  console.log(`  Handled hangs : ${hangingRuns} (100% timed out cleanly)`);
  console.log(`  Messages piped: ${messagesSent}`);

  console.log(`\n--- Test 2: Active Hours Window Boundary Verification ---`);
  // Test normal range (09:00 - 17:00)
  const dayScheduler = new HeartbeatScheduler({
    enabled: true,
    intervalMs: 1000,
    timeoutMs: 1000,
    activeHours: { start: 9, end: 17 },
  });

  const morning = new Date(); morning.setHours(10, 0, 0, 0);
  const evening = new Date(); evening.setHours(20, 0, 0, 0);
  if (!dayScheduler.isWithinActiveHours(morning)) throw new Error('10:00 should be active in 9-17');
  if (dayScheduler.isWithinActiveHours(evening)) throw new Error('20:00 should be inactive in 9-17');

  // Test midnight wrap-around range (22:00 - 06:00)
  const nightScheduler = new HeartbeatScheduler({
    enabled: true,
    intervalMs: 1000,
    timeoutMs: 1000,
    activeHours: { start: 22, end: 6 },
  });

  const midnight = new Date(); midnight.setHours(23, 30, 0, 0);
  const noon = new Date(); noon.setHours(12, 0, 0, 0);
  const earlyMorning = new Date(); earlyMorning.setHours(4, 0, 0, 0);
  if (!nightScheduler.isWithinActiveHours(midnight)) throw new Error('23:30 should be active in 22-6');
  if (!nightScheduler.isWithinActiveHours(earlyMorning)) throw new Error('04:00 should be active in 22-6');
  if (nightScheduler.isWithinActiveHours(noon)) throw new Error('12:00 should be inactive in 22-6');
  console.log(`  Active hours midnight-crossing logic: 100% verified.`);

  console.log(`\n--- Test 3: Lifecycle Start / Stop Idempotency ---`);
  scheduler.start();
  if (!scheduler.running) throw new Error('Scheduler should be running after start');
  scheduler.start(); // idempotent call
  if (!scheduler.running) throw new Error('Scheduler should remain running');
  scheduler.stop();
  if (scheduler.running) throw new Error('Scheduler should be stopped');
  scheduler.stop(); // idempotent call
  console.log(`  Lifecycle start/stop idempotency: PASSED.`);

  console.log(`\n--- Test 4: Execution Concurrency & Re-Entrancy Guard ---`);
  let slowActionRunCount = 0;
  const reentrancyScheduler = new HeartbeatScheduler({
    enabled: true,
    intervalMs: 50,
    timeoutMs: 1000,
  });
  reentrancyScheduler.registerAction({
    name: 'slow-action',
    enabled: true,
    execute: async () => {
      slowActionRunCount++;
      await new Promise((r) => setTimeout(r, 60));
      return { hasOutput: false, quiet: true };
    },
  });

  // Call runOnce multiple times concurrently
  const [res1, res2, res3] = await Promise.all([
    reentrancyScheduler.runOnce(),
    reentrancyScheduler.runOnce(),
    reentrancyScheduler.runOnce(),
  ]);

  // Only one should have executed actionsRun: 1, the other two should have skipped (actionsRun: 0)
  const totalActionsRun = res1.actionsRun + res2.actionsRun + res3.actionsRun;
  console.log(`  Concurrent triggers: 3, actual executions allowed: ${totalActionsRun} (Must be 1)`);
  if (totalActionsRun !== 1 || slowActionRunCount !== 1) {
    throw new Error(`Re-entrancy guard failed: totalActionsRun=${totalActionsRun}, slowActionRunCount=${slowActionRunCount}`);
  }
  console.log(`  [PASS] Re-entrancy concurrency protection verified.`);

  console.log(`\n--- Test 5: Mid-Cycle Stop Abort Invariant ---`);
  const executedActionsInAbortTest = [];
  const abortScheduler = new HeartbeatScheduler({
    enabled: true,
    intervalMs: 1000,
    timeoutMs: 1000,
  });

  abortScheduler.registerAction({
    name: 'action-1',
    enabled: true,
    execute: async () => {
      executedActionsInAbortTest.push('action-1');
      // While running action-1, trigger stop on the scheduler
      abortScheduler.stop();
      return { hasOutput: false, quiet: true };
    },
  });
  abortScheduler.registerAction({
    name: 'action-2',
    enabled: true,
    execute: async () => {
      executedActionsInAbortTest.push('action-2');
      return { hasOutput: false, quiet: true };
    },
  });

  abortScheduler.start();
  await abortScheduler.runOnce();
  console.log(`  Actions executed before abort: [${executedActionsInAbortTest.join(', ')}] (Must be ['action-1'])`);
  if (executedActionsInAbortTest.length !== 1 || executedActionsInAbortTest[0] !== 'action-1') {
    throw new Error(`Mid-cycle stop abort failed! Action 2 ran after scheduler stopped: ${executedActionsInAbortTest}`);
  }
  console.log(`  [PASS] Mid-cycle stop immediately halts subsequent action execution.`);

  console.log(`\n==============================================================`);
  console.log(`  [ROUND 1 PASS] Autonomous Lifecycle & Scheduler Hardened!`);
  console.log(`==============================================================\n`);
}

runAutonomousLifecycleStress().catch((err) => {
  console.error(`FATAL ROUND 1 FAILURE:`, err);
  process.exit(1);
});
