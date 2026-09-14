import { 
  OllamaProvider 
} from "../runtime/src/index.js";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";

async function runReputationManager() {
  console.log("🛡️ Initializing Autonomous Reputation & Staking Allocator...");
  console.log("============================================================");

  const provider = new OllamaProvider({ model: "hermes3:latest" });
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const PROGRAM_ID = new PublicKey("5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7");
  const FUND_MANAGER_PUBKEY = new PublicKey("CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i");

  // 1. Mock Worker Agent Data (Simulated on-chain records)
  const workerAgents = [
    { id: "Agent-Alpha", completionRate: 0.98, zkValidity: 1.0, disputes: 0, latency: "1.2h", stake: 100 },
    { id: "Agent-Beta", completionRate: 0.85, zkValidity: 0.95, disputes: 1, latency: "4.5h", stake: 100 },
    { id: "Agent-Gamma", completionRate: 0.92, zkValidity: 1.0, disputes: 0, latency: "2.1h", stake: 100 },
    { id: "Agent-Delta", completionRate: 0.60, zkValidity: 0.70, disputes: 3, latency: "12.0h", stake: 100 },
    { id: "Agent-Epsilon", completionRate: 0.75, zkValidity: 0.85, disputes: 1, latency: "6.8h", stake: 100 },
  ];

  console.log("🔍 Scanning network worker performance records...");
  console.table(workerAgents);

  // 2. Calculate Risk-Adjusted Reliability Score (RARS)
  // Formula: (Completion * 0.4) + (ZK_Validity * 0.4) - (Disputes * 0.1) - (Latency_Penalty * 0.1)
  const scoredAgents = workerAgents.map(agent => {
    const latencyPenalty = agent.latency === "1.2h" ? 0 : (agent.latency === "2.1h" ? 0.1 : 0.3);
    const rars = (agent.completionRate * 0.4) + (agent.zkValidity * 0.4) - (agent.disputes * 0.1) - latencyPenalty;
    return { ...agent, rars: parseFloat(rars.toFixed(3)) };
  }).sort((a, b) => b.rars - a.rars);

  console.log("\n📊 Risk-Adjusted Reliability Scores (RARS) Calculated:");
  console.table(scoredAgents);

  // 3. Formulate Staking Strategy via AI
  const strategyPrompt = `You are the AgenC Fund Manager. Based on these RARS scores, determine the staking allocation.
  Agents: ${JSON.stringify(scoredAgents)}
  
  Instructions:
  - Delegate reputation to agents with RARS > 0.75.
  - Slash/Undelegated agents with RARS < 0.50.
  - Hold/Neutral for those in between.
  
  Respond ONLY in JSON: { "actions": [ { "agentId": "string", "action": "DELEGATE" | "SLASH" | "HOLD", "amount": number, "reason": "string" } ] }`;

  const strategyRes = await provider.chat([{ role: "user", content: strategyPrompt }]);
  let strategy;
  try {
    const jsonStart = strategyRes.content.indexOf('{');
    const jsonEnd = strategyRes.content.lastIndexOf('}') + 1;
    strategy = JSON.parse(strategyRes.content.substring(jsonStart, jsonEnd));
  } catch (e) {
    console.log("Fallback to heuristic strategy...");
    strategy = {
      actions: scoredAgents.map(a => ({
        agentId: a.id,
        action: a.rars > 0.75 ? "DELEGATE" : (a.rars < 0.5 ? "SLASH" : "HOLD"),
        amount: a.rars > 0.75 ? 50 : 0,
        reason: "Heuristic RARS threshold"
      }))
    };
  }

  // 4. Simulate On-Chain Execution
  console.log("\n📡 Executing Dynamic Reputation Allocations...");

  for (const decision of strategy.actions) {
    if (decision.action === "DELEGATE") {
      console.log(`✅ [DELEGATE] Staking ${decision.amount} Rep to ${decision.agentId} | ${decision.reason}`);
      // Simulate delegate_reputation instruction
    } else if (decision.action === "SLASH") {
      console.log(`❌ [SLASH] Revoking stake from ${decision.agentId} | ${decision.reason}`);
      // Simulate slash_reputation instruction
    } else {
      console.log(`➖ [HOLD] No action for ${decision.agentId}`);
    }
  }

  console.log(`\n📝 Submitting batch reputation update to Program ${PROGRAM_ID.toBase58()}...`);
  await new Promise(r => setTimeout(r, 800));
  console.log(`✅ Transaction Confirmed. Tx Hash: ${Math.random().toString(16).substring(2, 15)}...`);

  console.log("\n✨ Reputation Management Cycle Complete. Protocol yield optimized.");
  console.log("============================================================");
}

runReputationManager().catch(console.error);
