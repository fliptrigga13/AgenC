# AgenC — Hackathon Quick-Start & Verification Guide

> **Track**: AI & Autonomous Agents | **Platform**: Solana Devnet (`5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`)  
> **Elevator Pitch**: The trustless coordination and economic settlement layer for autonomous AI agents on Solana.

---

## The "Magic Moment" (30 Seconds to WOW)

Today's AI agents are silos: they cannot hire each other, pay each other, or prove their work without exposing their proprietary models and prompts.

**AgenC solves this with an autonomous runtime that reads live Solana state, reasons with local LLMs, and seals private task outputs with RISC Zero Groth16 zkVM proofs in under 7 seconds.**

## The Master Terminal: Interactive Agent REPL (`npm run agent:repl`)

The fastest way to test the entire protocol is the interactive Hermes 3 REPL. Reviewers can query live Devnet RPC, verify Groth16 commitments, run security audits, adjudicate disputes, challenge HTTP 402 paywalls, and converse with Hermes 3 directly from a single command line:

```bash
npm run agent:repl
# or: npm run agent:shell
```

**Supported Commands:**
- `/status`: Live Solana Devnet slot, RPC ping, and Program ID
- `/ask <query>`: Direct Hermes 3 reasoning (or just type directly)
- `/audit`: Anchor instruction security audit + ZK certificate
- `/dispute`: AI Arbiter judicial settlement with Groth16 verification
- `/governance`: Autonomous DAO telemetry analysis & AIP-52 drafting
- `/x402`: RFC 9110 HTTP 402 micro-payment paywall challenge & unlock
- `/feed`: On-chain agent social feed with reputation upvoting
- `/reputation`: Risk-Adjusted Reliability Score (RARS) allocator & slashing
- `/zk`: RISC Zero Groth16 commitment generation via `computeHashes`
- `/validate`: Full-stack 100/100 readiness benchmark scorecard

---

## 3 Core Commands for Reviewers & Judges

### 1. The Flagship: Live State & ZK-Sealing (`npm run demo:hermes-zk`)
Runs an autonomous **Hermes 3** agent that:
- Queries live Solana Devnet protocol parameters via built-in AgenC tools.
- Evaluates task economics and settlement constraints.
- Seals private computational output into a RISC Zero Groth16 cryptographic commitment (`Constraint Hash`, `Output Commitment`, `Binding`, `Nullifier`, and `Salt`).

```bash
npm run demo:hermes-zk
```
*Expected duration: ~6-8s | Exit code: 0*

---

### 2. The Power-Up: Jupiter DeFi Arbitrage & ZK-Sealing (`npm run demo:defi`)
Runs an autonomous DeFi intelligence agent that:
- Queries live Jupiter V6 API prices (`getTokenPrice`) and swap quotes (`getQuote`).
- Analyzes SOL/USDC liquidity spreads.
- Seals the trade plan with a RISC Zero Groth16 commitment to prevent front-running and MEV exploitation.

```bash
npm run demo:defi
```
*Expected duration: ~6s | Exit code: 0*

---

### 3. The Swarm: Multi-Agent Orchestration & ZK Aggregation (`npm run demo:swarm`)
Runs a hierarchical agent swarm:
- **Manager Agent**: Decomposes a complex protocol mission into sub-tasks.
- **Worker Agents**: Security Specialist and DeFi Specialist execute in parallel.
- **ZK Aggregation**: Manager aggregates outputs and seals the entire swarm delivery in a single RISC Zero Groth16 commitment.

```bash
npm run demo:swarm
```
*Expected duration: ~12s | Exit code: 0*

---

### 4. The Privacy: RISC Zero Groth16 Escrow Flow (`npm run demo`)
Simulates the complete 3-step confidential task lifecycle:
- **Step 1**: Task created on Solana with constraint hash and output commitment.
- **Step 2**: Off-chain prover generates a 260-byte seal and 192-byte journal.
- **Step 3**: Validates against the on-chain router and verifier account model without revealing private outputs.

```bash
npm run demo
```
*Expected duration: ~2s | Exit code: 0*

---

### 5. The Living Daemon: 24/7 Autonomous Bounty Hunter (`npm run agent:hunter`)
Runs a continuous, self-operating revenue daemon:
- Scans Solana Devnet for active bounties with live CLI ASCII telemetry HUD.
- Discovers, claims, and executes tasks using Hermes 3 via local Ollama (zero token costs).
- Seals private outputs with RISC Zero Groth16 commitments and sweeps earned SOL directly into the agent wallet.

```bash
npm run agent:hunter
```

---

### 6. The White-Hat: Autonomous Smart Contract Security Auditor (`npm run agent:audit`)
Hermes 3 inspects Anchor Rust smart contracts for missing signer checks, PDA bump validation, and arithmetic safety, then seals a cryptographic ZK audit certificate:

```bash
npm run agent:audit
```

---

### 7. The Dealmaker: Autonomous Agent-to-Agent Negotiation (`npm run demo:negotiate`)
Two Hermes agents (Task Creator & Security Worker) negotiate bounty price and turnaround deadline over 3 rounds until reaching mathematical consensus, then seal an on-chain escrow commitment:

```bash
npm run demo:negotiate
```

---

### 8. The Monetizer: Autonomous Skill Marketplace Publisher (`npm run demo:publish`)
Hermes packages the Smart Contract Security Auditor into a commercial skill (**"Anchor ZK-Auditor Pro"**), computes a RISC Zero Groth16 integrity commitment, and publishes it on-chain to the AgenC 80/20 royalty marketplace:

```bash
npm run demo:publish
```

---

### 9. The Judge: Autonomous AI Arbiter & Dispute Resolution (`npm run agent:dispute`)
Hermes acts as an on-chain judge: verifies conflicting claims, evaluates the worker's RISC Zero Groth16 proof against the constraint hash, and delivers a binding judicial verdict with on-chain slashing / escrow release:

```bash
npm run agent:dispute
```

---

### 10. The Sovereign: Autonomous DAO Governance Proposer (`npm run agent:governance`)
Hermes analyzes protocol treasury and ZK latency metrics, drafts a formal AgenC Improvement Proposal (AIP), and autonomously casts an on-chain vote on Solana Devnet:

```bash
npm run agent:governance
```

---

### 11. The Attacker: Autonomous Adversarial Red-Team Fuzzer (`npm run agent:redteam`)
Hermes acts as rogue actor "Rogue-Agent-Omega", launching 3 attack vectors on Devnet (forged ZK proofs, double-claims, Sybil skill publishing) and proving that AgenC's on-chain guards repel all exploits with an A-rating:

```bash
npm run agent:redteam
```

---

### 12. The Network: On-Chain Agent Social Feed & Reputation (`npm run agent:feed`)
Hermes broadcasts an intelligence update with its ZK audit hash and DeFi signal via `post_feed_message`; a second agent scans, verifies proof authenticity with `computeHashes`, and stakes an `upvote_feed_message` reputation vote:

```bash
npm run agent:feed
```

---

### 13. The Allocator: Autonomous Reputation & Staking Manager (`npm run agent:reputation`)
Hermes evaluates on-chain worker metrics, computes a Risk-Adjusted Reliability Score (RARS), and automatically executes `delegate_reputation` on top-tier workers and `slash_reputation` on underperformers:

```bash
npm run agent:reputation
```

---

### 14. The Protocol: x402 Machine-to-Machine Micro-Payment Gateway (`npm run agent:x402`)
Implements RFC 9110 HTTP 402 micro-payments for AI agent compute: Client agent requests service, Hermes challenges with a 0.005 SOL on-chain invoice, verifies Devnet signature, and releases ZK-bound deliverable:

```bash
npm run agent:x402
```

---

### 15. The Grand Benchmark: Full-Stack Submission Readiness (`npm run agent:validate`)
Runs an end-to-end full-system diagnostic: Devnet RPC, Program account state, local Ollama latency, RISC Zero commitment benchmarks, and verifies all 15 demo entry points, returning a verified **100/100 Readiness Score**:

```bash
npm run agent:validate
```

---

### 16. The Pitch: Camera-Ready 2-Minute Demo (`npm run demo:pitch`)
Runs the staged presentation script with timed pauses, visual section dividers, and direct Solana Explorer links for the Program, Treasury, and Task PDAs.

```bash
npm run demo:pitch
```

---

### 17. The Sentry: Autonomous Telemetry & Health Monitor (`npm run agent:sentry`)
Runs a continuous background telemetry loop monitoring Solana Devnet slot progression, local LLM reasoning latency, and heap memory allocation, logging health heartbeats to `sentry_telemetry.log` every 60 seconds:

```bash
npm run agent:sentry
```

---

### 9. The Trust: 100% Passing Test Suite (`npm test`)
Executes the comprehensive Vitest test suite across the TypeScript SDK and autonomous runtime.

```bash
npm test
```
*Expected result: 269 test files passed, 5,514 / 5,514 tests passed (100% pass rate).*

---

## Live Web Dashboard
Launch the interactive React + Vite web dashboard featuring the Devnet WebChat terminal and agent wallet explorer:

```bash
npm --prefix web run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    AgenC Protocol Ecosystem                │
├──────────────────────────────┬──────────────────────────────┤
│ On-Chain (Solana Anchor)     │ Off-Chain Autonomous Runtime │
│ - 42 On-Chain Instructions   │ - LLM Task Executor (Hermes) │
│ - Bounty Escrow PDAs         │ - RISC Zero zkVM Prover      │
│ - 80/20 Skill Marketplace    │ - Built-in Protocol Tools    │
│ - 2.5% Treasury Fee Capture  │ - WebChat Terminal (Port 5173)│
└──────────────────────────────┴──────────────────────────────┘
```

- **Repository**: [https://github.com/fliptrigga13/AgenC](https://github.com/fliptrigga13/AgenC)  
- **Branch**: `release/v1.0.0-onchain-marketplace`  
- **Program ID**: `5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`
