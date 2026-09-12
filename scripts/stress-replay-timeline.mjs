/**
 * scripts/stress-replay-timeline.mjs
 *
 * In-House Stress & Boundary Test:
 * Replay Timeline Event Ingestion, Deduplication, Pagination & Pruning.
 *
 * Built from scratch without external libraries.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync, existsSync } from 'node:fs';

const betterSqlitePath = require.resolve('better-sqlite3', {
  paths: [process.cwd(), join(process.cwd(), 'runtime')],
});
const { default: Database } = await import(`file://${betterSqlitePath.replace(/\\/g, '/')}`);

import { SqliteReplayTimelineStore } from '../runtime/dist/index.mjs';

function computePercentile(numbers, p) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runReplayTimelineStress() {
  console.log(`==============================================================`);
  console.log(`[ROUND 2] Replay Timeline Event Streaming & Pagination Stress`);
  console.log(`==============================================================`);

  const testDbPath = join(tmpdir(), `replay_stress_${Date.now()}.db`);
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  const store = new SqliteReplayTimelineStore(testDbPath, {
    retention: {
      maxEventsPerTask: 25,
      maxEventsTotal: 3000,
    },
    compaction: {
      enabled: true,
      compactAfterWrites: 50,
    },
  });

  const EVENT_TYPES = ['taskCreated', 'taskClaimed', 'taskCompleted', 'disputeRaised', 'disputeResolved'];
  const NUM_TASKS = 200;
  const TOTAL_RECORDS = 5000;

  console.log(`\n--- Test 1: Ingesting 5,000 Projected Events Across ${NUM_TASKS} Tasks ---`);
  const records = [];
  for (let i = 0; i < TOTAL_RECORDS; i++) {
    const slot = 1000 + Math.floor(i / 10);
    const taskIdx = i % NUM_TASKS;
    const taskPda = `TaskPda_${taskIdx}`;
    const disputePda = i % 50 === 0 ? `DisputePda_${taskIdx}` : undefined;
    const type = EVENT_TYPES[i % EVENT_TYPES.length];

    records.push({
      seq: i + 1,
      type,
      taskPda,
      disputePda,
      timestampMs: 1700000000000 + i * 1000,
      payload: { index: i, note: `payload for record ${i}`, data: 'X'.repeat(64) },
      slot,
      signature: `SIG_${slot}_${i}`,
      sourceEventName: type,
      sourceEventSequence: i,
      sourceEventType: type,
      projectionHash: `hash_${i}_${Date.now()}`,
    });
  }

  const writeStart = performance.now();
  // Batch write in chunks of 500
  let totalInserted = 0;
  for (let chunkStart = 0; chunkStart < TOTAL_RECORDS; chunkStart += 500) {
    const chunk = records.slice(chunkStart, chunkStart + 500);
    const res = await store.save(chunk);
    totalInserted += res.inserted;
  }
  const writeDuration = performance.now() - writeStart;
  console.log(`  Inserted ${totalInserted}/${TOTAL_RECORDS} records in ${writeDuration.toFixed(1)}ms (${(totalInserted / (writeDuration / 1000)).toFixed(0)} events/sec)`);

  // Verify retention invariant: maxEventsTotal is 3000, so DB should have exactly 3000 records
  const allRows = await store.query({ limit: 10000 });
  console.log(`  Records in store after retention: ${allRows.length} (Expected <= 3000)`);
  if (allRows.length > 3000) {
    throw new Error(`Retention invariant failed: expected <= 3000, found ${allRows.length}`);
  }

  console.log(`\n--- Test 2: Ingesting 1,000 Duplicate Records from Active Set (Dedup Invariants) ---`);
  // Re-submit the latest 1,000 records (which are retained in the DB)
  const duplicateBatch = records.slice(4000, 5000);
  const dupRes = await store.save(duplicateBatch);
  console.log(`  Duplicates inserted: ${dupRes.inserted} (Must be 0)`);
  console.log(`  Duplicates ignored : ${dupRes.duplicates} (Must be 1000)`);

  if (dupRes.inserted !== 0 || dupRes.duplicates !== 1000) {
    throw new Error(`Dedup invariant failed: inserted=${dupRes.inserted}, duplicates=${dupRes.duplicates}`);
  }
  console.log(`  [PASS] Replay Event Deduplication 100% verified.`);

  console.log(`\n--- Test 3: Pagination, Boundary Slicing & limit: 0 Check ---`);
  // 1. limit: 0 check
  const zeroQuery = await store.query({ limit: 0 });
  if (zeroQuery.length !== 0) {
    throw new Error(`limit: 0 failed: expected 0 rows, got ${zeroQuery.length}`);
  }
  console.log(`  Query with limit: 0 returned 0 rows as expected.`);

  // 2. High-speed paginated scanning (pages of 100)
  let scanOffset = 0;
  let totalScanned = 0;
  const pageLatencies = [];

  while (true) {
    const pageStart = performance.now();
    const rows = await store.query({ limit: 100, offset: scanOffset });
    pageLatencies.push(performance.now() - pageStart);
    if (rows.length === 0) break;
    totalScanned += rows.length;
    scanOffset += rows.length;
  }

  const avgPageTime = pageLatencies.reduce((a, b) => a + b, 0) / pageLatencies.length;
  const p95PageTime = computePercentile(pageLatencies, 95);
  console.log(`  Scanned ${totalScanned} records across ${pageLatencies.length} pages.`);
  console.log(`  Avg page query latency: ${avgPageTime.toFixed(3)} ms`);
  console.log(`  p95 page query latency: ${p95PageTime.toFixed(3)} ms`);

  console.log(`\n--- Test 4: Cursor State Persistence & Verification ---`);
  await store.saveCursor({
    slot: 1250,
    signature: 'SIG_1250_2500',
    eventName: 'taskCompleted',
    traceId: 'trace_stress_1',
    traceSpanId: 'span_stress_1',
  });

  const cursor = await store.getCursor();
  if (!cursor || cursor.slot !== 1250 || cursor.signature !== 'SIG_1250_2500') {
    throw new Error(`Cursor mismatch: ${JSON.stringify(cursor)}`);
  }
  console.log(`  Cursor saved and restored accurately: slot=${cursor.slot}, sig=${cursor.signature}`);

  console.log(`\n--- Test 5: Offset without Limit Query Invariant ---`);
  // All active rows in DB = 3000
  // Query with offset: 500 should return exactly 2500 rows
  const offsetRows = await store.query({ offset: 500 });
  console.log(`  Query with offset: 500 returned: ${offsetRows.length} rows (Expected 2500)`);
  if (offsetRows.length !== 2500) {
    throw new Error(`Offset without limit failed! Expected 2500, got ${offsetRows.length}`);
  }
  console.log(`  [PASS] Offset without limit pagination works seamlessly.`);

  console.log(`\n--- Test 6: Non-Positive Limit Query Boundary Guard ---`);
  const negLimitRows = await store.query({ limit: -5 });
  console.log(`  Query with limit: -5 returned: ${negLimitRows.length} rows (Expected 0)`);
  if (negLimitRows.length !== 0) {
    throw new Error(`Negative limit guard failed! Expected 0, got ${negLimitRows.length}`);
  }
  console.log(`  [PASS] Non-positive limit guard verified.`);

  console.log(`\n--- Test 7: Empty Batch Early-Exit Invariant ---`);
  const emptyRes = await store.save([]);
  console.log(`  Empty batch save result: inserted=${emptyRes.inserted}, duplicates=${emptyRes.duplicates}`);
  if (emptyRes.inserted !== 0 || emptyRes.duplicates !== 0) {
    throw new Error(`Empty batch save failed: expected {inserted: 0, duplicates: 0}`);
  }
  console.log(`  [PASS] Empty batch early exit verified.`);

  console.log(`\n--- Test 8: High-Concurrency Multi-Batch Write Stress (db.transaction) ---`);
  // Generate 10 concurrent batches of 100 distinct records each (1000 records total)
  const concurrentBatches = [];
  for (let b = 0; b < 10; b++) {
    const batchRecords = [];
    for (let i = 0; i < 100; i++) {
      const idx = 10000 + b * 100 + i;
      batchRecords.push({
        seq: idx,
        type: 'taskCompleted',
        taskPda: `ConcurrentTask_${idx}`,
        timestampMs: 1700000000000 + idx,
        payload: { batch: b, item: i },
        slot: 5000 + b,
        signature: `SIG_CONCURRENT_${b}_${i}`,
        sourceEventName: 'taskCompleted',
        sourceEventSequence: idx,
        sourceEventType: 'taskCompleted',
        projectionHash: `hash_concurrent_${b}_${i}`,
      });
    }
    concurrentBatches.push(batchRecords);
  }

  const concurrentStart = performance.now();
  const batchResults = await Promise.all(
    concurrentBatches.map((batch) => store.save(batch))
  );
  const concurrentElapsed = performance.now() - concurrentStart;

  const concurrentInserted = batchResults.reduce((sum, r) => sum + r.inserted, 0);
  console.log(`  Saved 10 concurrent batches (1,000 records total) in ${concurrentElapsed.toFixed(1)}ms`);
  console.log(`  Total inserted across all concurrent transactions: ${concurrentInserted}`);
  if (concurrentInserted !== 1000) {
    throw new Error(`Concurrent transactions write mismatch: expected 1000, got ${concurrentInserted}`);
  }
  console.log(`  [PASS] High-concurrency transactional batch ingestion verified.`);

  // Clean up
  try {
    unlinkSync(testDbPath);
    if (existsSync(`${testDbPath}-wal`)) unlinkSync(`${testDbPath}-wal`);
    if (existsSync(`${testDbPath}-shm`)) unlinkSync(`${testDbPath}-shm`);
  } catch {}

  console.log(`\n==============================================================`);
  console.log(`  [ROUND 2 PASS] Replay Timeline Event Ingestion Hardened!`);
  console.log(`==============================================================\n`);
}

runReplayTimelineStress().catch((err) => {
  console.error(`FATAL ROUND 2 FAILURE:`, err);
  process.exit(1);
});
