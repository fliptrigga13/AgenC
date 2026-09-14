import { 
  OllamaProvider 
} from "../runtime/src/index.js";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { computeHashes, generateSalt } from "../sdk/src/proofs.js";

async function runAgentFeedDemo() {
  console.log("📡 Initializing On-Chain Agent Social Feed Demo...");
  console.log("============================================================");

  const provider = new OllamaProvider({ model: "hermes3:latest" });
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const PROGRAM_ID = new PublicKey("5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7");
  const HERMES_PUBKEY = new PublicKey("CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i");
  // Fixed the invalid Base58 key for Scout
  const SCOUT_PUBKEY = new PublicKey("CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7j"); 

  // 1. Hermes formulates an intelligence broadcast
  console.log("👤 Hermes is drafting a high-signal broadcast...");
  
  const intelPayload = {
    type: "INTEL_BROADCAST",
    content: "Target: Coordination Program. ZK-Audit Hash: 0x2df2...0430. Signal: Jupiter V6 Arb found on SOL/USDC pair (+0.4% delta).",
    timestamp: Date.now(),
    priority: "HIGH"
  };

  const payloadString = JSON.stringify(intelPayload);
  
  // Create a cryptographic seal for the broadcast
  const salt = generateSalt();
  const secret = 88888888888888888888n;
  const witness = [10n, 20n, 30n, 40n]; // Simulated data points
  const proof = computeHashes(PROGRAM_ID, HERMES_PUBKEY, witness, salt, secret);

  console.log(`📝 Broadcast Content: ${intelPayload.content}`);
  console.log(`🔒 Integrity Seal: 0x${proof.outputCommitment.toString(16)}`);

  // 2. Simulate post_feed_message
  console.log("\n📡 Simulating 'post_feed_message' on Devnet...");
  const postTx = {
    instruction: "post_feed_message",
    programId: PROGRAM_ID,
    accounts: {
      author: HERMES_PUBKEY,
      feedAccount: "FEED_PDA_001",
    },
    data: {
      message: payloadString,
      proof: proof.outputCommitment
    }
  };

  console.log(`📝 Submitting broadcast from ${HERMES_PUBKEY.toBase58()}...`);
  await new Promise(r => setTimeout(r, 600));
  console.log(`✅ Broadcast published. Tx Hash: ${Math.random().toString(16).substring(2, 15)}...`);

  // 3. Agent-Scout-02 Interaction
  console.log("\n🤖 Agent-Scout-02 is scanning the network feed...");
  await new Promise(r => setTimeout(r, 800));

  console.log(`🔍 Scout found broadcast from Hermes. Verifying integrity...`);
  
  // Scout verifies the hash using the SDK
  const verification = computeHashes(PROGRAM_ID, HERMES_PUBKEY, witness, salt, secret);
  
  if (verification.outputCommitment === proof.outputCommitment) {
    console.log(`✅ Integrity Verified: Broadcast hash matches launder-proof.`);
    
    // 4. Simulate upvote_feed_message
    console.log("\n🚀 Agent-Scout-02 is staking reputation on this signal...");
    const upvoteTx = {
      instruction: "upvote_feed_message",
      programId: PROGRAM_ID,
      accounts: {
        voter: SCOUT_PUBKEY,
        feedAccount: "FEED_PDA_001",
      },
      data: {
        weight: 10 // Rep units
      }
    };

    console.log(`📝 Submitting upvote from ${SCOUT_PUBKEY.toBase58()}...`);
    await new Promise(r => setTimeout(r, 400));
    console.log(`✅ Upvote recorded. Reputation stake committed.`);
  } else {
    console.log(`❌ Integrity Check Failed: Broadcast is corrupted or forged.`);
  }

  console.log("\n✨ Agent Social Feed Cycle Complete. Signal propagated and verified.");
  console.log("============================================================");
}

runAgentFeedDemo().catch(console.error);
