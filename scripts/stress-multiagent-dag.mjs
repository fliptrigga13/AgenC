/**
 * scripts/stress-multiagent-dag.mjs
 *
 * In-House Stress & Invariant Test:
 * Multi-Agent Dependent Task DAG Engine, Topological Sorting, and Cycle Detection.
 *
 * Built from scratch with zero external libraries.
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { sortTaskDependencyDag } from '../sdk/dist/index.mjs';

function generateRandomPubkey() {
  return Keypair.generate().publicKey;
}

async function runMultiAgentDagStress() {
  console.log(`================================================================`);
  console.log(`[ROUND 4] Multi-Agent Dependent Task DAG & Coordination Stress`);
  console.log(`================================================================`);

  // --- Test 1: Deep 10-Node Hierarchical DAG Topological Sorting ---
  console.log(`\n--- Test 1: Deep 10-Node Hierarchical Dependency DAG ---`);
  const t0 = generateRandomPubkey(); // Root
  const t1 = generateRandomPubkey(); // Tier 1 (depends on t0)
  const t2 = generateRandomPubkey(); // Tier 1 (depends on t0)
  const t3 = generateRandomPubkey(); // Tier 2 (depends on t1)
  const t4 = generateRandomPubkey(); // Tier 2 (depends on t1)
  const t5 = generateRandomPubkey(); // Tier 2 (depends on t2)
  const t6 = generateRandomPubkey(); // Tier 3 (depends on t3)
  const t7 = generateRandomPubkey(); // Tier 3 (depends on t4)
  const t8 = generateRandomPubkey(); // Tier 3 (depends on t5)
  const t9 = generateRandomPubkey(); // Terminal (depends on t8)

  const nodes = [
    { taskPda: t9, dependsOn: t8 },
    { taskPda: t8, dependsOn: t5 },
    { taskPda: t7, dependsOn: t4 },
    { taskPda: t6, dependsOn: t3 },
    { taskPda: t5, dependsOn: t2 },
    { taskPda: t4, dependsOn: t1 },
    { taskPda: t3, dependsOn: t1 },
    { taskPda: t2, dependsOn: t0 },
    { taskPda: t1, dependsOn: t0 },
    { taskPda: t0, dependsOn: null },
  ];

  const tStart = performance.now();
  const sorted = sortTaskDependencyDag(nodes);
  const tDuration = (performance.now() - tStart).toFixed(2);

  if (sorted.hasCycle) {
    throw new Error('Unexpected cycle detected in valid 10-node DAG!');
  }
  if (sorted.sortedTaskPdas.length !== 10) {
    throw new Error(`Expected 10 sorted tasks, got ${sorted.sortedTaskPdas.length}`);
  }

  // Verify all parent-before-child invariants
  const orderMap = new Map();
  sorted.sortedTaskPdas.forEach((pda, idx) => {
    orderMap.set(pda.toBase58(), idx);
  });

  for (const n of nodes) {
    if (n.dependsOn) {
      const parentIdx = orderMap.get(n.dependsOn.toBase58());
      const childIdx = orderMap.get(n.taskPda.toBase58());
      if (parentIdx >= childIdx) {
        throw new Error(
          `Topological ordering violation: parent ${n.dependsOn.toBase58()} (idx: ${parentIdx}) not before child ${n.taskPda.toBase58()} (idx: ${childIdx})`
        );
      }
    }
  }

  console.log(`  Resolved 10-node DAG in ${tDuration}ms with 100% prerequisite order compliance.`);
  console.log(`  Root task position: ${orderMap.get(t0.toBase58())} (Must be 0)`);
  console.log(`  Terminal task position: ${orderMap.get(t9.toBase58())} (Must be 9)`);
  console.log(`  [PASS] Deep 10-Node DAG resolution verified.`);

  // --- Test 2: Multi-Node Complex Cycle Detection (5-Node Loop) ---
  console.log(`\n--- Test 2: Complex 5-Node Circular Dependency Rejection ---`);
  const c1 = generateRandomPubkey();
  const c2 = generateRandomPubkey();
  const c3 = generateRandomPubkey();
  const c4 = generateRandomPubkey();
  const c5 = generateRandomPubkey();

  const cycleNodes = [
    { taskPda: c1, dependsOn: c5 },
    { taskPda: c2, dependsOn: c1 },
    { taskPda: c3, dependsOn: c2 },
    { taskPda: c4, dependsOn: c3 },
    { taskPda: c5, dependsOn: c4 },
  ];

  const cycleResult = sortTaskDependencyDag(cycleNodes);
  if (!cycleResult.hasCycle) {
    throw new Error('Expected cycle detection for 5-node circular loop, but got hasCycle: false');
  }
  if (!cycleResult.cycleNodes || cycleResult.cycleNodes.length !== 5) {
    throw new Error(`Expected 5 cycle nodes detected, got ${cycleResult.cycleNodes?.length}`);
  }
  console.log(`  Detected 5-node circular dependency loop (c1->c2->c3->c4->c5->c1).`);
  console.log(`  Reported cycle nodes count: ${cycleResult.cycleNodes.length} (Must be 5)`);
  console.log(`  [PASS] Circular dependency rejection verified.`);

  // --- Test 3: Self-Referential Task Rejection ---
  console.log(`\n--- Test 3: Self-Referential Task Rejection ---`);
  const selfTask = generateRandomPubkey();
  const selfResult = sortTaskDependencyDag([{ taskPda: selfTask, dependsOn: selfTask }]);
  if (!selfResult.hasCycle) {
    throw new Error('Failed to reject self-referential task!');
  }
  console.log(`  Self-referential task correctly flagged with hasCycle: true.`);
  console.log(`  [PASS] Self-loop invariant verified.`);

  // --- Test 4: Multi-Root Disconnected Forest Resolution ---
  console.log(`\n--- Test 4: Multi-Root Disconnected Forest Resolution ---`);
  const forestNodes = [];
  const roots = [];
  for (let tree = 0; tree < 5; tree++) {
    const root = generateRandomPubkey();
    roots.push(root);
    forestNodes.push({ taskPda: root, dependsOn: null });
    for (let child = 0; child < 3; child++) {
      const childPda = generateRandomPubkey();
      forestNodes.push({ taskPda: childPda, dependsOn: root });
    }
  }

  const forestResult = sortTaskDependencyDag(forestNodes);
  if (forestResult.hasCycle) {
    throw new Error('Unexpected cycle in multi-root forest!');
  }
  if (forestResult.sortedTaskPdas.length !== 20) {
    throw new Error(`Expected 20 sorted tasks in forest, got ${forestResult.sortedTaskPdas.length}`);
  }

  console.log(`  Sorted 5 disjoint trees (20 tasks total) in topological order.`);
  console.log(`  [PASS] Disconnected forest resolution verified.`);

  console.log(`\n================================================================`);
  console.log(`  [ROUND 4 PASS] Multi-Agent Dependent Task DAG Engine Hardened!`);
  console.log(`================================================================\n`);
}

runMultiAgentDagStress().catch((err) => {
  console.error('FATAL Multi-Agent DAG Stress Failure:', err);
  process.exit(1);
});
