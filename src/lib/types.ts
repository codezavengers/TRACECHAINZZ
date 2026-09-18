// TraceChain Core Types & Domain Interfaces
// Supports SIH PS 26183 Autonomous Forensic Investigations & VASP Attribution

export type Chain =
  | "bitcoin"
  | "ethereum"
  | "polygon"
  | "bsc"
  | "arbitrum"
  | "optimism"
  | "base"
  | "avalanche"
  | "solana"
  | "tron";

export type DataProvenance =
  | "LIVE_BLOCKCHAIN_DATA"
  | "DEMO_DATA"
  | "KNOWN_ATTRIBUTION"
  | "PROBABLE_ATTRIBUTION"
  | "HEURISTIC_ANALYSIS"
  | "ML_PREDICTION"
  | "UNKNOWN";

export type PriceDataSource = "BINANCE" | "COINGECKO" | "CHAINLINK" | "COINBASE" | "ESTIMATED";

export type TransferType = "NATIVE" | "TOKEN" | "INTERNAL" | "CONTRACT_CALL";

export type CaseStatus =
  | "NEW"
  | "ANALYZING"
  | "TRACING"
  | "VASP_IDENTIFIED"
  | "ACTION_REQUIRED"
  | "FREEZE_REVIEW"
  | "MONITORING"
  | "CLOSED";

export type WalletKind =
  | "VICTIM"
  | "SUSPICIOUS"
  | "BURNER"
  | "VASP"
  | "EXCHANGE"
  | "BRIDGE"
  | "MIXER"
  | "DEFI"
  | "FRAUD_CLUSTER"
  | "UNKNOWN";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FraudTypology =
  | "PIG_BUTCHERING"
  | "TASK_SCAM"
  | "RANSOMWARE"
  | "PHISHING"
  | "IMPERSONATION"
  | "PONZI_SCHEME"
  | "FLASH_LOAN_EXPLOIT"
  | "RUG_PULL"
  | "MALWARE_DRAINER"
  | "INVESTMENT_FRAUD"
  | "CROSS_CHAIN_LAUNDERING"
  | "RAPID_CASHOUT"
  | "ORGANIZED_FRAUD"
  | "UNKNOWN"
  | "OTHER";

export type Role = "VIEWER" | "ANALYST" | "INVESTIGATOR" | "ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  agency?: string;
}

export interface CaseNote {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  text?: string;
  timestamp?: string;
}

export interface CaseActivity {
  id: string;
  action: string;
  detail: string;
  actor: string;
  createdAt: string;
  timestamp?: string;
}

export interface InvestigationCase {
  id: string;
  title: string;
  description?: string;
  reportedWallet: string;
  chain: Chain;
  status: CaseStatus;
  riskBand: RiskBand;
  riskScore: number;
  priorityScore: number;
  typology: FraudTypology;
  reportedLossUsd: number;
  traceableUsd: number;
  complaintRef: string;
  complaintText: string;
  investigator: string;
  recoveryProbability: number;
  extractedWallets: string[];
  connectedVictims?: number;
  provenance?: DataProvenance;
  victimName?: string;
  victimEmail?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  targetVasp?: string;
  freezeStatus?: "NOT_REQUESTED" | "SUBMITTED" | "ACKNOWLEDGED" | "ASSETS_FROZEN" | "REJECTED";
  notes: CaseNote[];
  activity: CaseActivity[];
  activityLog?: CaseActivity[];
}

export interface Alert {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  caseId?: string;
  walletAddress?: string;
  chain?: Chain;
  acknowledged: boolean;
  createdAt: string;
}

export interface WatchlistWallet {
  id: string;
  address: string;
  chain: Chain;
  label: string;
  riskBand: RiskBand;
  riskScore: number;
  status: "ACTIVE" | "ALERTING" | "MONITORING" | "SUSPENDED" | string;
  caseId?: string;
  lastActive: string;
  lastActivity?: string;
  balance?: number;
  balanceUsd: number;
  usdBalance?: number;
  ticker?: string;
  lastCheckedAt: string;
  addedAt?: string;
  notes?: string;
}

export interface BlockchainProviderStatus {
  chain: Chain;
  name: string;
  provider: string;
  status:
    | "LIVE"
    | "DEGRADED"
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "UNAVAILABLE"
    | "CONFIGURATION_REQUIRED"
    | "UNSUPPORTED_WITH_CURRENT_RPC";
  blockHeight?: number;
  latencyMs: number;
  lastUpdated: string;
  configured: boolean;
}

export interface VaspDirectoryEntry {
  id: string;
  name: string;
  legalEntity: string;
  jurisdiction: string;
  complianceRating: string;
  kycStandard: string;
  responseLatencyHours: number;
  registeredFiu: boolean;
  contactEmail: string;
  subpoenaFormat: string;
  kycLevel: "TIER_1" | "TIER_2" | "TIER_3" | "STRICT" | "MINIMAL" | "ANONYMOUS";
  cooperationLevel: "HIGH" | "MEDIUM" | "LOW" | "NON_COOPERATIVE";
  subpoenaPortal: string;
  complianceEmail: string;
  avgFreezeTimeHours: number;
  categories: string[];
}

export interface Transaction {
  hash: string;
  chain: Chain;
  from: string;
  to: string;
  amount: number;
  asset: string;
  timestamp: string | null;
  blockHeight: number | null;
  direction?: "in" | "out" | "self";
  provenance?: DataProvenance;
  usdValue?: number | null;
  priceDataSource?: PriceDataSource;
  priceTimestamp?: string | null;
  sourceType?: string | null;
  tokenAddress?: string;
  fee?: number | string;
  status?: "CONFIRMED" | "PENDING" | "FAILED";
}
