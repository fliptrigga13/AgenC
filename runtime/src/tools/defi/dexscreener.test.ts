import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { createDexScreenerTools, WELL_KNOWN_SOLANA_MINTS } from "./dexscreener.js";

describe("DexScreener Tools", () => {
  it("creates all 4 DEX tools", () => {
    const tools = createDexScreenerTools();
    assert.equal(tools.length, 4);
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("dex_search_tokens"));
    assert.ok(names.includes("dex_get_token_pairs"));
    assert.ok(names.includes("dex_get_trending"));
    assert.ok(names.includes("dex_resolve_token"));
  });

  it("resolves well known tokens correctly", async () => {
    const tools = createDexScreenerTools();
    const resolveTool = tools.find((t) => t.name === "dex_resolve_token")!;

    const resSol = await resolveTool.execute({ symbol: "SOL" });
    const dataSol = JSON.parse(resSol.content);
    assert.equal(dataSol.found, true);
    assert.equal(dataSol.mint, WELL_KNOWN_SOLANA_MINTS.SOL.mint);

    const resJup = await resolveTool.execute({ symbol: "jup" });
    const dataJup = JSON.parse(resJup.content);
    assert.equal(dataJup.found, true);
    assert.equal(dataJup.mint, WELL_KNOWN_SOLANA_MINTS.JUP.mint);

    const resUnknown = await resolveTool.execute({ symbol: "UNKNOWN_COIN" });
    const dataUnknown = JSON.parse(resUnknown.content);
    assert.equal(dataUnknown.found, false);
  });

  it("searches tokens with mock fetch response", async () => {
    const mockPairs = [
      {
        chainId: "solana",
        dexId: "raydium",
        pairAddress: "mockPair123",
        baseToken: { address: "mintSol", name: "Solana", symbol: "SOL" },
        quoteToken: { address: "mintUsdc", name: "USD Coin", symbol: "USDC" },
        priceNative: "1",
        priceUsd: "150.25",
        volume: { h24: 1000000 },
        liquidity: { usd: 5000000 },
        priceChange: { h24: 5.2 },
        url: "https://dexscreener.com/solana/mockPair123",
      },
      {
        chainId: "ethereum",
        dexId: "uniswap",
        pairAddress: "mockEthPair",
        baseToken: { address: "mintEth", name: "Wrapped SOL", symbol: "SOL" },
        quoteToken: { address: "mintUsdt", name: "Tether", symbol: "USDT" },
        priceNative: "1",
        priceUsd: "150.20",
        volume: { h24: 50000 },
        liquidity: { usd: 100000 },
      },
    ];

    const mockFetch = async () =>
      ({
        ok: true,
        json: async () => ({ pairs: mockPairs }),
      }) as unknown as Response;

    const tools = createDexScreenerTools({ fetchFn: mockFetch });
    const searchTool = tools.find((t) => t.name === "dex_search_tokens")!;

    const res = await searchTool.execute({ query: "SOL", chain: "solana" });
    assert.equal(res.isError, undefined);
    const data = JSON.parse(res.content);
    assert.equal(data.matchCount, 1);
    assert.equal(data.tokens[0].baseToken.symbol, "SOL");
    assert.equal(data.tokens[0].priceUsd, "150.25");
  });

  it("fetches token pairs with mock fetch", async () => {
    const mockFetch = async () =>
      ({
        ok: true,
        json: async () => ({
          pairs: [
            {
              chainId: "solana",
              dexId: "meteora",
              pairAddress: "pool456",
              baseToken: { address: "mintA", symbol: "TOKENA" },
              quoteToken: { address: "mintSol", symbol: "SOL" },
              priceUsd: "0.045",
              liquidity: { usd: 250000 },
              volume: { h24: 120000 },
              priceChange: { h24: -2.5 },
            },
          ],
        }),
      }) as unknown as Response;

    const tools = createDexScreenerTools({ fetchFn: mockFetch });
    const pairsTool = tools.find((t) => t.name === "dex_get_token_pairs")!;

    const res = await pairsTool.execute({ tokenAddress: "mintA" });
    assert.equal(res.isError, undefined);
    const data = JSON.parse(res.content);
    assert.equal(data.pairCount, 1);
    assert.equal(data.pairs[0].priceUsd, "0.045");
  });

  it("fetches trending tokens with mock fetch", async () => {
    const mockBoosts = [
      {
        chainId: "solana",
        tokenAddress: "boostedMint1",
        totalAmount: 5000,
        description: "Next gen AI agent",
        url: "https://dexscreener.com/solana/boostedMint1",
      },
      {
        chainId: "base",
        tokenAddress: "baseToken1",
        totalAmount: 3000,
      },
    ];

    const mockFetch = async () =>
      ({
        ok: true,
        json: async () => mockBoosts,
      }) as unknown as Response;

    const tools = createDexScreenerTools({ fetchFn: mockFetch });
    const trendingTool = tools.find((t) => t.name === "dex_get_trending")!;

    const res = await trendingTool.execute({ limit: 5 });
    assert.equal(res.isError, undefined);
    const data = JSON.parse(res.content);
    assert.equal(data.chain, "solana");
    assert.equal(data.count, 1);
    assert.equal(data.trending[0].mint, "boostedMint1");
  });
});
