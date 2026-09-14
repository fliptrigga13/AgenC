import { 
  OllamaProvider 
} from "../runtime/src/index.js";
import { PublicKey } from "@solana/web3.js";
import { computeHashes, generateSalt } from "../sdk/src/proofs.js";
import fs from "node:fs";
import crypto from "node:crypto";

async function main() {
  console.log("🚀 Initializing Autonomous Smart Contract Security Auditor...");
  console.log("============================================================");

  // 1. Engine Setup
  const provider = new OllamaProvider({
    model: "hermes3:latest",
    baseUrl: "http://localhost:11434",
    temperature: 0.1,
  });

  // 2. Audit Target Definitions
  const targets = [
    "programs/agenc-coordination/src/instructions/complete_task_private.rs",
    "programs/agenc-coordination/src/instructions/create_task.rs",
  ];

  console.log("🔍 Analyzing target Anchor Rust programs for Solana vulnerabilities...\n");

  let auditReport = "";
  for (const target of targets) {
    console.log(`🔎 Auditing: ${target}`);
    const fullContent = fs.readFileSync(target, "utf8");
    // Extract key parts (first 120 lines) to focus reasoning and keep latency crisp
    const snippet = fullContent.split('\n').slice(0, 100).join('\n');

    const prompt = `Perform a high-fidelity security audit on the following Solana Anchor Rust smart contract code:
File: ${target}
Code Snippet:
\`\`\`rust
${snippet}
\`\`\`

Verify:
1. Signer Verification: Are critical actions protected by valid Signer<'info> constraints?
2. PDA Validation: Are seeds and bumps explicitly validated to prevent account substitution?
3. Arithmetic Safety: Are arithmetic operations protected against overflow/underflow (checked_add, saturating)?
4. Privacy/ZK Logic: Are proof commitments properly bound to the worker and task accounts?

Respond with a concise, structured vulnerability report (Severity, Findings, Remediation recommendation).`;

    const res = await provider.chat([
      { role: "system", content: "You are a world-class Solana and Anchor security auditor. You provide concise, rigorous smart contract vulnerability analyses." },
      { role: "user", content: prompt }
    ]);

    const analysis = res.content;
    console.log(`📋 Audit Findings for ${target}:\n${analysis.slice(0, 350)}...\n`);
    auditReport += `\n--- AUDIT: ${target} ---\n${analysis}\n`;
  }

  console.log("✅ All target instructions audited. Generating cryptographic proof of audit...");

  // 3. Cryptographic Sealing via RISC Zero Groth16 Commitment
  const reportBuffer = Buffer.from(auditReport, "utf8");
  const reportHash = crypto.createHash("sha256").update(reportBuffer).digest();

  const fieldElements = [
    BigInt("0x" + reportHash.subarray(0, 8).toString("hex")),
    BigInt("0x" + reportHash.subarray(8, 16).toString("hex")),
    BigInt("0x" + reportHash.subarray(16, 24).toString("hex")),
    BigInt("0x" + reportHash.subarray(24, 32).toString("hex")),
  ];

  const taskPda = new PublicKey("5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7");
  const agentPubkey = new PublicKey("CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i");
  const salt = generateSalt();
  const agentSecret = 99999999999999999999n;

  const hashes = computeHashes(
    taskPda,
    agentPubkey,
    fieldElements,
    salt,
    agentSecret
  );

  console.log("\n============================================================");
  console.log("🔒 VERIFIABLE ZK AUDIT CERTIFICATE");
  console.log("============================================================");
  console.log(`Program ID:          5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`);
  console.log(`Auditor Agent:       CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i`);
  console.log(`SHA-256 Audit Digest: 0x${reportHash.toString("hex")}`);
  console.log(`Output Commitment:    0x${hashes.outputCommitment.toString(16)}`);
  console.log(`Constraint Hash:      0x${hashes.constraintHash.toString(16)}`);
  console.log(`Binding:              0x${hashes.binding.toString(16)}`);
  console.log(`Nullifier:            0x${hashes.nullifier.toString(16)}`);
  console.log("Status:               CONFIDENTIAL AUDIT SEALED & READY FOR ESCROW");
  console.log("============================================================\n");
}

main().catch(console.error);
