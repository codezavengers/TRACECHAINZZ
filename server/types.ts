import type { Chain } from "../src/lib/types";

export type DataSourceType = "RAW_RPC" | "LIVE_NATIVE_API" | "CACHED" | "MOCK";
export type ProviderStatusType =
  | "LIVE"
  | "DEGRADED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "CONFIGURATION_REQUIRED"
  | "UNSUPPORTED_WITH_CURRENT_RPC";

export interface ProviderHealth {
  chain: Chain;
  name: string;
  provider: string;
  configured: boolean;
  reachable: boolean;
  status: ProviderStatusType;
  dataSource: DataSourceType;
  latestBlock?: number;
  blockHeight?: number;
  slot?: number;
  latencyMs: number;
  fetchedAt: string;
  gasOrFee?: string;
  capabilities: {
    nativeBalance: boolean;
    tokenTransfers: boolean;
    historicalSearch: boolean;
    contractCode: boolean;
    utxo: boolean;
  };
  error?: string;
}

export interface NormalizedTransaction {
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
  feeFormatted?: string;
  status: "CONFIRMED" | "PENDING" | "FAILED";
  confirmations?: number;
  provider: string;
  dataSource: DataSourceType;
  fetchedAt: string;
}

export interface TokenBalanceItem {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: string;
  balanceFormatted: string;
  balanceNumber: number;
  usdValue?: number | null;
}

export interface DetectedPattern {
  id: string;
  name: string;
  typology: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  confidence: number;
  evidenceTxHashes: string[];
  metrics?: Record<string, any>;
}

export interface VaspAttribution {
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
}

export interface RiskAnalysis {
  score: number;
  band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  threatCategory: string;
  factors: {
    title: string;
    description: string;
    weight: number;
    supportingTxs?: string[];
  }[];
  explanation: string;
}

export interface EvidenceRecordItem {
  id: string;
  investigationId: string;
  title: string;
  type: string;
  contentHash: string;
  algorithm: "SHA-256";
  timestamp: string;
  actor: string;
  metadata: Record<string, any>;
}

export interface FundFlowSummary {
  incomingTotal: number;
  incomingCount: number;
  outgoingTotal: number;
  outgoingCount: number;
  netFlow: number;
  primaryCounterparties: {
    address: string;
    direction: "IN" | "OUT";
    totalAmount: number;
    txCount: number;
    isContract?: boolean;
    knownVasp?: string;
  }[];
}

export interface LiveProbeResponse {
  address: string;
  chain: Chain;
  isValid: boolean;
  isContract: boolean;
  status: ProviderStatusType;
  dataSource: DataSourceType;
  provider: string;
  queriedAt: string;
  balanceNative: number;
  balanceFormatted: string;
  ticker: string;
  usdValue: number | null;
  inrValue: number | null;
  txCount: number;
  blockHeight?: number;
  tokens: TokenBalanceItem[];
  transactions: NormalizedTransaction[];
  fundFlow: FundFlowSummary;
  patterns: DetectedPattern[];
  risk: RiskAnalysis;
  vasp: VaspAttribution;
  evidence: EvidenceRecordItem[];
  timeline: {
    step: number;
    title: string;
    description: string;
    timestamp: string;
    stage: string;
  }[];
  limitations?: string[];
  error?: string;
}
