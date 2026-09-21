import React, { useState, useEffect } from "react";
import type { Chain } from "@/lib/types";
import { CHAIN_LABEL, usd, relTime, shortAddr } from "@/lib/format";
import { useMultiChain } from "@/lib/useMultiChain";
import type { LiveAddressProbeResult } from "@/lib/multichain-live";
import {
  Wallet,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  Activity,
  Layers,
  Globe,
  RefreshCw,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Sparkles,
  Lock,
  Building2,
  Server,
  Info,
  Filter,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WalletInvestigationViewProps {
  onOpenCreateCaseWithAddress?: (addr: string, chain: Chain) => void;
  onAddToWatchtower?: (addr: string, chain: Chain, label: string) => void;
}

const NOTABLE_PRESET_ADDRESSES: {
  label: string;
  address: string;
  chain: Chain;
  desc: string;
}[] = [
  {
    label: "Vitalik Buterin (ETH)",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    chain: "ethereum",
    desc: "Ethereum co-founder public primary wallet (vitalik.eth)",
  },
  {
    label: "Canonical WETH (ETH)",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    chain: "ethereum",
    desc: "Wrapped Ether ERC-20 smart contract on Ethereum mainnet",
  },
  {
    label: "Binance Hot (ETH)",
    address: "0x28c6c06298d514db089934071355e5743bf21d60",
    chain: "ethereum",
    desc: "Binance 14 verified exchange hot wallet",
  },
  {
    label: "Tornado 0.1 ETH (ETH)",
    address: "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
    chain: "ethereum",
    desc: "OFAC-sanctioned Tornado Cash router contract",
  },
  {
    label: "Tether USD (TRON)",
    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    chain: "tron",
    desc: "Primary USDT smart contract on TRON TRC-20 network",
  },
  {
    label: "Binance Hot (SOL)",
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    chain: "solana",
    desc: "High volume verified exchange liquidity account on Solana",
  },
  {
    label: "Satoshi Genesis (BTC)",
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    chain: "bitcoin",
    desc: "First ever Bitcoin address (Block 0 Coinbase)",
  },
];

export function WalletInvestigationView({
  onOpenCreateCaseWithAddress,
  onAddToWatchtower,
}: WalletInvestigationViewProps) {
  const [addressInput, setAddressInput] = useState("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  const [selectedChain, setSelectedChain] = useState<Chain>("ethereum");
  const [analyzed, setAnalyzed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showTestVectors, setShowTestVectors] = useState(false);

  const { probeAddress, isProbing } = useMultiChain();
  const [probeData, setProbeData] = useState<LiveAddressProbeResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Transaction Filters & Modal Detail State
  const [txDirectionFilter, setTxDirectionFilter] = useState<"ALL" | "INCOMING" | "OUTGOING">("ALL");
  const [txAssetFilter, setTxAssetFilter] = useState<string>("ALL");
  const [txMinAmount, setTxMinAmount] = useState<string>("");
  const [txSortBy, setTxSortBy] = useState<"timestamp" | "amount" | "block">("timestamp");
  const [selectedTxDetail, setSelectedTxDetail] = useState<any | null>(null);

  // Cryptographic Evidence Verification State
  const [isVerifyingEvidence, setIsVerifyingEvidence] = useState(false);
  const [evidenceVerificationResult, setEvidenceVerificationResult] = useState<{
    valid: boolean;
    message: string;
    verifiedAt: string;
  } | null>(null);

  // Server-side AI analysis state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    executiveSummary: string;
    threatAssessment: string;
    recommendedSubpoenas: string[];
    countermeasureTactics: string[];
    aiModelUsed: string;
  } | null>(null);

  const handleCopy = (text: string, isHash = false) => {
    navigator.clipboard.writeText(text);
    if (isHash) {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Address validation detection
  const isEth = /^0x[a-fA-F0-9]{40}$/.test(addressInput.trim());
  const isBtc = /^(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addressInput.trim());
  const isTron = /^T[A-Za-z1-9]{33}$/.test(addressInput.trim());
  const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addressInput.trim());

  let autoDetectedChain: Chain = selectedChain;
  if (isBtc) autoDetectedChain = "bitcoin";
  else if (isTron) autoDetectedChain = "tron";
  else if (isSol) autoDetectedChain = "solana";
  else if (isEth && ["bitcoin", "tron", "solana"].includes(selectedChain)) {
    autoDetectedChain = "ethereum";
  }

  const isValid = isEth || isBtc || isTron || isSol;

  // Trigger live on-chain lookup
  const runAnalysis = async (addrToAnalyze?: string, chainOverride?: Chain, forceRefresh: boolean = false) => {
    const target = (addrToAnalyze || addressInput).trim();
    const chainToUse = chainOverride || autoDetectedChain;
    setAnalyzed(true);
    setQueryError(null);
    setAiAnalysis(null);
    setEvidenceVerificationResult(null);

    try {
      const result = await probeAddress(target, chainToUse, "CASE-LIVE", forceRefresh);
      setProbeData(result);
    } catch (err: any) {
      console.error("Live query error:", err);
      setQueryError(err?.message || `Failed to probe address on ${chainToUse}`);
    }
  };

  // Trigger Evidence Verification via server NIST SHA-256 validator
  const handleVerifyEvidenceChain = async () => {
    if (!probeData?.evidence || probeData.evidence.length === 0) return;
    setIsVerifyingEvidence(true);
    try {
      const res = await fetch("/api/evidence/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: probeData.evidence }),
      });
      const data = await res.json();
      setEvidenceVerificationResult({
        valid: Boolean(data.valid),
        message: data.message || (data.valid ? "Cryptographic custody chain intact: NIST FIPS 180-4 SHA-256 verified across all events." : "Evidence chain hash mismatch detected."),
        verifiedAt: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setEvidenceVerificationResult({
        valid: false,
        message: `Failed to verify chain: ${err.message}`,
        verifiedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsVerifyingEvidence(false);
    }
  };

  // Trigger AI analysis on demand
  const handleRequestAiBriefing = async () => {
    if (!probeData) return;
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          probe: probeData,
          complaintText: "Forensic wallet inquiry for fraud or money laundering nexus.",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setAiAnalysis(data.analysis);
        } else {
          showToast(data.message || "Gemini API key is not configured.");
        }
      }
    } catch (err: any) {
      console.error("AI briefing error:", err);
      showToast("Unable to generate AI briefing at this time.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    // Initial run on load
    runAnalysis();
  }, []);

  // Filtered & Sorted Transactions
  const rawTxs = probeData?.transactions || [];
  const uniqueAssets = Array.from(new Set(rawTxs.map((t) => t.asset).filter((a): a is string => Boolean(a))));

  const filteredTransactions = rawTxs
    .filter((tx) => {
      if (txDirectionFilter !== "ALL" && tx.direction !== txDirectionFilter) {
        return false;
      }
      if (txAssetFilter !== "ALL" && tx.asset !== txAssetFilter) {
        return false;
      }
      if (txMinAmount && !isNaN(Number(txMinAmount))) {
        if (tx.amount < Number(txMinAmount)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (txSortBy === "amount") {
        return b.amount - a.amount;
      }
      if (txSortBy === "block") {
        return (b.blockNumber || 0) - (a.blockNumber || 0);
      }
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      return timeB - timeA;
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
          <Wallet className="size-5 text-amber-400" />
          Autonomous On-Chain Investigation & Forensics
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Direct JSON-RPC node verification across Bitcoin, EVM, TRON, and Solana. Zero third-party block explorer dependencies.
        </p>
      </div>

      {toast && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Search Bar & Target Selection */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 lg:p-5 space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Target Suspect Wallet Address</label>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400/90 font-mono">
              <Server className="size-3.5" />
              Direct Node Protocol (Zero Third-Party APIs)
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value);
                  setAnalyzed(false);
                }}
                placeholder="Paste Bitcoin (bc1/1/3...), EVM (0x...), TRON (T...), or Solana address..."
                className="w-full rounded-lg border border-white/[0.08] bg-black/30 pl-8.5 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Chain Selector for EVM disambiguation */}
            {isEth && (
              <select
                value={selectedChain}
                onChange={(e) => {
                  const c = e.target.value as Chain;
                  setSelectedChain(c);
                  runAnalysis(addressInput, c);
                }}
                className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs font-mono text-amber-300 focus:border-amber-400 focus:outline-none"
              >
                <option value="ethereum">Ethereum (Mainnet)</option>
                <option value="polygon">Polygon (PoS)</option>
                <option value="bsc">BNB Smart Chain</option>
                <option value="arbitrum">Arbitrum One</option>
                <option value="optimism">OP Mainnet</option>
                <option value="base">Base Mainnet</option>
                <option value="avalanche">Avalanche C-Chain</option>
              </select>
            )}

            <button
              onClick={() => runAnalysis(addressInput, undefined, false)}
              disabled={isProbing}
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-semibold text-black transition disabled:opacity-50 active:scale-[0.99]"
            >
              {isProbing ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Probing Node…</span>
                </>
              ) : (
                <>
                  <Search className="size-3.5" />
                  <span>Analyze Address</span>
                </>
              )}
            </button>

            <button
              onClick={() => runAnalysis(addressInput, undefined, true)}
              disabled={isProbing}
              title="Bypass 30s cache and re-query the authoritative node directly"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-300 transition disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isProbing ? "animate-spin" : ""}`} />
              <span>Re-Query</span>
            </button>
          </div>
        </div>

        {/* Collapsible Test Vectors for Non-production testing */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <button
            onClick={() => setShowTestVectors(!showTestVectors)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 transition"
          >
            <span className="flex items-center gap-1.5">
              <Info className="size-3 text-amber-400" />
              <span>Reference Test Vectors (Development & Offline Validation Only)</span>
            </span>
            {showTestVectors ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showTestVectors && (
            <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in">
              {NOTABLE_PRESET_ADDRESSES.map((target) => (
                <button
                  key={target.address}
                  onClick={() => {
                    setAddressInput(target.address);
                    setSelectedChain(target.chain);
                    runAnalysis(target.address, target.chain, false);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-mono ${
                    addressInput === target.address
                      ? "border-amber-400 bg-amber-400/20 text-amber-300 font-semibold"
                      : "border-white/10 bg-black/30 text-slate-300 hover:border-amber-400/50 hover:bg-white/5"
                  }`}
                  title={`${target.desc} (${target.address})`}
                >
                  {target.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Format & Node Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span>Target Protocol:</span>
            {isValid ? (
              <span className="font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded capitalize">
                ✓ {CHAIN_LABEL[autoDetectedChain]}
              </span>
            ) : (
              <span className="text-rose-400">Unrecognized cryptographic address format</span>
            )}
          </div>
        </div>
      </div>

      {queryError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Error querying live node: {queryError}</span>
        </div>
      )}

      {probeData && (
        <div className="space-y-6">
          {/* Honest Status & Data Source Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#0f121a] border border-white/[0.08] rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${
                  probeData.status === "LIVE"
                    ? probeData.dataSource === "CACHED"
                      ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : probeData.status === "CONFIGURATION_REQUIRED" || probeData.status === "UNSUPPORTED_WITH_CURRENT_RPC"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                ● {probeData.status} ({probeData.dataSource})
              </span>
              <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">
                {probeData.provider}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              {probeData.blockHeight && (
                <span>Block #{probeData.blockHeight.toLocaleString()}</span>
              )}
              <span>Queried: {new Date(probeData.queriedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Honest Error / Status Banner if present */}
          {probeData.error && (
            <div className={`rounded-xl border p-4 space-y-1.5 ${
              probeData.status === "CONFIGURATION_REQUIRED" || probeData.status === "UNSUPPORTED_WITH_CURRENT_RPC"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Direct Node Execution Status: {probeData.status}</span>
              </div>
              <p className="text-xs font-mono text-slate-300 pl-6">{probeData.error}</p>
            </div>
          )}

          {/* Limitations / Configuration Banner if present */}
          {probeData.limitations && probeData.limitations.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Info className="size-4 shrink-0" />
                Node Integrity & Execution Limitations:
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
                {probeData.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary Forensic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. On-Chain Balance */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Verified Balance
                </span>
                <Coins className="size-3.5 text-amber-400" />
              </div>
              <div className="text-xl lg:text-2xl font-bold font-mono text-white tracking-tight">
                {probeData.balanceFormatted}
              </div>
              <div className="text-xs text-emerald-400 font-mono font-medium pt-0.5">
                {probeData.usdValue != null ? usd(probeData.usdValue) : "Price Unavailable"}
                {typeof probeData.inrValue === "number" && probeData.inrValue > 0 && (
                  <span className="text-slate-400 font-normal ml-2">
                    (₹{(probeData.inrValue / 100000).toFixed(2)} L)
                  </span>
                )}
              </div>
            </div>

            {/* 2. On-Chain Activity */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Activity Records
                </span>
                <Activity className="size-3.5 text-emerald-400" />
              </div>
              <div className="text-xl lg:text-2xl font-bold font-mono text-white tracking-tight">
                {probeData.txCount.toLocaleString()} {probeData.chain === "bitcoin" ? "Txs" : "Events/Nonce"}
              </div>
              <div className="text-[11px] text-slate-400">
                {probeData.isContract ? "Smart Contract Bytecode Detected" : "Externally Owned Account (EOA)"}
              </div>
            </div>

            {/* 3. Deterministic Risk Assessment */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Deterministic Risk
                </span>
                <ShieldAlert
                  className={`size-3.5 ${
                    probeData.risk?.band === "CRITICAL"
                      ? "text-rose-400"
                      : probeData.risk?.band === "HIGH"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                />
              </div>
              <div
                className={`text-xl lg:text-2xl font-bold font-mono tracking-tight ${
                  probeData.risk?.band === "CRITICAL"
                    ? "text-rose-400"
                    : probeData.risk?.band === "HIGH"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {probeData.risk?.score ?? 15} / 100
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                {probeData.risk?.band || "LOW"} · {probeData.risk?.threatCategory || "Standard Activity"}
              </div>
            </div>

            {/* 4. VASP Legal Attribution */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  VASP Legal Nexus
                </span>
                <Building2 className="size-3.5 text-amber-400" />
              </div>
              <div className="text-lg lg:text-xl font-bold font-mono text-white truncate">
                {probeData.vasp?.vaspName || "UNKNOWN"}
              </div>
              <div className="text-xs">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    probeData.vasp?.status === "VERIFIED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : probeData.vasp?.status === "PROBABLE"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/30"
                  }`}
                >
                  {probeData.vasp?.status || "UNKNOWN"}
                </span>
                <span className="text-slate-400 text-[11px] ml-1.5 font-mono">
                  {typeof probeData.vasp?.confidenceScore === "number" ? `${(probeData.vasp.confidenceScore * 100).toFixed(0)}% Conf.` : "No cluster"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0f121a] p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Target Address:</span>
              <span className="font-mono text-xs text-amber-300 font-semibold">{addressInput}</span>
              <button onClick={() => handleCopy(addressInput)} className="text-slate-400 hover:text-white p-1">
                {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRequestAiBriefing}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-300 transition"
              >
                {isAiLoading ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5 text-amber-400" />
                )}
                <span>AI Forensic Briefing</span>
              </button>

              <button
                onClick={() => {
                  onAddToWatchtower?.(addressInput, probeData.chain, "Investigated Address");
                  showToast("Address added to continuous Watchtower monitoring.");
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-white transition"
              >
                <PlusCircle className="size-3.5 text-amber-400" /> Add to Watchtower
              </button>

              <button
                onClick={() => onOpenCreateCaseWithAddress?.(addressInput, probeData.chain)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 text-xs font-semibold text-black transition active:scale-[0.99]"
              >
                <ArrowRight className="size-3.5" /> Open Formal Case
              </button>
            </div>
          </div>

          {/* AI Case Briefing (if requested) */}
          {aiAnalysis && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <Sparkles className="size-4 text-purple-400" />
                  Gemini Forensics Briefing ({aiAnalysis.aiModelUsed})
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Advisory Only
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {aiAnalysis.executiveSummary}
              </p>
              <div className="pt-2 border-t border-purple-500/20 text-xs text-slate-300">
                <strong className="text-purple-300">Threat Assessment: </strong>
                {aiAnalysis.threatAssessment}
              </div>
              {aiAnalysis.recommendedSubpoenas.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-purple-300">Recommended Legal Measures:</span>
                  <ul className="text-xs text-slate-300 list-disc pl-5 space-y-0.5">
                    {aiAnalysis.recommendedSubpoenas.map((sub, i) => (
                      <li key={i}>{sub}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* VASP Legal Attribution Directive */}
          {probeData.vasp && probeData.vasp.status !== "UNKNOWN" && (
            <div className="rounded-xl border border-amber-400/20 bg-[#0f121a] p-4 lg:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="size-4 text-amber-400" />
                  VASP Attribution & Law Enforcement Directives
                </h3>
                <span className="text-xs font-mono text-amber-300">
                  Status: {probeData.vasp.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Identified Entity</span>
                  <div className="font-semibold text-white">{probeData.vasp.vaspName}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Legal Entity</span>
                  <div className="font-mono text-slate-200">{probeData.vasp.legalEntity || "N/A"}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Jurisdiction</span>
                  <div className="text-slate-200">{probeData.vasp.jurisdiction || "Global / Multi"}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">LE Compliance Contact</span>
                  <div className="font-mono text-amber-300 select-all">{probeData.vasp.complianceContact || "N/A"}</div>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-black/30 rounded-lg p-3 border border-white/[0.06] space-y-1">
                <span className="font-semibold text-amber-300">Recommended Action: </span>
                <span>{probeData.vasp.recommendedLegalAction}</span>
              </div>
            </div>
          )}

          {/* Detected Laundering Typologies */}
          {probeData.patterns && probeData.patterns.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 lg:p-5 space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <Flame className="size-4 text-rose-400" />
                Detected On-Chain Laundering Typologies ({probeData.patterns.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {probeData.patterns.map((pat) => (
                  <div
                    key={pat.id}
                    className="rounded-lg border border-white/[0.06] bg-black/25 p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{pat.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pat.severity === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {pat.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11.5px] leading-relaxed">{pat.description}</p>
                    {pat.evidenceTxHashes.length > 0 && (
                      <div className="pt-1 text-[11px] text-slate-400">
                        <span className="font-mono text-amber-400">Supporting Tx Hashes: </span>
                        {pat.evidenceTxHashes.map((h, i) => (
                          <span key={i} className="font-mono text-slate-300 mr-1.5">
                            {shortAddr(h, 6, 6)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Token Balances (ERC-20 / TRC-20 / SPL) */}
          {probeData.tokens && probeData.tokens.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 lg:p-5 space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="size-4 text-amber-400" />
                Token Assets on Record ({probeData.tokens.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {probeData.tokens.map((tok, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-black/25 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{tok.symbol}</span>
                      <span className="text-slate-400 text-[10px]">{tok.name}</span>
                    </div>
                    <div className="font-mono text-sm text-amber-300">{tok.balanceFormatted}</div>
                    {tok.usdValue !== null && (
                      <div className="text-[11px] text-emerald-400 font-mono">{usd(tok.usdValue)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normalized On-Chain Transactions Table with Filters & Sorting */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 lg:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  Verified On-Chain Transactions ({filteredTransactions.length} of {rawTxs.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Source: {probeData.provider} ({probeData.dataSource})
              </span>
            </div>

            {/* Filter & Sorting Controls */}
            <div className="flex flex-wrap items-center gap-2.5 bg-black/30 p-2.5 rounded-lg border border-white/[0.05] text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter className="size-3 text-amber-400" />
                <span>Filters:</span>
              </div>

              {/* Direction Filter */}
              <select
                value={txDirectionFilter}
                onChange={(e) => setTxDirectionFilter(e.target.value as any)}
                className="rounded bg-white/5 border border-white/10 px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">Direction: All</option>
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>

              {/* Asset Filter */}
              {uniqueAssets.length > 1 && (
                <select
                  value={txAssetFilter}
                  onChange={(e) => setTxAssetFilter(e.target.value)}
                  className="rounded bg-white/5 border border-white/10 px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Asset: All</option>
                  {uniqueAssets.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              )}

              {/* Min Amount */}
              <input
                type="number"
                value={txMinAmount}
                onChange={(e) => setTxMinAmount(e.target.value)}
                placeholder="Min Amount"
                className="w-24 rounded bg-white/5 border border-white/10 px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
              />

              {/* Sorting */}
              <div className="flex items-center gap-1.5 ml-auto text-slate-400">
                <SlidersHorizontal className="size-3 text-amber-400" />
                <select
                  value={txSortBy}
                  onChange={(e) => setTxSortBy(e.target.value as any)}
                  className="rounded bg-white/5 border border-white/10 px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="timestamp">Sort: Time</option>
                  <option value="amount">Sort: Amount</option>
                  <option value="block">Sort: Block</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono border border-dashed border-white/10 rounded-lg p-6 space-y-1">
                <div className="text-slate-300 font-semibold">Zero Matching Transactions</div>
                <div>No recent transaction events found within queried block bounds, filter criteria, or node capabilities.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 text-[10.5px] uppercase tracking-wider font-semibold font-mono">
                      <th className="pb-2.5">Tx Hash</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Counterparty</th>
                      <th className="pb-2.5">Flow / Asset</th>
                      <th className="pb-2.5">Amount</th>
                      <th className="pb-2.5 text-right">USD Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono">
                    {filteredTransactions.map((tx) => (
                      <tr
                        key={tx.transactionHash}
                        onClick={() => setSelectedTxDetail(tx)}
                        className="hover:bg-white/[0.04] cursor-pointer transition"
                        title="Click to view full cryptographic transaction payload"
                      >
                        <td className="py-2.5 text-amber-300 font-medium">
                          <span title={tx.transactionHash}>
                            {shortAddr(tx.transactionHash, 8, 8)}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === "CONFIRMED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            ✓ {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300 text-[11px]">
                          {tx.direction === "INCOMING" ? (
                            <span>From: {shortAddr(tx.from, 6, 6)}</span>
                          ) : (
                            <span>To: {shortAddr(tx.to, 6, 6)}</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`font-semibold flex items-center gap-1 text-[11.5px] ${
                              tx.direction === "INCOMING" ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {tx.direction === "INCOMING" ? (
                              <ArrowDownLeft className="size-3" />
                            ) : (
                              <ArrowUpRight className="size-3" />
                            )}
                            {tx.asset}
                          </span>
                        </td>
                        <td className="py-2.5 text-white font-medium">
                          {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">
                          {tx.amountUsd ? usd(tx.amountUsd) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cryptographic SHA-256 Evidence Chain with Live Verification */}
          {probeData.evidence && probeData.evidence.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 lg:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                    <Lock className="size-4 text-emerald-400" />
                    Evidence Chain of Custody (NIST FIPS 180-4 SHA-256)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Immutable forensic record hashed sequentially from raw node ingestion.
                  </span>
                </div>

                <button
                  onClick={handleVerifyEvidenceChain}
                  disabled={isVerifyingEvidence}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition"
                >
                  {isVerifyingEvidence ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  <span>Verify Chain Integrity</span>
                </button>
              </div>

              {evidenceVerificationResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                    evidenceVerificationResult.valid
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {evidenceVerificationResult.valid ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                    )}
                    <span>{evidenceVerificationResult.message}</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-slate-400 shrink-0">
                    Checked at {evidenceVerificationResult.verifiedAt}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {probeData.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/25 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.actor}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 truncate max-w-xs">
                        {item.contentHash}
                      </span>
                      <button
                        onClick={() => handleCopy(item.contentHash, true)}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy SHA-256 Hash"
                      >
                        {copiedHash === item.contentHash ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Detail Inspector Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-xl border border-white/[0.1] bg-[#0f121a] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-white">On-Chain Transaction Payload</h4>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 rounded text-slate-400 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase text-slate-400">Transaction Hash</span>
                <div className="flex items-center justify-between bg-black/40 p-2.5 rounded border border-white/5 font-mono text-amber-300 break-all select-all">
                  <span>{selectedTxDetail.transactionHash}</span>
                  <button
                    onClick={() => handleCopy(selectedTxDetail.transactionHash)}
                    className="p-1 text-slate-400 hover:text-white shrink-0 ml-2"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 p-2.5 rounded border border-white/5 space-y-0.5">
                  <span className="text-[11px] text-slate-400">Status</span>
                  <div className="font-semibold text-emerald-400">{selectedTxDetail.status}</div>
                </div>
                <div className="bg-black/40 p-2.5 rounded border border-white/5 space-y-0.5">
                  <span className="text-[11px] text-slate-400">Block Number</span>
                  <div className="font-mono text-white">#{selectedTxDetail.blockNumber || "Pending"}</div>
                </div>
                <div className="bg-black/40 p-2.5 rounded border border-white/5 space-y-0.5">
                  <span className="text-[11px] text-slate-400">Asset & Amount</span>
                  <div className="font-mono text-white">
                    {selectedTxDetail.amount} {selectedTxDetail.asset}
                  </div>
                </div>
                <div className="bg-black/40 p-2.5 rounded border border-white/5 space-y-0.5">
                  <span className="text-[11px] text-slate-400">Direction</span>
                  <div className="font-semibold text-amber-300">{selectedTxDetail.direction}</div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">From Address</span>
                <div className="font-mono text-slate-200 bg-black/40 p-2 rounded border border-white/5 break-all select-all">
                  {selectedTxDetail.from}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">To Address</span>
                <div className="font-mono text-slate-200 bg-black/40 p-2 rounded border border-white/5 break-all select-all">
                  {selectedTxDetail.to}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 font-mono space-y-1">
                <div>Data Source: {selectedTxDetail.dataSource || "RAW_RPC"}</div>
                <div>Authoritative Node: {selectedTxDetail.provider || "Direct Blockchain Node"}</div>
                <div>Timestamp: {new Date(selectedTxDetail.timestamp).toISOString()}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
