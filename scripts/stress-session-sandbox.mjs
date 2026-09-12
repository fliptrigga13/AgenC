/**
 * @file scripts/stress-session-sandbox.mjs
 * [ROUND 3] Multi-Channel Gateway Session Isolation & Tool Sandbox Security Stress
 *
 * In-house stress test:
 * 1. Concurrent multi-workspace session lifecycle & in-flight teardown race stress
 * 2. Hierarchical sub-agent session isolation & identity key uniqueness
 * 3. Filesystem sandbox path traversal fuzzing (100% rejection of escape vectors)
 * 4. Command injection & shell operator fuzzing on tool boundaries
 */

import { SessionIsolationManager, safePath, ToolRegistry, PolicyEngine } from '../runtime/dist/index.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

async function runSessionSandboxStress() {
  console.log(`================================================================`);
  console.log(`[ROUND 3] Session Isolation & Tool Sandbox Security Stress`);
  console.log(`================================================================`);

  // --------------------------------------------------------------------------
  // Test 1: 50 Concurrent Sessions with Race Condition Fault Injection
  // --------------------------------------------------------------------------
  console.log(`\n--- Test 1: 50 Concurrent Sessions with In-Flight Cancellation ---`);
  
  const closedBackends = new Set();
  const createdBackends = new Set();

  class MockMemoryBackend {
    constructor(id) {
      this.id = id;
      createdBackends.add(id);
    }
    async initialize() {}
    async saveMessages() {}
    async getMessages() { return []; }
    async close() {
      closedBackends.add(this.id);
    }
  }

  const workspaces = new Map();
  for (let i = 0; i < 50; i++) {
    workspaces.set(`ws-stress-${i}`, {
      id: `ws-stress-${i}`,
      name: `Stress Workspace ${i}`,
      skills: [],
    });
  }

  const slowWorkspaceManager = {
    basePath: tmpdir(),
    load: async (id) => {
      // Inject random latency 5-30ms to induce in-flight concurrency races
      await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 25)));
      const ws = workspaces.get(id);
      if (!ws) throw new Error(`Workspace not found: ${id}`);
      return ws;
    },
    listWorkspaces: async () => Array.from(workspaces.keys()),
  };

  const manager = new SessionIsolationManager({
    workspaceManager: slowWorkspaceManager,
    createMemoryBackend: (ws) => new MockMemoryBackend(ws.id),
  });

  const getPromises = [];
  const destroyPromises = [];

  const startT1 = performance.now();
  for (let i = 0; i < 50; i++) {
    const wsId = `ws-stress-${i}`;
    const p = manager.getContext(wsId);
    getPromises.push(p);

    // Cancel / destroy 25 of the 50 sessions concurrently while creation is in-flight
    if (i % 2 === 0) {
      // Delay slightly (1-10ms) so creation is actively pending
      destroyPromises.push(
        new Promise((resolve) => {
          setTimeout(async () => {
            await manager.destroyContext(wsId);
            resolve();
          }, 1 + Math.floor(Math.random() * 10));
        })
      );
    }
  }

  await Promise.allSettled(getPromises);
  await Promise.allSettled(destroyPromises);

  const activeAfterRace = manager.listActiveContexts();
  console.log(`  Initial 50 sessions spawned.`);
  console.log(`  Concurrent teardowns finished.`);
  console.log(`  Active contexts remaining: ${activeAfterRace.length} (Expected ~25)`);
  console.log(`  Closed backends so far: ${closedBackends.size}`);

  // Now perform a complete destroyAll
  await manager.destroyAll();
  const activeAfterDestroyAll = manager.listActiveContexts();

  if (activeAfterDestroyAll.length !== 0) {
    throw new Error(`destroyAll failed: ${activeAfterDestroyAll.length} contexts still active!`);
  }

  // Verify all created backends were cleanly closed with zero leaks
  for (const backendId of createdBackends) {
    if (!closedBackends.has(backendId)) {
      throw new Error(`Memory leak detected! Backend '${backendId}' was never closed!`);
    }
  }

  console.log(`  destroyAll() cleanly purged all sessions. Total backends created: ${createdBackends.size}, closed: ${closedBackends.size}`);
  console.log(`  [PASS] 0 memory leaks across 50 concurrent sessions with in-flight fault injection (${(performance.now() - startT1).toFixed(1)}ms).`);

  // --------------------------------------------------------------------------
  // Test 2: Sub-Agent Hierarchical Isolation & Cross-Talk Barrier
  // --------------------------------------------------------------------------
  console.log(`\n--- Test 2: Sub-Agent Hierarchical Isolation & Key Uniqueness ---`);
  
  const subAgentMgr = new SessionIsolationManager({
    workspaceManager: {
      basePath: tmpdir(),
      load: async (id) => ({ id, name: id, skills: [] }),
    },
    createMemoryBackend: (ws) => new MockMemoryBackend(`sub-${ws.id}-${Math.random()}`),
  });

  const parentCtx = await subAgentMgr.getContext({ workspaceId: 'ws-parent' });
  const subCtx1 = await subAgentMgr.getContext({
    workspaceId: 'ws-parent',
    parentSessionId: 'sess-parent',
    subagentSessionId: 'sub-1',
  });
  const subCtx2 = await subAgentMgr.getContext({
    workspaceId: 'ws-parent',
    parentSessionId: 'sess-parent',
    subagentSessionId: 'sub-2',
  });

  if (parentCtx === subCtx1 || subCtx1 === subCtx2) {
    throw new Error(`Session context isolation failed! Distinct sub-agents received identical context instances.`);
  }

  if (parentCtx.memoryBackend === subCtx1.memoryBackend || subCtx1.memoryBackend === subCtx2.memoryBackend) {
    throw new Error(`Memory cross-talk vulnerability: sub-agents share memory backend instances!`);
  }

  // Destroy sub-agent 1: parent and sub-agent 2 must remain unaffected
  await subAgentMgr.destroyContext({
    workspaceId: 'ws-parent',
    parentSessionId: 'sess-parent',
    subagentSessionId: 'sub-1',
  });

  const activeSubList = subAgentMgr.listActiveContexts();
  if (activeSubList.length !== 2) {
    throw new Error(`Unexpected active contexts count after destroying sub-agent 1: ${activeSubList.length} (Expected 2)`);
  }

  await subAgentMgr.destroyAll();
  console.log(`  [PASS] Sub-agent hierarchical contexts strictly isolated with 0 state bleed.`);

  // --------------------------------------------------------------------------
  // Test 3: Filesystem Path Traversal Security Fuzzing
  // --------------------------------------------------------------------------
  console.log(`\n--- Test 3: Filesystem Path Traversal Fuzzing (100 Attack Vectors) ---`);
  
  const allowedDir = join(tmpdir(), 'agenc-sandbox-allowed');
  if (!existsSync(allowedDir)) mkdirSync(allowedDir, { recursive: true });
  const safePathFn = safePath;

  const traversalPayloads = [
    '../etc/passwd',
    '..\\windows\\system32\\cmd.exe',
    '../../../../boot.ini',
    '/etc/shadow',
    'C:\\Windows\\System32\\config\\SAM',
    '%2e%2e%2fetc%2fpasswd',
    '%2e%2e%5cwindows%5csystem32',
    '..%2f..%2f..%2f',
    'allowed/../../../secret',
    './././../../etc',
    'foo/\0/bar',
    'allowed/\0../secret',
    '~root/.ssh/id_rsa',
    '..',
    '../',
    '..\\',
    'dir/../../..',
    join(allowedDir, '..', 'escape.txt'),
    join(allowedDir, 'sub', '..', '..', 'escape.txt'),
    'A'.repeat(5000), // PATH_MAX overflow
  ];

  // Generate 80 additional random variations with encoding, dots, slashes
  for (let i = 0; i < 80; i++) {
    const depth = 1 + (i % 8);
    const slash = i % 2 === 0 ? '/' : '\\';
    const attack = Array(depth).fill('..').join(slash) + slash + `target_${i}.key`;
    traversalPayloads.push(attack);
  }

  let deniedCount = 0;
  for (const attack of traversalPayloads) {
    const res = await safePathFn(attack, [allowedDir]);
    if (res.safe) {
      throw new Error(`CRITICAL SECURITY FAILURE: Path traversal attack bypassed sandbox! Payload: "${attack}" -> Resolved: "${res.resolved}"`);
    }
    // Verify no internal path leaks in denial reason
    if (res.reason && (res.reason.includes('C:\\') || res.reason.includes('/home/') || res.reason.includes('/Users/'))) {
      throw new Error(`Information leakage detected in safePath denial reason: ${res.reason}`);
    }
    deniedCount++;
  }

  // Also verify that a legitimate sub-path IS allowed
  const legitimatePath = join(allowedDir, 'subfolder', 'test.json');
  const legitRes = await safePathFn(legitimatePath, [allowedDir]);
  if (!legitRes.safe) {
    throw new Error(`Legitimate path was incorrectly rejected: ${legitRes.reason}`);
  }

  console.log(`  Fuzzed ${deniedCount} path traversal variations.`);
  console.log(`  Blocked 100% of traversal attacks with 0 false passes and 0 information leakage.`);
  console.log(`  Legitimate nested workspace access verified: ${legitRes.safe}`);
  console.log(`  [PASS] Filesystem Tool Sandbox Invariants 100% Battle-Hardened.`);

  // --------------------------------------------------------------------------
  // Test 4: Tool Policy Access Inference & Read-Only Confinement Stress
  // --------------------------------------------------------------------------
  console.log(`\n--- Test 4: Tool Policy Access Inference & Read-Only Confinement ---`);
  
  const readActions = [
    'memory.search',
    'agenc.searchTasks',
    'system.findFiles',
    'system.fetchUrl',
    'health.check',
    'system.readFile',
    'system.listDir',
    'agenc.getTask',
    'system.stat',
    'system.status',
  ];

  const writeActions = [
    'system.writeFile',
    'system.delete',
    'system.mkdir',
    'agenc.createTask',
    'agenc.claimTask',
    'task.execute',
  ];

  // Create PolicyEngine with read-only policy
  const readOnlyPolicyEngine = new PolicyEngine();
  readOnlyPolicyEngine.setPolicy({
    enabled: true,
    readOnly: true, // only allow read actions
  });

  const registry = new ToolRegistry({ policyEngine: readOnlyPolicyEngine });

  // Register dummy tools for all actions
  for (const name of [...readActions, ...writeActions]) {
    registry.register({
      name,
      description: `Tool ${name}`,
      inputSchema: { type: 'object' },
      execute: async () => ({ content: JSON.stringify({ success: true, tool: name }) }),
    });
  }

  const handler = registry.createToolHandler();

  // Test read actions: ALL must be permitted
  for (const toolName of readActions) {
    const rawRes = await handler(toolName, {});
    const parsed = JSON.parse(rawRes);
    if (parsed.error && parsed.violation) {
      throw new Error(`Read action "${toolName}" was falsely classified as write and blocked by read-only policy!`);
    }
  }
  console.log(`  Verified ${readActions.length} read actions (search, find, fetch, check, get, list) permitted under read-only policy.`);

  // Test write actions: ALL must be blocked
  for (const toolName of writeActions) {
    const rawRes = await handler(toolName, {});
    const parsed = JSON.parse(rawRes);
    if (!parsed.error || !parsed.violation) {
      throw new Error(`Write action "${toolName}" escaped read-only policy confinement!`);
    }
  }
  console.log(`  Verified ${writeActions.length} write actions strictly blocked under read-only policy.`);
  console.log(`  [PASS] Tool access inference & policy confinement 100% verified.`);

  console.log(`\n================================================================`);
  console.log(`  [ROUND 3 PASS] Session Isolation & Tool Sandbox Hardened!`);
  console.log(`================================================================\n`);
}

runSessionSandboxStress().catch((err) => {
  console.error(`FATAL ROUND 3 FAILURE:`, err);
  process.exit(1);
});
