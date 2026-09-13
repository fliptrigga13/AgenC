/**
 * In-House DexScreener Token Discovery & Market Intelligence Tools.
 *
 * Provides real-time Solana token search, liquidity analysis, trending token feeds,
 * and ticker resolution using public DEX APIs with zero external dependencies.
 *
 * @module
 */

import type { Tool, ToolResult } from "../types.js";
import { safeStringify } from "../types.js";
import type { Logger } from "../../utils/logger.js";

export const DEXSCREENER_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search";
export const DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens";
export const DEXSCREENER_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/top/v1";

/**
 * Common canonical Solana mints for instant ticker resolution.
 */
export const WELL_KNOWN_SOLANA_MINTS: Record<string, { mint: string; symbol: string; decimals: number }> = {
  SOL: {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    decimals: 9,
  },
  WSOL: {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "WSOL",
    decimals: 9,
  },
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    decimals: 6,
  },
  USDT: {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    symbol: "USDT",
    decimals: 6,
  },
  JUP: {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
    decimals: 6,
  },
  BONK: {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    decimals: 5,
  },
  WIF: {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    decimals: 6,
  },
  RAY: {
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    symbol: "RAY",
    decimals: 6,
  },
  PYTH: {
    mint: "HZ1JovNiPvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    symbol: "PYTH",
    decimals: 6,
  },
  RENDER: {
    mint: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
    symbol: "RENDER",
    decimals: 8,
  },
};

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
    m5?: number;
  };
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
}

export interface DexScreenerToolsConfig {
  logger?: Logger;
  fetchFn?: typeof fetch;
}

/**
 * Creates tools for token discovery and DEX market scanning.
 */
export function createDexScreenerTools(config: DexScreenerToolsConfig = {}): Tool[] {
  const customFetch = config.fetchFn ?? fetch;
  const logger = config.logger;

  // Tool 1: Search Tokens
  const searchTool: Tool = {
    name: "dex_search_tokens",
    description:
      "Search for live Solana tokens, trading pairs, liquidity, and prices on DexScreener by symbol or name (e.g. 'SOL', 'JUP', 'BONK', 'AI')",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Token symbol, name, or keywords to search for",
        },
        chain: {
          type: "string",
          description: "Blockchain network filter (default: 'solana')",
        },
        limit: {
          type: "number",
          description: "Maximum number of pairs to return (default: 10, max: 30)",
        },
      },
      required: ["query"],
    },
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const query = String(args.query ?? "").trim();
      const chainFilter = String(args.chain ?? "solana").toLowerCase();
      const limit = Math.min(Math.max(1, Number(args.limit ?? 10)), 30);

      if (!query) {
        return {
          content: safeStringify({ error: "Search query is required" }),
          isError: true,
        };
      }

      try {
        const url = `${DEXSCREENER_SEARCH_URL}?q=${encodeURIComponent(query)}`;
        const res = await customFetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          return {
            content: safeStringify({
              error: `DexScreener search returned HTTP ${res.status}`,
            }),
            isError: true,
          };
        }

        const data = (await res.json()) as { pairs?: DexScreenerPair[] };
        const allPairs = data.pairs ?? [];

        // Filter by chain (default solana) if chain is specified
        const filtered = chainFilter
          ? allPairs.filter((p) => p.chainId?.toLowerCase() === chainFilter)
          : allPairs;

        const results = filtered.slice(0, limit).map((p) => ({
          chain: p.chainId,
          dex: p.dexId,
          pairAddress: p.pairAddress,
          baseToken: {
            mint: p.baseToken?.address,
            name: p.baseToken?.name,
            symbol: p.baseToken?.symbol,
          },
          quoteToken: {
            mint: p.quoteToken?.address,
            symbol: p.quoteToken?.symbol,
          },
          priceUsd: p.priceUsd ?? "N/A",
          priceChange24h: p.priceChange?.h24 ?? 0,
          priceChange1h: p.priceChange?.h1 ?? 0,
          volume24hUsd: p.volume?.h24 ?? 0,
          liquidityUsd: p.liquidity?.usd ?? 0,
          fdvUsd: p.fdv ?? 0,
          url: p.url,
        }));

        return {
          content: safeStringify({
            query,
            chain: chainFilter,
            matchCount: results.length,
            tokens: results,
          }),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger?.error?.("dex_search_tokens error:", err);
        return {
          content: safeStringify({ error: `Failed to search tokens: ${msg}` }),
          isError: true,
        };
      }
    },
  };

  // Tool 2: Get Token Pairs / Market Depth
  const getPairsTool: Tool = {
    name: "dex_get_token_pairs",
    description:
      "Get real-time market data, liquidity pools, buy/sell volumes, and 24h trading volume for a specific token mint address on Solana",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: {
          type: "string",
          description: "Solana token mint address (base58)",
        },
      },
      required: ["tokenAddress"],
    },
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const tokenAddress = String(args.tokenAddress ?? "").trim();
      if (!tokenAddress) {
        return {
          content: safeStringify({ error: "tokenAddress is required" }),
          isError: true,
        };
      }

      try {
        const url = `${DEXSCREENER_TOKENS_URL}/${encodeURIComponent(tokenAddress)}`;
        const res = await customFetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          return {
            content: safeStringify({
              error: `DexScreener API returned HTTP ${res.status}`,
            }),
            isError: true,
          };
        }

        const data = (await res.json()) as { pairs?: DexScreenerPair[] };
        const pairs = (data.pairs ?? []).map((p) => ({
          chain: p.chainId,
          dex: p.dexId,
          pairAddress: p.pairAddress,
          baseToken: p.baseToken,
          quoteToken: p.quoteToken,
          priceUsd: p.priceUsd,
          liquidityUsd: p.liquidity?.usd ?? 0,
          volume24h: p.volume?.h24 ?? 0,
          priceChange24h: p.priceChange?.h24 ?? 0,
          transactions24h: p.txns?.h24 ?? { buys: 0, sells: 0 },
        }));

        // Sort by highest liquidity
        pairs.sort((a, b) => b.liquidityUsd - a.liquidityUsd);

        return {
          content: safeStringify({
            tokenAddress,
            pairCount: pairs.length,
            pairs,
          }),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: safeStringify({ error: `Failed to fetch pairs: ${msg}` }),
          isError: true,
        };
      }
    },
  };

  // Tool 3: Get Trending Tokens
  const getTrendingTool: Tool = {
    name: "dex_get_trending",
    description:
      "Get top boosted and trending Solana tokens currently gaining high volume and trader attention",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max tokens to return (default: 10, max: 30)",
        },
      },
    },
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const limit = Math.min(Math.max(1, Number(args.limit ?? 10)), 30);

      try {
        const res = await customFetch(DEXSCREENER_BOOSTS_URL, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          return {
            content: safeStringify({
              error: `DexScreener boosts returned HTTP ${res.status}`,
            }),
            isError: true,
          };
        }

        const data = (await res.json()) as Array<{
          url: string;
          chainId: string;
          tokenAddress: string;
          amount?: number;
          totalAmount?: number;
          icon?: string;
          description?: string;
        }>;

        const solanaTokens = (Array.isArray(data) ? data : [])
          .filter((item) => item.chainId?.toLowerCase() === "solana")
          .slice(0, limit)
          .map((item) => ({
            chain: item.chainId,
            mint: item.tokenAddress,
            totalBoostAmount: item.totalAmount ?? item.amount ?? 0,
            description: item.description ?? "",
            url: item.url,
          }));

        return {
          content: safeStringify({
            chain: "solana",
            count: solanaTokens.length,
            trending: solanaTokens,
          }),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: safeStringify({ error: `Failed to fetch trending tokens: ${msg}` }),
          isError: true,
        };
      }
    },
  };

  // Tool 4: Resolve Token Ticker
  const resolveTokenTool: Tool = {
    name: "dex_resolve_token",
    description:
      "Quickly resolve common Solana token symbols (e.g. 'SOL', 'USDC', 'JUP', 'BONK', 'WIF', 'RAY') to their canonical mint address and decimal count",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Token ticker symbol (e.g. 'SOL', 'USDC', 'JUP')",
        },
      },
      required: ["symbol"],
    },
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const sym = String(args.symbol ?? "").trim().toUpperCase();
      const match = WELL_KNOWN_SOLANA_MINTS[sym];

      if (match) {
        return {
          content: safeStringify({
            found: true,
            symbol: match.symbol,
            mint: match.mint,
            decimals: match.decimals,
          }),
        };
      }

      return {
        content: safeStringify({
          found: false,
          symbol: sym,
          message: `Symbol '${sym}' is not in well-known cache. Use 'dex_search_tokens' to find its live mint address on chain.`,
        }),
      };
    },
  };

  return [searchTool, getPairsTool, getTrendingTool, resolveTokenTool];
}
