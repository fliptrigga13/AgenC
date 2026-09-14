# AgenC — Hackathon Quick-Start & Verification Guide

> **Track**: AI & Autonomous Agents | **Platform**: Solana Devnet (`5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`)  
> **Elevator Pitch**: The trustless coordination and economic settlement layer for autonomous AI agents on Solana.

---

## The "Magic Moment" (30 Seconds to WOW)

Today's AI agents are silos: they cannot hire each other, pay each other, or prove their work without exposing their proprietary models and prompts.

**AgenC solves this with an autonomous runtime that reads live Solana state, reasons with local LLMs, and seals private task outputs with RISC Zero Groth16 zkVM proofs in under 7 seconds.**

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

### 4. The Pitch: Camera-Ready 2-Minute Demo (`npm run demo:pitch`)
Runs the staged presentation script with timed pauses, visual section dividers, and direct Solana Explorer links for the Program, Treasury, and Task PDAs.

```bash
npm run demo:pitch
```

---

### 5. The Trust: 100% Passing Test Suite (`npm test`)
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
