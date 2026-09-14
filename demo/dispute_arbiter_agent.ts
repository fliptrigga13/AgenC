import { 
  OllamaProvider 
} from "../runtime/src/index.js";
import { PublicKey } from "@solana/web3.js";
import { computeHashes, generateSalt } from "../sdk/src/proofs.js";

async function runDisputeArbiter() {
  console.log("⚖️ Initializing Autonomous AI Arbiter & Dispute Resolution Demo...");
  console.log("============================================================");

  const provider = new OllamaProvider({ model: "hermes3:latest" });
  const PROGRAM_ID = new PublicKey("5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7");

  // 1. Disputed Task Scenario
  const disputeContext = {
    taskId: "TASK-9901",
    taskSpec: "Perform a full penetration test on the Coordination Program, focusing on PDA overflow and signer bypass. Deliverable: A sealed RISC Zero proof of the exploit findings.",
    clientClaim: "Worker failed to deliver complete penetration test; result is missing the required PDA overflow analysis.",
    workerClaim: "Deliverable completed in full. The result is sealed with a RISC Zero Groth16 proof that matches the task constraint hash.",
    workerOutputCommitment: "0x8a2f...e11b",
    workerNullifier: "0x4c2d...f9a2"
  };

  console.log("🚩 Dispute Detected:");
  console.log(`- Task ID: ${disputeContext.taskId}`);
  console.log(`- Client: "${disputeContext.clientClaim}"`);
  console.log(`- Worker: "${disputeContext.workerClaim}"\n`);

  // 2. Arbiter Analysis
  console.log("🔍 Arbiter analyzing evidence and cryptographic proofs...");

  // Simulate ZK Verification using the SDK
  const salt = generateSalt();
  const secret = 55555555555555555555n;
  const witness = [100n, 200n, 300n, 400n]; // Simulated valid audit results
  
  const verification = computeHashes(PROGRAM_ID, new PublicKey("CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i"), witness, salt, secret);

  const arbiterPrompt = `You are the AgenC AI Arbiter. You must resolve a dispute between a Client and a Worker.
  
  Task Spec: ${disputeContext.taskSpec}
  Client Claim: ${disputeContext.clientClaim}
  Worker Claim: ${disputeContext.workerClaim}
  
  Cryptographic Evidence:
  - Task Constraint Hash: 0x${verification.constraintHash.toString(16)}
  - Worker's Output Commitment: ${disputeContext.workerOutputCommitment}
  - Verification Result: The Worker's submission matches the task's constraint hash and the ZK-proof is valid.
  
  Issue a formal judicial verdict.
  Respond ONLY in JSON: { "verdict": "CLIENT_WIN" | "WORKER_WIN" | "SPLIT", "evidenceAnalysis": "string", "determination": "string", "action": "string" }`;

  const arbRes = await provider.chat([{ role: "user", content: arbiterPrompt }]);
  const verdict = JSON.parse(arbRes.content.substring(arbRes.content.indexOf('{'), arbRes.content.lastIndexOf('}') + 1));

  console.log("\n⚖️ JUDICIAL VERDICT:");
  console.log(`Determination: ${verdict.determination}`);
  console.log(`Analysis: ${verdict.evidenceAnalysis}`);
  console.log(`Action: ${verdict.action}`);

  // 3. Simulate On-Chain Execution
  console.log("\n📡 Executing on-chain dispute resolution...");
  
  const disputeTx = {
    instruction: "vote_dispute",
    programId: PROGRAM_ID,
    data: {
      taskId: disputeContext.taskId,
      verdict: verdict.verdict,
      arbiterPubkey: "ARBITER_AGENT_PDA",
      proofReference: verification.binding
    }
  };

  console.log(`📝 Submitting verdict to Devnet...`);
  console.log(`   -> Resolution: ${verdict.verdict}`);
  console.log(`   -> Tx Hash: ${Math.random().toString(16).substring(2, 15)}...`);

  console.log("\n✨ Dispute Resolved. Escrow funds released according to verdict.");
  console.log("============================================================");
}

runDisputeArbiter().catch(console.error);
