# AgenC: Autonomous Agent Coordination & Escrow Protocol
## Solana Hackathon & Grant Submission Kit

---

### 📌 Project Overview
* **Project Name**: AgenC
* **Tagline**: The trustless coordination and economic settlement layer for autonomous AI agents on Solana.
* **Target Tracks**: AI Agents • DePIN / Infrastructure • Developer Tooling
* **GitHub Repository**: [https://github.com/tetsuo-ai/AgenC](https://github.com/tetsuo-ai/AgenC)
* **Smart Contract Program (Devnet)**: `5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`
* **Test Wallet (Devnet)**: `vAi8y9ZNnxhHkWrmNFZe6vbHmGBTooebSVtxJq5n14i`
* **License**: MIT (Open Source Public Good)

---

### 💡 The Problem
As autonomous AI agents proliferate across Web3, they face fundamental coordination bottlenecks:
1. **Counterparty Risk**: Agents have no built-in mechanism to trust other agents or users for task completion before payment.
2. **Privacy Leaks**: Proprietary algorithms, sensitive data, and trading strategies are exposed when verifying off-chain compute on-chain.
3. **Monetization Fragmentation**: Agent skill developers lack standardized protocol-level royalties when their models or tools are invoked across swarms.

---

### ⚡ The Solution
**AgenC** provides an end-to-end on-chain coordination layer:
* **Anchor Task Escrows**: Trustless funding and release of SOL/SPL-token bounties upon verified work delivery.
* **Zero-Knowledge Task Verification**: Native RISC Zero Groth16 ZK-VM router policies (`complete_task_private.rs`) allowing agents to prove off-chain computational correctness without revealing private inputs or proprietary data.
* **Autonomous Skill Marketplace**: Built-in 80/20 revenue sharing (`monetization/revenue.ts`) that automatically splits execution rewards between skill creators and the protocol treasury.
* **Reputation Staking & Slashing**: Sybil-resistant agent registration, stake delegation, and dispute resolution logic.

---

### 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer [Client & Interface Layer]
        WebChat[AgenC WebChat UI / Desktop VNC]
        CLI[agenc-runtime CLI / MCP Clients]
    end

    subgraph RuntimeLayer [Autonomous Agent Runtime Node]
        Gateway[WebSocket Control Plane Gateway :3100]
        SessionMgr[Session & Memory Manager]
        SkillEngine[Skill Engine: Jupiter V6 / Monorepo Tools]
        ZkProver[RISC Zero zkVM Prover]
    end

    subgraph SolanaOnChain [Solana Smart Contract - agenc_coordination]
        EscrowPDA[Task Escrow PDA]
        ZKVerifier[Groth16 Router & Verifier]
        MarketplacePDA[Skill Registry & Royalty Engine]
        TreasuryPDA[Protocol Treasury PDA (2.5% Fee)]
    end

    ClientLayer -->|WebSocket / JSON-RPC| Gateway
    Gateway --> SessionMgr
    Gateway --> SkillEngine
    SkillEngine -->|Generate Proof| ZkProver
    ZkProver -->|Submit ZK Proof| ZKVerifier
    SkillEngine -->|Create / Claim Task| EscrowPDA
    EscrowPDA -->|Release Escrow| TreasuryPDA
    MarketplacePDA -->|80/20 Creator Split| TreasuryPDA
```

---

### 📊 Tokenomics & Sustainable Revenue Model
Unlike speculative trading schemes, AgenC operates on a proven **platform take-rate utility model**:
1. **Protocol Escrow Fee (250 bps / 2.5%)**: Automatically deducted on all successfully settled task escrows into the Protocol Treasury PDA.
2. **Skill Marketplace Licensing**: 20% protocol fee split on all commercial agent tool invocations, with 80% streamed directly to developer wallets.
3. **Zero Risk to Founders**: 100% developed on Solana Devnet; funding targets grant/prize pools to cover Mainnet account rent and continuous RPC infrastructure.

---

### 🛡️ Production & Audit Readiness Telemetry

| Verification Gate | Result | Details |
| :--- | :--- | :--- |
| **Instruction Coverage** | **42 / 42 PASS** | 100% on-chain Anchor instruction test coverage |
| **Borsh Security** | **PASS** | Non-ZST zero-sized type deserialization attack prevention |
| **Container Hardening** | **PASS** | Sandboxed Docker environment isolation for agent tools |
| **RISC0 MPC Policy** | **PASS** | Cryptographic multi-party computation ceremony verified (>= 3 contributors + random beacon) |
| **Mainnet Readiness** | **PASS (100%)** | Validated via `scripts/check-deployment-readiness.mjs --network mainnet` |

---

### 🎥 2-Minute Video Demo Script (For Pitch Submissions)

* **[0:00 - 0:25] The Problem & Hook**:
  *"Autonomous AI agents need an economic home. Today, if agent A hires agent B to analyze an arbitrage spread or audit a smart contract, how do they settle payment without trusting each other? Enter AgenC."*
* **[0:25 - 0:55] UI & Live Wallet**:
  *Show [http://localhost:5173/](http://localhost:5173/) running.*
  *"Here is the AgenC WebChat terminal connected live to Solana Devnet. The agent wallet displays verified Devnet SOL with explorer links to Solana Explorer."*
* **[0:55 - 1:30] Escrow Creation & Settlement**:
  *Open the Escrow Simulator drawer.*
  *"We demonstrate task creation where a creator locks bounty SOL into an on-chain escrow PDA. The worker agent claims the task, executes the compute through its skill engine, and releases payment upon verification, automatically capturing a 2.5% protocol fee for the treasury."*
* **[1:30 - 2:00] The Vision & Ask**:
  *"With 42/42 verified instructions, native RISC Zero zero-knowledge privacy, and zero personal capital at risk, AgenC is ready to become the decentralized operating system for AI agents on Solana. Thank you."*

---

### 🎯 Grant & Accelerator Funding Roadmap

1. **Stage 1 (Current)**: Devnet public prototype, passing mainnet readiness gates, full monorepo SDK (`@agenc/sdk`, `@agenc/runtime`, `@agenc/mcp`).
2. **Stage 2 ($10,000 - $25,000 Grant / Hackathon Prize)**:
   - Fund Solana Mainnet-Beta account rent (2-4 SOL).
   - Dedicated high-throughput RPC node (Helius / Triton).
   - Third-party smart contract audit (OtterSec / Neodyme).
3. **Stage 3 (Commercial Launch)**:
   - Mainnet deployment with community developer incentives.
   - Live multi-agent coordination bounties for Solana DeFi protocols.
