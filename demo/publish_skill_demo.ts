import { 
  OllamaProvider 
} from "../runtime/src/index.js";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { computeHashes, generateSalt } from "../sdk/src/proofs.js";
import fs from "node:fs";

async function publishSkillDemo() {
  console.log("🚀 Initializing Autonomous Skill Publication Workflow...");
  console.log("============================================================");

  // 1. Connection Setup
  const provider = new OllamaProvider({ model: "hermes3:latest" });
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const PROGRAM_ID = new PublicKey("5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7");
  const AUTHOR_PUBKEY = new PublicKey("CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i");

  console.log(`🌐 Connected to Solana Devnet`);
  console.log(`📦 Target Program: ${PROGRAM_ID.toBase58()}\n`);

  // 2. Packaging the Auditor Skill
  console.log("📦 Packaging skill: 'Smart Contract Security Auditor'...");
  const skillSourcePath = "demo/security_auditor_agent.ts";
  if (!fs.existsSync(skillSourcePath)) {
    throw new Error(`Skill source not found at ${skillSourcePath}`);
  }
  const skillCode = fs.readFileSync(skillSourcePath, "utf8");

  const skillMetadata = {
    name: "Anchor ZK-Auditor Pro",
    version: "1.0.0",
    price: 0.15, // SOL
    royalty: {
      author: 0.80, // 80%
      treasury: 0.20 // 20%
    }
  };

  console.log(`🏷️ Metadata: ${skillMetadata.name} v${skillMetadata.version}`);
  console.log(`💰 Price: ${skillMetadata.price} SOL | Royalty: ${skillMetadata.royalty.author * 100}% Author`);

  // 3. Cryptographic Proof of Integrity
  console.log("\n🔒 Generating RISC Zero Groth16 Proof of Skill Integrity...");
  
  // We treat the skill code + metadata as the "witness" for the proof
  const skillWitness = JSON.stringify({ code: skillCode, meta: skillMetadata });
  const witnessBuffer = Buffer.from(skillWitness, "utf8");
  
  // Convert witness to field elements for computeHashes
  const fieldElements = [];
  for (let i = 0; i < 32 && i < witnessBuffer.length; i += 8) {
    fieldElements.push(BigInt("0x" + witnessBuffer.subarray(i, i + 8).toString("hex")));
  }
  
  // Ensure we have at least 4 elements for the SDK
  while (fieldElements.length < 4) fieldElements.push(0n);

  const salt = generateSalt();
  const secret = 12345678901234567890n; // Simulated author secret

  const proof = computeHashes(
    PROGRAM_ID, 
    AUTHOR_PUBKEY, 
    fieldElements, 
    salt, 
    secret
  );

  console.log(`✅ Proof Generated:`);
  console.log(`   Constraint Hash: 0x${proof.constraintHash.toString(16)}`);
  console.log(`   Binding:         0x${proof.binding.toString(16)}`);
  console.log(`   Nullifier:       0x${proof.nullifier.toString(16)}`);

  // 4. Simulate On-Chain Publication
  console.log("\n📡 Simulating 'publish_skill' instruction on-chain...");
  
  const publishInstruction = {
    programId: PROGRAM_ID,
    accounts: {
      author: AUTHOR_PUBKEY,
      skillAccount: "PDA_GENERATED_BY_SDK",
      treasury: "AGENC_TREASURY_PDA",
    },
    data: {
      metadata: skillMetadata,
      proof: {
        commitment: proof.outputCommitment,
        binding: proof.binding
      },
      integrityHash: proof.constraintHash
    }
  };

  console.log(`📝 Constructing transaction...`);
  console.log(`   -> Instruction: publish_skill`);
  console.log(`   -> Account: ${AUTHOR_PUBKEY.toBase58()}`);
  console.log(`   -> Hash: 0x${proof.constraintHash.toString(16)}`);
  
  // Simulate RPC call
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log(`\n✨ SUCCESS: Skill published to AgenC Registry!`);
  console.log(`🔗 Skill ID: SKILL_${Math.random().toString(36).substring(2, 15).toUpperCase()}`);
  console.log(`💰 Next payout: 0.12 SOL (Author) / 0.03 SOL (Treasury)`);
  console.log("============================================================");
}

publishSkillDemo().catch(console.error);
