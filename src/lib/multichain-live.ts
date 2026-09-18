// Multi-Chain Live Blockchain Telemetry & Probe Engine
// Connects authoritatively to direct JSON-RPC and native blockchain nodes via TraceChain Server API:
// Bitcoin Core, Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, Solana, TRON.
// All requests are routed through verified server-side endpoints without third-party explorer dependencies.

import type { Chain } from "@/lib/types";

export type DataSourceType = "RAW_RPC" | "LIVE_NATIVE_API" | "CACHED" | "MOCK";
export type ProviderStatusType =
  | "LIVE"
  | "DEGRADED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "CONFIGURATION_REQUIRED"
  | "UNSUPPORTED_WITH_CURRENT_RPC";

export interface CryptoPrice {
  usd: number;
  inr: number;
  usd24hChange?: number;
}

export interface LiveMarketPrices {
  bitcoin: CryptoPrice;
  ethereum: CryptoPrice;
  solana: CryptoPrice;
  tron: CryptoPrice;
  binancecoin: CryptoPrice;
  matic: CryptoPrice;
  lastUpdated: string;
}

export interface LiveProviderTelemetry {
  chain: Chain;
  name: string;
  blockHeight: number;
  latencyMs: number;
  status: ProviderStatusType;
  providerEndpoint: string;
  gasOrFee?: string;
  lastUpdated: string;
  configured: boolean;
  capabilities?: {
    nativeBalance: boolean;
    tokenTransfers: boolean;
    historicalSearch: boolean;
    contractCode: boolean;
    utxo: boolean;
  };
  error?: string;
}

export interface NormalizedTx {
  transactionHash: string;
  chain: Chain;
  blockNumber?: number;
  timestamp?: string;
  from: string;
  to: string;
  asset: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  amount: number;
  amountUsd?: number | null;
  direction: "INCOMING" | "OUTGOING" | "SELF" | "CONTRACT_CALL";
  fee?: number | string;
  status: "CONFIRMED" | "PENDING" | "FAILED";
  confirmations?: number;
  provider: string;
  dataSource: DataSourceType;
  fetchedAt: string;
}

export interface TokenItem {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: string;
  balanceFormatted: string;
  balanceNumber: number;
  usdValue?: number | null;
}

export interface LiveAddressProbeResult {
  address: string;
  chain: Chain;
  isValid: boolean;
  isContract?: boolean;
  status: ProviderStatusType;
  dataSource: DataSourceType;
  provider: string;
  balanceNative: number;
  balanceFormatted: string;
  ticker: string;
  usdValue: number;
  inrValue: number;
  txCount: number;
  networkFeeRate?: string;
  blockHeight?: number;
  explorerUrl?: string;
  source: string;
  isLive: boolean;
  queriedAt: string;
  tokens: TokenItem[];
  transactions: NormalizedTx[];
  fundFlow?: {
    incomingTotal: number;
    incomingCount: number;
    outgoingTotal: number;
    outgoingCount: number;
    netFlow: number;
    primaryCounterparties: Array<{
      address: string;
      direction: "IN" | "OUT";
      totalAmount: number;
      txCount: number;
      isContract?: boolean;
      knownVasp?: string;
    }>;
  };
  patterns?: Array<{
    id: string;
    name: string;
    typology: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    confidence: number;
    evidenceTxHashes: string[];
  }>;
  risk?: {
    score: number;
    band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    threatCategory: string;
    factors: Array<{
      title: string;
      description: string;
      weight: number;
      supportingTxs?: string[];
    }>;
    explanation: string;
  };
  vasp?: {
    status: "VERIFIED" | "PROBABLE" | "BEHAVIORAL" | "UNKNOWN";
    vaspName?: string;
    legalEntity?: string;
    category?: "CENTRALIZED_EXCHANGE" | "PAYMENT_PROCESSOR" | "MIXER_PRIVACY" | "BRIDGE_PROTOCOL" | "UNKNOWN";
    clusterAddress?: string;
    hopDistance?: number;
    confidenceScore: number;
    evidenceSummary: string;
    subpoenaFormat?: string;
    complianceContact?: string;
    jurisdiction?: string;
    recommendedLegalAction?: string;
  };
  evidence?: Array<{
    id: string;
    investigationId: string;
    title: string;
    type: string;
    contentHash: string;
    algorithm: "SHA-256";
    timestamp: string;
    actor: string;
    metadata: Record<string, any>;
  }>;
  timeline?: Array<{
    step: number;
    title: string;
    description: string;
    timestamp: string;
    stage: string;
  }>;
  limitations?: string[];
  error?: string;
  // Compatibility helper for legacy views
  recentTxs?: Array<{
    txid: string;
    confirmed: boolean;
    blockHeight?: number;
    blockTime?: string;
    amount: number;
    amountUsd: number;
    incoming: boolean;
    feeFormatted?: string;
  }>;
}

function cleanCryptoPrice(p: any): CryptoPrice {
  if (!p) return { usd: 0, inr: 0 };
  return {
    usd: typeof p.usd === "number" ? p.usd : 0,
    inr: typeof p.inr === "number" ? p.inr : (typeof p.usd === "number" ? p.usd * 86.5 : 0),
    usd24hChange: typeof p.usd24hChange === "number" ? p.usd24hChange : undefined,
  };
}

export async function fetchLiveMarketPrices(): Promise<LiveMarketPrices> {
  try {
    const res = await fetch("/api/blockchain/prices", { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const p = data.prices || {};
      return {
        bitcoin: cleanCryptoPrice(p.bitcoin),
        ethereum: cleanCryptoPrice(p.ethereum),
        solana: cleanCryptoPrice(p.solana),
        tron: cleanCryptoPrice(p.tron),
        binancecoin: cleanCryptoPrice(p.bsc),
        matic: cleanCryptoPrice(p.polygon),
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch {
    // Graceful fallback if backend temporarily restarting or network paused
  }

  return {
    bitcoin: { usd: 0, inr: 0 },
    ethereum: { usd: 0, inr: 0 },
    solana: { usd: 0, inr: 0 },
    tron: { usd: 0, inr: 0 },
    binancecoin: { usd: 0, inr: 0 },
    matic: { usd: 0, inr: 0 },
    lastUpdated: new Date().toISOString(),
  };
}

let lastKnownProvidersCache: Record<Chain, LiveProviderTelemetry> | null = null;

export async function fetchLiveAllChainProviders(): Promise<Record<Chain, LiveProviderTelemetry>> {
  try {
    const res = await fetch("/api/blockchain/health", { signal: AbortSignal.timeout(12000) });
    if (res.ok) {
      const data = await res.json();
      const providers = data.providers || {};
      const result: Partial<Record<Chain, LiveProviderTelemetry>> = {};

      for (const [chainKey, p] of Object.entries(providers)) {
        const item = p as any;
        result[chainKey as Chain] = {
          chain: item.chain,
          name: item.name,
          blockHeight: item.blockHeight || item.latestBlock || 0,
          latencyMs: item.latencyMs || 0,
          status: item.status,
          providerEndpoint: item.provider,
          gasOrFee: item.gasOrFee,
          lastUpdated: item.fetchedAt || new Date().toISOString(),
          configured: item.configured,
          capabilities: item.capabilities,
          error: item.error,
        };
      }

      const verified = result as Record<Chain, LiveProviderTelemetry>;
      lastKnownProvidersCache = verified;
      return verified;
    }
  } catch (err: any) {
    // Only log non-abort/timeout errors as gentle warnings to prevent console error noise on component unmount
    if (err?.name !== "AbortError" && err?.name !== "TimeoutError" && !err?.message?.includes("aborted")) {
      console.warn("fetchLiveAllChainProviders:", err?.message || err);
    }
  }

  if (lastKnownProvidersCache) {
    return lastKnownProvidersCache;
  }

  // Graceful failure return
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
  const fallback: Partial<Record<Chain, LiveProviderTelemetry>> = {};
  for (const c of chains) {
    fallback[c] = {
      chain: c,
      name: c.toUpperCase(),
      blockHeight: 0,
      latencyMs: 0,
      status: "UNAVAILABLE",
      providerEndpoint: "Server Endpoint Connection Error",
      lastUpdated: new Date().toISOString(),
      configured: false,
    };
  }
  return fallback as Record<Chain, LiveProviderTelemetry>;
}

export async function probeLiveAddress(
  rawAddress: string,
  chainHint?: Chain,
  caseId: string = "CASE-LIVE"
): Promise<LiveAddressProbeResult> {
  const addr = rawAddress.trim();

  try {
    const res = await fetch("/api/blockchain/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr, chain: chainHint, caseId }),
      signal: AbortSignal.timeout(9000),
    });

    if (res.ok) {
      const data = await res.json();
      const p = data.probe;

      // Map normalized transactions to legacy recentTxs for backward compatibility
      const recentTxs = (p.transactions || []).map((t: NormalizedTx) => ({
        txid: t.transactionHash,
        confirmed: t.status === "CONFIRMED",
        blockHeight: t.blockNumber,
        blockTime: t.timestamp,
        amount: t.amount,
        amountUsd: t.amountUsd || 0,
        incoming: t.direction === "INCOMING",
        feeFormatted: t.fee ? `${t.fee}` : undefined,
      }));

      return {
        address: p.address,
        chain: p.chain,
        isValid: p.isValid,
        isContract: p.isContract,
        status: p.status,
        dataSource: p.dataSource,
        provider: p.provider,
        balanceNative: p.balanceNative,
        balanceFormatted: p.balanceFormatted,
        ticker: p.ticker,
        usdValue: p.usdValue ?? 0,
        inrValue: p.inrValue ?? 0,
        txCount: p.txCount,
        blockHeight: p.blockHeight,
        explorerUrl:
          p.chain === "bitcoin"
            ? `https://mempool.space/address/${addr}`
            : p.chain === "solana"
            ? `https://solscan.io/account/${addr}`
            : p.chain === "tron"
            ? `https://tronscan.org/#/address/${addr}`
            : `https://etherscan.io/address/${addr}`,
        source: `${p.provider} (${p.dataSource})`,
        isLive: p.status === "LIVE",
        queriedAt: p.queriedAt,
        tokens: p.tokens || [],
        transactions: p.transactions || [],
        fundFlow: p.fundFlow,
        patterns: p.patterns,
        risk: p.risk,
        vasp: p.vasp,
        evidence: p.evidence,
        timeline: p.timeline,
        limitations: p.limitations,
        error: p.error,
        recentTxs,
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return {
        address: addr,
        chain: chainHint || "ethereum",
        isValid: false,
        status: "UNAVAILABLE",
        dataSource: "RAW_RPC",
        provider: "TraceChain Server",
        balanceNative: 0,
        balanceFormatted: "0.00",
        ticker: "ETH",
        usdValue: 0,
        inrValue: 0,
        txCount: 0,
        source: "TraceChain Server Error",
        isLive: false,
        queriedAt: new Date().toISOString(),
        tokens: [],
        transactions: [],
        error: errJson.error || `Server responded with HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      address: addr,
      chain: chainHint || "ethereum",
      isValid: false,
      status: "TIMEOUT",
      dataSource: "RAW_RPC",
      provider: "TraceChain Server",
      balanceNative: 0,
      balanceFormatted: "0.00",
      ticker: "ETH",
      usdValue: 0,
      inrValue: 0,
      txCount: 0,
      source: "Connection Timeout",
      isLive: false,
      queriedAt: new Date().toISOString(),
      tokens: [],
      transactions: [],
      error: `Network timeout querying TraceChain probe API: ${err.message}`,
    };
  }
}
