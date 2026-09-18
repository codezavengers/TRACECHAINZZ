import type { Chain } from "../src/lib/types";
import type { LiveProbeResponse, ProviderHealth } from "./types";
import { checkBitcoinHealth, probeBitcoinAddress, isValidBitcoinAddress } from "./bitcoin";
import { checkEvmHealth, probeEvmAddress, isValidEvmAddress } from "./evm";
import { checkSolanaHealth, probeSolanaAddress, isValidSolanaAddress } from "./solana";
import { checkTronHealth, probeTronAddress, isValidTronAddress } from "./tron";
import { attributeVasp } from "./vasp";
import { analyzePatternsAndRisk } from "./patterns";
import { generateEvidenceChain } from "./evidence";
import { getChainConfig } from "./config";

let cachedHealth: { data: Record<Chain, ProviderHealth>; timestamp: number } | null = null;
const HEALTH_CACHE_TTL_MS = 15_000; // 15s cache to prevent hammering RPCs and client aborts

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback()), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

export async function checkAllProvidersHealth(): Promise<Record<Chain, ProviderHealth>> {
  const now = Date.now();
  if (cachedHealth && now - cachedHealth.timestamp < HEALTH_CACHE_TTL_MS) {
    return cachedHealth.data;
  }

  const chains: Chain[] = [
    "bitcoin",
    "ethereum",
    "polygon",
    "bsc",
    "arbitrum",
    "optimism",
    "base",
    "avalanche",
    "solana",
    "tron",
  ];

  const results = await Promise.allSettled(
    chains.map(async (chain) => {
      const cfg = getChainConfig(chain);
      const fallbackHealth = (): ProviderHealth => ({
        chain,
        name: cfg.name,
        provider: `${cfg.name} Node`,
        configured: cfg.isCustomRpc,
        reachable: false,
        status: "TIMEOUT",
        dataSource: "RAW_RPC",
        latencyMs: 3500,
        fetchedAt: new Date().toISOString(),
        capabilities: {
          nativeBalance: false,
          tokenTransfers: false,
          historicalSearch: false,
          contractCode: false,
          utxo: chain === "bitcoin",
        },
        error: "Provider health check timed out after 3.5s",
      });

      return withTimeout(
        (async () => {
          switch (chain) {
            case "bitcoin":
              return checkBitcoinHealth();
            case "solana":
              return checkSolanaHealth();
            case "tron":
              return checkTronHealth();
            default:
              return checkEvmHealth(chain);
          }
        })(),
        3500,
        fallbackHealth
      );
    })
  );

  const healthMap: Partial<Record<Chain, ProviderHealth>> = {};
  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    const res = results[i];
    if (res.status === "fulfilled") {
      healthMap[chain] = res.value;
    } else {
      const cfg = getChainConfig(chain);
      healthMap[chain] = {
        chain,
        name: cfg.name,
        provider: `${cfg.name} Node`,
        configured: cfg.isCustomRpc,
        reachable: false,
        status: "UNAVAILABLE",
        dataSource: "RAW_RPC",
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        capabilities: {
          nativeBalance: false,
          tokenTransfers: false,
          historicalSearch: false,
          contractCode: false,
          utxo: chain === "bitcoin",
        },
        error: res.reason?.message || "Health check failed",
      };
    }
  }

  const finalMap = healthMap as Record<Chain, ProviderHealth>;
  cachedHealth = { data: finalMap, timestamp: Date.now() };
  return finalMap;
}

export function detectChainForAddress(address: string): Chain[] {
  const clean = address.trim();
  const matched: Chain[] = [];

  if (isValidBitcoinAddress(clean)) {
    matched.push("bitcoin");
  }
  if (isValidTronAddress(clean)) {
    matched.push("tron");
  }
  if (isValidSolanaAddress(clean)) {
    matched.push("solana");
  }
  if (isValidEvmAddress(clean)) {
    // 0x40 address is syntactically valid on all EVM chains
    matched.push("ethereum", "polygon", "bsc", "arbitrum", "optimism", "base", "avalanche");
  }

  return matched;
}

export async function runLiveInvestigation(
  address: string,
  requestedChain?: Chain,
  caseId: string = "CASE-LIVE"
): Promise<LiveProbeResponse> {
  const clean = address.trim();

  // Determine target chain
  let chain: Chain = requestedChain || "ethereum";

  if (!requestedChain) {
    if (isValidBitcoinAddress(clean)) chain = "bitcoin";
    else if (isValidTronAddress(clean)) chain = "tron";
    else if (isValidSolanaAddress(clean)) chain = "solana";
    else if (isValidEvmAddress(clean)) chain = "ethereum";
  }

  // 1. Dispatch probe to chain-specific engine
  let partial: Partial<LiveProbeResponse>;
  switch (chain) {
    case "bitcoin":
      partial = await probeBitcoinAddress(clean);
      break;
    case "solana":
      partial = await probeSolanaAddress(clean);
      break;
    case "tron":
      partial = await probeTronAddress(clean);
      break;
    default:
      partial = await probeEvmAddress(clean, chain);
      break;
  }

  const txs = partial.transactions || [];
  const balance = partial.balanceNative || 0;
  const isContract = Boolean(partial.isContract);

  // 2. Attribution & Pattern Analysis
  const vasp = attributeVasp(clean, chain, txs);
  const { patterns, risk, fundFlow } = analyzePatternsAndRisk(clean, chain, txs, balance, isContract);

  // 3. Evidence Chain & Timeline
  const { evidence, timeline } = generateEvidenceChain(
    caseId,
    clean,
    chain,
    partial.provider || "Direct Node",
    partial.blockHeight,
    txs.length,
    vasp.vaspName,
    risk.score
  );

  return {
    address: clean,
    chain,
    isValid: partial.isValid ?? true,
    isContract,
    status: partial.status || "LIVE",
    dataSource: partial.dataSource || "RAW_RPC",
    provider: partial.provider || "Direct Blockchain Node",
    queriedAt: partial.queriedAt || new Date().toISOString(),
    balanceNative: balance,
    balanceFormatted: partial.balanceFormatted || "0.00",
    ticker: partial.ticker || "ETH",
    usdValue: partial.usdValue ?? null,
    inrValue: partial.inrValue ?? null,
    txCount: partial.txCount || txs.length,
    blockHeight: partial.blockHeight,
    tokens: partial.tokens || [],
    transactions: txs,
    fundFlow,
    patterns,
    risk,
    vasp,
    evidence,
    timeline,
    limitations: partial.limitations,
    error: partial.error,
  };
}
