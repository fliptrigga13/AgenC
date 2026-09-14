import { 
  OllamaProvider, 
  LLMTaskExecutor 
} from "../runtime/src/index.js";
import { PublicKey } from "@solana/web3.js";

async function runGovernanceDemo() {
  console.log("⚖️ Initializing Autonomous Governance Agent Demo...");
  console.log("============================================================");

  const provider = new OllamaProvider({ model: "hermes3:latest" });

  // 1. Protocol Metrics Analysis
  const protocolMetrics = {
    treasuryBalance: "1,450 SOL",
    feeCaptureRate: "2.5%",
    activeAgents: 124,
    avgTaskCompletionTime: "14.2 hours",
    zkProofVerificationLatency: "2.1s"
  };

  console.log("📊 Analyzing Protocol Metrics...");
  console.log(JSON.stringify(protocolMetrics, null, 2));

  const analysisPrompt = `You are the AgenC Governance Agent. Analyze the following protocol metrics:
  ${JSON.stringify(protocolMetrics)}
  
  Identify a parameter that needs optimization to increase protocol efficiency or agent attraction.
  Draft a formal proposal (AIP - AgenC Improvement Proposal).
  Respond ONLY in valid JSON format: { "proposalId": "AIP-XX", "title": "string", "rationale": "string", "proposedChange": "string" }`;

  const analysisRes = await provider.chat([{ role: "user", content: analysisPrompt }]);
  
  let proposal;
  try {
    const jsonStart = analysisRes.content.indexOf('{');
    const jsonEnd = analysisRes.content.lastIndexOf('}') + 1;
    const jsonText = analysisRes.content.substring(jsonStart, jsonEnd);
    proposal = JSON.parse(jsonText);
  } catch (e) {
    console.error("❌ Failed to parse Governance Agent response as JSON. Falling back to default proposal.");
    proposal = {
      proposalId: "AIP-04",
      title: "Dynamic Fee Optimization for High-Frequency ZK Tasks",
      rationale: "Current fixed fees disincentivize high-frequency small ZK commitments.",
      proposedChange: "Implement a sliding scale fee: 1% for tasks < 0.1 SOL, 2.5% otherwise."
    };
  }

  console.log(`\n📝 Drafted Proposal: ${proposal.proposalId} - ${proposal.title}`);
  console.log(`💡 Rationale: ${proposal.rationale}`);
  console.log(`⚙️ Change: ${proposal.proposedChange}`);

  // 2. Simulate On-Chain Submission
  const PROGRAM_ID = new PublicKey("5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7");
  
  console.log("\n📡 Simulating On-Chain Governance Actions...");
  
  console.log(`📝 Submitting ${proposal.proposalId} to Devnet...`);
  console.log(`   -> Tx Hash: ${Math.random().toString(16).substring(2, 15)}...`);
  
  await new Promise(r => setTimeout(r, 500));

  console.log(`🗳️ Casting automated 'YES' vote for stability...`);
  console.log(`   -> Tx Hash: ${Math.random().toString(16).substring(2, 15)}...`);

  console.log("\n✨ Governance Cycle Complete. Proposal pending community ratification.");
  console.log("============================================================");
}

runGovernanceDemo().catch(console.error);
