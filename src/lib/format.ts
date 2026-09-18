import type { Chain, DataProvenance, CaseStatus, WalletKind, RiskBand, FraudTypology } from "@/lib/types";

export const CHAIN_LABEL: Record<Chain, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  polygon: "Polygon",
  bsc: "BNB Smart Chain",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  base: "Base",
  avalanche: "Avalanche",
  solana: "Solana",
  tron: "TRON",
};

export const CHAIN_TICKER: Record<Chain, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  polygon: "POL",
  bsc: "BNB",
  arbitrum: "ETH",
  optimism: "ETH",
  base: "ETH",
  avalanche: "AVAX",
  solana: "SOL",
  tron: "TRX",
};

export const PROVENANCE_LABEL: Record<DataProvenance, string> = {
  LIVE_BLOCKCHAIN_DATA: "Live Chain Data",
  DEMO_DATA: "Demo Simulation",
  KNOWN_ATTRIBUTION: "Known Entity",
  PROBABLE_ATTRIBUTION: "Probable Attribution",
  HEURISTIC_ANALYSIS: "Heuristic Intel",
  ML_PREDICTION: "ML Prediction",
  UNKNOWN: "Unverified",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  NEW: "New",
  ANALYZING: "Analyzing",
  TRACING: "Tracing",
  VASP_IDENTIFIED: "VASP Identified",
  ACTION_REQUIRED: "Action Required",
  FREEZE_REVIEW: "Freeze Review",
  MONITORING: "Monitoring",
  CLOSED: "Closed",
};

export const WALLET_KIND_LABEL: Record<WalletKind, string> = {
  VICTIM: "Victim Wallet",
  SUSPICIOUS: "Suspect Wallet",
  BURNER: "Burner / Transit",
  VASP: "VASP / Exchange",
  EXCHANGE: "Centralized Exchange",
  BRIDGE: "Cross-Chain Bridge",
  MIXER: "Tumbler / Mixer",
  DEFI: "DeFi Protocol",
  FRAUD_CLUSTER: "Fraud Cluster",
  UNKNOWN: "Unclassified",
};

export function riskColorVar(band: RiskBand): string {
  switch (band) {
    case "CRITICAL":
      return "var(--risk-critical)";
    case "HIGH":
      return "var(--risk-high)";
    case "MEDIUM":
      return "var(--risk-medium)";
    case "LOW":
    default:
      return "var(--risk-low)";
  }
}

export function shortAddr(addr: string, head: number = 6, tail: number = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function usd(amount: number | null | undefined): string {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) return "—";
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function usdFull(amount: number | null | undefined): string {
  if (amount == null || typeof amount !== "number" || isNaN(amount)) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(val: number): string {
  return `${Math.round(val * 100)}%`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return iso;
  }
}

export function humanize(str: string): string {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function titleFromTypology(t: FraudTypology): string {
  switch (t) {
    case "PIG_BUTCHERING":
      return "Pig Butchering (Sha Zhu Pan)";
    case "TASK_SCAM":
      return "Telegram High-Yield Task Scam";
    case "INVESTMENT_FRAUD":
      return "Fictitious Crypto Arbitrage / Investment";
    case "RANSOMWARE":
      return "Ransomware Extortion Payout";
    case "CROSS_CHAIN_LAUNDERING":
      return "Cross-Chain Bridge Hopping";
    case "RAPID_CASHOUT":
      return "Rapid Fan-Out & Cashout";
    case "ORGANIZED_FRAUD":
      return "Organized Cyber Syndicate";
    case "UNKNOWN":
    default:
      return "Unclassified Crypto Fraud";
  }
}
