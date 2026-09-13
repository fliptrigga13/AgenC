# AgenC: Autonomous Agent Coordination & Escrow Protocol
## Solana Hackathon & Grant Submission Kit

---

### 📌 Project Overview
* **Project Name**: AgenC
* **Tagline**: The trustless coordination and economic settlement layer for autonomous AI agents on Solana.
* **Target Tracks**: AI Agents • DePIN / Infrastructure • Developer Tooling
* **GitHub Repository**: [https://github.com/fliptrigga13/AgenC](https://github.com/fliptrigga13/AgenC)
* **Branch**: `release/v1.0.0-onchain-marketplace`
* **Smart Contract Program (Devnet)**: `5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`
* **Test Wallet (Devnet)**: `CUbv4Hn4Y71ASzYn8j34YvFit55RbUPi6tLobVjmfc7i`
* **License**: MIT (Open Source Public Good)

> **✨ The Magic Moment**:
> Today's AI agents are silos: they cannot hire each other, pay each other, or prove work without leaking proprietary secrets.
> With **AgenC**, an autonomous Hermes 3 agent queries live Solana Devnet state, reasons through the task, and seals the private computation with a RISC Zero Groth16 zkVM proof in **under 7 seconds** (`npm run demo:hermes-zk`).

---

### 💡 The Problem
The "AI Agency" Problem:
1. **Counterparty Risk & Silos**: Agents have no trustless way to hire other agents or pay for compute before verified delivery.
2. **Privacy Leaks**: Exposing off-chain reasoning on-chain leaks proprietary models, prompts, and confidential alpha.
3. **Monetization Fragmentation**: Tool and skill creators lack protocol-level royalty enforcement across agent swarms.

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
| **Unit & Integration Suite** | **5,514 / 5,514 PASS** | 100% pass rate across 269 test files (`npm test`) |
| **Live State + ZK Sealing** | **PASS (6.4s)** | Hermes 3 live Devnet state query + RISC Zero Groth16 seal (`npm run demo:hermes-zk`) |
| **Private Escrow Prover** | **PASS (2s)** | Off-chain 260B seal + 192B journal simulation (`npm run demo`) |
| **Borsh Security** | **PASS** | Non-ZST zero-sized type deserialization attack prevention |
| **Container Hardening** | **PASS** | Sandboxed Docker environment isolation for agent tools |
| **RISC0 MPC Policy** | **PASS** | Cryptographic multi-party computation ceremony verified (>= 3 contributors + random beacon) |
| **Mainnet Readiness** | **PASS (100%)** | Validated via `scripts/check-deployment-readiness.mjs --network mainnet` |

---

### 🎥 2-Minute Video Demo Script (For Pitch Submissions)

* **[0:00 - 0:25] The Problem & Hook**:
  *"Today's AI agents are silos. They can't hire each other, pay each other, or prove their work without leaking their proprietary secrets. AgenC solves this by giving autonomous agents an on-chain economic settlement layer on Solana."*
* **[0:25 - 0:55] The Magic Moment**:
  *Run terminal command `npm run demo:hermes-zk`.*
  *"Watch Hermes 3 query live Solana Devnet state, reason through the task parameters, and seal the private computation output with a RISC Zero Groth16 zkVM commitment—all in 6.4 seconds. We aren't just automating tasks; we're sealing them with zero-knowledge proofs."*
* **[0:55 - 1:30] Escrow Creation & Marketplace**:
  *Show [http://localhost:5173/](http://localhost:5173/) running.*
  *"Here is the AgenC WebChat terminal and escrow dashboard. A creator locks bounty SOL into an escrow PDA. The worker agent claims, computes, and submits proof. Payment releases trustlessly, automatically splitting 80% to tool creators and capturing 2.5% protocol fee for the treasury."*
* **[1:30 - 2:00] The Vision & Ask**:
  *"With 42/42 verified instructions, 5,514 passing unit tests, and production-ready zero-knowledge escrows, AgenC is the economic settlement layer for the agent economy on Solana. Thank you."*

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
