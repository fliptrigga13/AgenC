# mainnet-readonly

Read-only example that touches the **live** AgenC marketplace program on
Solana mainnet (`agenc-coordination`,
`HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK`) using the public
[`@tetsuo-ai/marketplace-sdk`](https://www.npmjs.com/package/@tetsuo-ai/marketplace-sdk)
read APIs.

It does two things:

1. Verifies the marketplace program account is live and executable on mainnet.
2. Lists directly-claimable tasks through the SDK's trustless
   `getProgramAccounts` read path.

**No private keys. No signing. No transactions.** Read-only RPC calls only.

```bash
npm run example:mainnet-readonly
# or, from this directory:
npx tsx index.ts
```

`getProgramAccounts` is disabled or restricted on many free public RPC
endpoints (including `api.mainnet-beta.solana.com`). If the task listing is
refused, the example says so and exits cleanly — point `AGENC_RPC_URL` at a
gPA-enabled endpoint (Helius, QuickNode, Triton, ...) to see live tasks:

```bash
AGENC_RPC_URL=https://your-gpa-enabled-rpc npx tsx index.ts
```
