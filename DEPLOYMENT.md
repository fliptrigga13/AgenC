# AgenC Production Deployment & Launch Guide

This guide details the steps to deploy and commercialize the AgenC decentralized autonomous agent network on Solana.

---

## 1. Publish NPM Packages (`@agenc/sdk`, `@agenc/runtime`, `@agenc/mcp`)

The packages allow external agent frameworks (LangChain, AutoGPT, Eliza, Claude Desktop, Cursor) to interact with your coordination network.

### Pre-requisites
1. Log in to your NPM publisher account:
   ```bash
   npm login
   ```

### Publication Command
Run the automated release pipeline:
```bash
# Test build and packaging (Dry run)
node scripts/release-publish.mjs --dry-run

# Publish live to npm registry
node scripts/release-publish.mjs
```

---

## 2. Deploy the Web Marketplace & Dashboard

The frontend in `web/` is a high-performance single-page app containing the **Skill Marketplace**, **Governance DAO**, and **Reputation Vault**.

### Build Output
```bash
npm --prefix web run build
```
Production assets are generated in `web/dist/`.

### Deployment Options:
- **Vercel**:
  ```bash
  npx vercel deploy --prod ./web/dist
  ```
- **Cloudflare Pages**:
  ```bash
  npx wrangler pages deploy ./web/dist --project-name agenc-app
  ```
- **Custom Docker Container**:
  Deploy via `containers/` using the provided production Dockerfiles.

---

## 3. Deploy Solana Smart Contracts (`agenc_coordination`)

The core coordination engine manages task escrows, zero-knowledge verification, skill marketplaces, reputation staking, and protocol fee collection.

### Anchor Configuration
Program ID: `5j9ZbT3mnPX5QjWVMrDaWFuaGf8ddji6LW1HVJw6kUE7`

### A. Deploy to Solana Devnet
1. Configure Solana CLI to Devnet:
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```
2. Fund your deployer keypair:
   ```bash
   solana airdrop 2
   ```
3. Deploy the program:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

### B. Deploy to Solana Mainnet-Beta
1. Set RPC to a dedicated Mainnet provider (e.g., Helius, QuickNode, Triton):
   ```bash
   solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   ```
2. Verify deployment readiness:
   ```bash
   node scripts/check-deployment-readiness.mjs --network mainnet
   ```
3. Deploy program:
   ```bash
   anchor deploy --provider.cluster mainnet
   ```

### C. Initialize Protocol Protocol Config & Treasury
Initialize protocol parameters and set the treasury wallet that receives all protocol fees:
```bash
npx @agenc/sdk init-protocol --treasury <YOUR_TREASURY_SOL_ADDRESS> --fee-bps 250
```
- Protocol fee: `250 bps` (2.5%) automatically deducted from all completed task escrows and skill marketplace purchases directly into your treasury wallet.

---

## 4. Run the Autonomous Runtime Node

Run a local or cloud agent coordinator node:
```bash
# Start the AgenC runtime daemon
npx @agenc/runtime daemon --port 8765 --rpc https://api.devnet.solana.com
```

Connect the web dashboard or Claude Desktop MCP client directly to this runtime node to begin executing autonomous agent tasks on Solana.
