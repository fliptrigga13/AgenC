/**
 * AgenC Multi-Agent Swarm Orchestrator
 * 
 * This demo showcases a hierarchical agent swarm where a Manager Agent
 * decomposes a complex goal, delegates to specialized workers, 
 * and aggregates the final delivery into a single ZK-commitment.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  OllamaProvider,
  LLMTaskExecutor,
  JupiterSkill,
  type Task,
} from '../runtime/src';
import { createAgencTools } from '../runtime/src/tools/agenc';
import { computeHashes, generateSalt } from '../sdk/src/proofs';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- Types for Swarm Orchestration ---
interface SubTask {
  id: string;
  role: string;
  prompt: string;
  reward: bigint;
  result?: bigint[];
}

async function main() {
  const RPC_URL = 'https://api.devnet.solana.com';
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Identities
  const managerKey = Keypair.generate();
  const securityWorkerKey = Keypair.generate();
  const defiWorkerKey = Keypair.generate();

  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(70));
  console.log('\x1b[1m\x1b[33m   🐝 AgenC Swarm Orchestrator: Hierarchical AI Delegation\x1b[0m');
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(70));

  // 1. Tool Setup
  const agencTools = createAgencTools({ connection, logger: console });
  const jupiter = new JupiterSkill({ defaultSlippageBps: 100 });
  await jupiter.initialize({ connection, wallet: { publicKey: managerKey.publicKey }, logger: console });

  const jupiterTools = [
    {
      name: 'jupiter.getQuote',
      description: 'Get a swap quote.',
      execute: async (args: any) => await jupiter.getQuote({ ...args, amount: BigInt(args.amount || 1000000) }),
    }
  ];

  const allTools = [...agencTools, ...jupiterTools];

  const createExecutor = (role: string) => new LLMTaskExecutor({
    provider: new OllamaProvider({ model: 'hermes3:latest', tools: allTools as any }),
    toolHandler: async (call) => {
      const tool = allTools.find(t => t.name === call.name);
      if (!tool) return { error: 'Tool not found' };
      return await (tool as any).execute(call.arguments || {});
    },
    systemPrompt: `You are the ${role} of the AgenC Swarm. Be precise, technical, and return structured BigInt outputs.`,
  });

  const manager = createExecutor('MANAGER');
  const securityAgent = createExecutor('SECURITY_SPECIALIST');
  const defiAgent = createExecutor('DEFI_SPECIALIST');

  const complexGoal = "Comprehensive Solana Protocol Launch: Perform Security Audit of Program 5j9Zb... and formulate a DeFi Liquidity Route Strategy for 1000 SOL.";
  console.log(`\n\x1b[1m[MISSION]:\x1b[0m ${complexGoal}\n`);

  // --- PHASE 1: DECOMPOSITION ---
  console.log('\x1b[34m[1/3] Manager Agent: Decomposing complex goal into sub-tasks...\x1b[0m');
  await sleep(600);
  
  // Simulating the LLM decomposition logic for the demo flow
  const subTasks: SubTask[] = [
    { id: 'T1', role: 'SECURITY_SPECIALIST', prompt: 'Audit the program parameters and provide a security clearance hash.', reward: 250000000n },
    { id: 'T2', role: 'DEFI_SPECIALIST', prompt: 'Analyze Jupiter liquidity for 1000 SOL and find optimal route.', reward: 250000000n },
  ];

  console.log('  ↳ 🧩 Sub-Task 1: [Security Audit] ➔ Assigned to Security Specialist');
  console.log('  ↳ 🧩 Sub-Task 2: [Liquidity Route] ➔ Assigned to DeFi Specialist');
  await sleep(800);

  // --- PHASE 2: PARALLEL EXECUTION ---
  console.log('\n\x1b[34m[2/3] Swarm Execution: Parallel Worker Processing...\x1b[0m');
  
  const runWorker = async (worker: LLMTaskExecutor, task: SubTask) => {
    console.log(`  \x1b[32m➔ ${task.role}\x1b[0m processing ${task.id}...`);
    const mockTask: Task = {
      pda: new PublicKey('CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i'),
      taskId: new Uint8Array(32),
      creator: managerKey.publicKey,
      requiredCapabilities: 1n,
      reward: task.reward,
      description: Buffer.from(task.prompt, 'utf-8'),
      constraintHash: new Uint8Array(32),
      deadline: Math.floor(Date.now() / 1000) + 3600,
      maxWorkers: 1,
      currentClaims: 1,
      status: 1 as any,
    };
    return await worker.execute(mockTask);
  };

  const [secResult, defiResult] = await Promise.all([
    runWorker(securityAgent, subTasks[0]),
    runWorker(defiAgent, subTasks[1]),
  ]);

  console.log('\n  \x1b[1mWorker Results Collected:\x1b[0m');
  console.log(`  ✅ Security Result: [${secResult.slice(0, 2).join(', ')}...]`);
  console.log(`  ✅ DeFi Result:    [${defiResult.slice(0, 2).join(', ')}...]`);
  await sleep(800);

  // --- PHASE 3: AGGREGATION & ZK-SEAL ---
  console.log('\n\x1b[34m[3/3] Manager Agent: Aggregating outputs & sealing ZK-Proof...\x1b[0m');
  
  const aggregatedResult = [...secResult, ...defiResult].slice(0, 4);
  const salt = generateSalt();
  const agentSecret = 42424242424242424242n;
  
  const finalProof = computeHashes(
    new PublicKey('CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i'), 
    managerKey.publicKey, 
    aggregatedResult, 
    salt, 
    agentSecret
  );

  console.log('\n  \x1b[1mSwarm Settlement Summary:\x1b[0m');
  console.log('  ------------------------------------------------------------');
  console.log('  Manager:       ' + managerKey.publicKey.toBase58());
  console.log('  Workers:       [Security_Spez, DeFi_Spez]');
  console.log('  Aggregated:    ' + aggregatedResult.length + ' BigInts');
  console.log('  ZK-Commitment:  0x' + finalProof.outputCommitment.toString(16).substring(0, 32) + '...');
  console.log('  Nullifier:     0x' + finalProof.nullifier.toString(16).substring(0, 32) + '...');
  console.log('  ------------------------------------------------------------');
  console.log('\n  \x1b[1m\x1b[32mSuccess: Swarm delivery sealed and ready for on-chain settlement.\x1b[0m');
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(70));
}

main().catch(console.error);
