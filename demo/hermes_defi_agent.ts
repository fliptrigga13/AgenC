/**
 * AgenC DeFi Agent: Jupiter-powered Arbitrage & Market Intelligence
 * 
 * This demo showcases an autonomous agent that:
 * 1. Queries live DeFi state (Jupiter API) and On-Chain protocol state (AgenC Tools).
 * 2. Reasons about liquidity, price spreads, and execution routes using Hermes 3.
 * 3. Seals a private trade plan with a RISC Zero Groth16 commitment to prevent front-running.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  OllamaProvider,
  LLMTaskExecutor,
  JupiterSkill,
  WSOL_MINT,
  USDC_MINT,
  type Task,
} from '../runtime/src';
import { createAgencTools } from '../runtime/src/tools/agenc';
import { computeHashes, generateSalt } from '../sdk/src/proofs';

async function main() {
  const RPC_URL = 'https://api.devnet.solana.com';
  const connection = new Connection(RPC_URL, 'confirmed');
  const agentKeypair = Keypair.generate();
  
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(70));
  console.log('\x1b[1m\x1b[33m   🤖 AgenC DeFi Agent: Jupiter Arbitrage & ZK-Sealing\x1b[0m');
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(70));

  // 1. Initialize Jupiter Skill
  const jupiter = new JupiterSkill({
    defaultSlippageBps: 100,
    timeoutMs: 30_000,
  });
  
  // We need a wallet for Jupiter balance/quote calls
  await jupiter.initialize({ 
    connection, 
    wallet: { publicKey: agentKeypair.publicKey }, 
    logger: console 
  });

  // 2. Create Integrated Tool Registry
  const agencTools = createAgencTools({ connection, logger: console });
  
  // Wrap Jupiter methods into tool definitions for the LLM
  const jupiterTools = [
    {
      name: 'jupiter.getTokenPrice',
      description: 'Get current USD price for a list of mints. Input: array of mint addresses.',
      execute: async (args: { mints: string[] }) => await jupiter.getTokenPrice(args.mints),
    },
    {
      name: 'jupiter.getQuote',
      description: 'Get a swap quote. Input: inputMint, outputMint, amount (lamports).',
      execute: async (args: { inputMint: string, outputMint: string, amount: string }) => 
        await jupiter.getQuote({ 
          inputMint: args.inputMint, 
          outputMint: args.outputMint, 
          amount: BigInt(args.amount) 
        }),
    }
  ];

  const allTools = [...agencTools, ...jupiterTools];

  const provider = new OllamaProvider({
    model: 'hermes3:latest',
    tools: allTools as any,
    temperature: 0.3,
  });

  const executor = new LLMTaskExecutor({
    provider,
    toolHandler: async (call) => {
      const tool = allTools.find(t => t.name === call.name);
      if (!tool) return { error: `Tool ${call.name} not found` };
      
      // Handle both agenc-style execute() and our wrapped jupiter execute()
      if (typeof tool === 'function') return await tool(call.arguments || {});
      return await (tool as any).execute(call.arguments || {});
    },
    streaming: true,
    onStreamChunk: (chunk) => {
      if (chunk.content) process.stdout.write(chunk.content);
    },
  });

  // 3. Dispatch DeFi Arbitrage Task
  const taskPda = new PublicKey('CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i');
  const prompt = "Analyze current SOL/USDC pricing and spreads using Jupiter. Identify an optimal execution route and formulate a private settlement trade plan. Explain the liquidity impact.";

  console.log(`\n\n\x1b[1m\x1b[34m[TASK] Dispatching DeFi Intelligence Request...\x1b[0m`);
  console.log(`Prompt: ${prompt}\n`);

  const mockTask: Task = {
    pda: taskPda,
    taskId: new Uint8Array(32),
    creator: new PublicKey('EHNevtRqGs13r6H9A7aL7J3K37Vdqisfo8nggV7MtLGe'),
    requiredCapabilities: 1n,
    reward: 500000000n,
    description: Buffer.from(prompt, 'utf-8'),
    constraintHash: new Uint8Array(32),
    deadline: Math.floor(Date.now() / 1000) + 3600,
    maxWorkers: 1,
    currentClaims: 1,
    status: 1 as any,
  };

  const outputBigints = await executor.execute(mockTask);

  // 4. ZK-Seal the Trade Route
  console.log('\n\n\x1b[1m\x1b[32m[ZK-SEAL] Sealing Trade Route to prevent front-running...\x1b[0m');
  
  const salt = generateSalt();
  const agentSecret = 12345678901234567890n;
  const hashes = computeHashes(taskPda, agentKeypair.publicKey, outputBigints, salt, agentSecret);

  console.log(`\n  ✅ Route Sealed: 0x${hashes.outputCommitment.toString(16).substring(0, 32)}...`);
  console.log(`  ✅ Nullifier:    0x${hashes.nullifier.toString(16).substring(0, 32)}...`);
  console.log('\n\x1b[1m\x1b[32mResult: Trade plan is now a private ZK-commitment. Ready for stealth execution.\x1b[0m');
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(70));
}

main().catch(console.error);
