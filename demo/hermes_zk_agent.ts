/**
 * Hermes ZK-Agent Demo for AgenC
 * 
 * This demo unites live Solana on-chain protocol state (via AgenC tools) 
 * with private task output sealing using RISC Zero zkVM proofs.
 * 
 * Flow:
 * 1. Connect to Solana Devnet.
 * 2. Initialize Hermes 3 agent with real AgenC protocol tools.
 * 3. Execute a confidential task.
 * 4. Generate a ZK-Proof commitment for the output using computeHashes.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  OllamaProvider,
  LLMTaskExecutor,
  ToolRegistry,
  type Task,
} from '../runtime/src';
import { createAgencTools } from '../runtime/src/tools/agenc';
import { computeHashes, generateSalt } from '../sdk/src/proofs';

async function main() {
  console.log('='.repeat(65));
  console.log('   AgenC x Hermes 3 ZK-Agent: Live State & Private Proofs');
  console.log('='.repeat(65));

  // 1. Setup Solana Connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Use a fixed keypair for the demo agent
  const agentKeypair = Keypair.generate();
  const agentPubkey = agentKeypair.publicKey;

  // 2. Initialize AgenC Tools & Tool Registry
  const registry = new ToolRegistry();
  const agencTools = createAgencTools({ connection });
  registry.registerAll(agencTools);
  const tools = registry.toLLMTools();
  const toolHandler = registry.createToolHandler();

  // 3. Initialize Ollama Provider with Hermes 3
  console.log('[1/4] Initializing Ollama Provider (model: hermes3:latest)...');
  const provider = new OllamaProvider({
    model: 'hermes3:latest',
    tools,
    temperature: 0.2,
    maxTokens: 1024,
  });

  // 4. Configure LLM Task Executor
  console.log('[2/4] Initializing AgenC LLMTaskExecutor...');
  const executor = new LLMTaskExecutor({
    provider,
    toolHandler,
    systemPrompt: [
      'You are Hermes, a ZK-enabled autonomous agent on the AgenC protocol.',
      'You have access to live Solana Devnet state via AgenC tools.',
      'Your goal is to analyze the protocol state, execute confidential tasks,',
      'and provide verifiable output BigInts.',
      'Always use the provided tools to verify protocol parameters before making recommendations.',
    ].join(' '),
    streaming: true,
    onStreamChunk: (chunk) => {
      if (chunk.content) process.stdout.write(chunk.content);
    },
  });

  // 5. Construct a sample Confidential Task
  const taskPrompt = 'Query the current AgenC protocol configuration and propose an optimal fee for a high-value confidential settlement.';
  const taskIdBuffer = Buffer.alloc(32);
  taskIdBuffer.writeUInt32BE(202, 28);

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
    status: 1 as any, 
  };

  console.log('[3/4] Dispatching ZK-Task to Hermes 3:');
  console.log(`      Task PDA: ${mockTask.pda.toBase58()}`);
  console.log(`      Prompt:   "${taskPrompt}"`);
  console.log('\n--- Streaming Hermes 3 Reasoning & Output ---');

  const startTime = Date.now();
  const outputBigints = await executor.execute(mockTask);
  const elapsedMs = Date.now() - startTime;

  console.log('\n' + '-'.repeat(65));
  console.log('[4/4] Task Execution Completed Successfully!');
  console.log(`      Execution Time: ${(elapsedMs / 1000).toFixed(2)}s`);
  console.log(`      Output BigInts: [${outputBigints.map(b => '0x' + b.toString(16)).join(', ')}]`);

  // 6. Generate ZK-Proof Commitment
  console.log('\n--- Generating RISC Zero zkVM Commitment ---');
  const salt = generateSalt();
  const agentSecret = 12345678901234567890n; // In production, this is the agent's private secret

  try {
    const hashes = computeHashes(
      mockTask.pda,
      agentPubkey,
      outputBigints,
      salt,
      agentSecret
    );

    console.log('  Commitment Results:');
    console.log(`  - Constraint Hash:   0x${hashes.constraintHash.toString(16)}`);
    console.log(`  - Output Commitment: 0x${hashes.outputCommitment.toString(16)}`);
    console.log(`  - Binding:           0x${hashes.binding.toString(16)}`);
    console.log(`  - Nullifier:         0x${hashes.nullifier.toString(16)}`);
    console.log(`  - Salt:              0x${salt.toString(16)}`);
    console.log(`  - Agent Pubkey:      ${agentPubkey.toBase58()}`);
    console.log('  Success: Task outputs are now sealed for ZK-Proof submission.');
  } catch (err) {
    console.error('  ZK-Proof Generation Failed:', err);
  }

  console.log('='.repeat(65));
}

main().catch((err) => {
  console.error('\nExecution failed:', err);
  process.exit(1);
});
