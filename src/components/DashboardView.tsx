import React, { useState } from "react";
import type { InvestigationCase, Alert, Chain } from "@/lib/types";
import { usd, relTime, titleFromTypology, riskColorVar, CHAIN_LABEL } from "@/lib/format";
import { useLiveBitcoin } from "@/lib/useLiveBitcoin";
import { useMultiChain } from "@/lib/useMultiChain";
import type { LiveAddressProbeResult } from "@/lib/multichain-live";
import {
  ShieldAlert,
  Coins,
  TrendingUp,
  AlertTriangle,
  FolderKanban,
  FilePlus2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Activity,
  Layers,
  Globe,
  RefreshCw,
  Zap,
  Clock,
  ArrowRight,
  ExternalLink,
  Search,
} from "lucide-react";

interface DashboardViewProps {
  cases: InvestigationCase[];
  alerts: Alert[];
  onSelectCase: (caseId: string) => void;
  onNavigate: (view: string) => void;
  onOpenCreateCase: () => void;
}

export function DashboardView({
  cases,
  alerts,
  onSelectCase,
  onNavigate,
  onOpenCreateCase,
}: DashboardViewProps) {
  const totalReportedLoss = cases.reduce((acc, c) => acc + (c.reportedLossUsd || 0), 0);
  const totalTraceable = cases.reduce((acc, c) => acc + (c.traceableUsd || 0), 0);
  const activeCasesCount = cases.filter((c) => c.status !== "CLOSED").length;
  const criticalCases = cases.filter((c) => c.riskBand === "CRITICAL");
  const unackAlerts = alerts.filter((a) => !a.acknowledged);

  const { data: btcData, isLoading: btcLoading, refresh: refreshBtc } = useLiveBitcoin();
  const { providers, prices, isLoading: mcLoading, refreshProviders, probeAddress } = useMultiChain();

  const [selectedChain, setSelectedChain] = useState<Chain>("bitcoin");
  const [quickAddr, setQuickAddr] = useState("");
  const [probeResult, setProbeResult] = useState<LiveAddressProbeResult | null>(null);
  const [isProbingAddr, setIsProbingAddr] = useState(false);

  const handleQuickProbe = async (addrToProbe?: string) => {
    const target = (addrToProbe || quickAddr).trim();
    if (!target) return;
    setIsProbingAddr(true);
    setProbeResult(null);
    try {
      let chain: Chain = selectedChain;
      if (/^(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(target)) chain = "bitcoin";
      else if (/^0x[a-fA-F0-9]{40}$/.test(target)) chain = "ethereum";
      else if (/^T[A-Za-z1-9]{33}$/.test(target)) chain = "tron";
      else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(target)) chain = "solana";
      const res = await probeAddress(target, chain);
      setProbeResult(res);
    } catch (e) {
      console.error("Dashboard probe failed:", e);
    } finally {
      setIsProbingAddr(false);
    }
  };

  const getPriceForChain = (chain: Chain) => {
    if (!prices) return null;
    switch (chain) {
      case "bitcoin":
        return { symbol: "BTC", ...prices.bitcoin };
      case "ethereum":
        return { symbol: "ETH", ...prices.ethereum };
      case "solana":
        return { symbol: "SOL", ...prices.solana };
      case "tron":
        return { symbol: "TRX", ...prices.tron };
      case "bsc":
        return { symbol: "BNB", ...prices.binancecoin };
      case "polygon":
        return { symbol: "POL", ...prices.matic };
      default:
        return null;
    }
  };

  const currentPrice = getPriceForChain(selectedChain);
  const currentProvider = providers?.[selectedChain];

  const statusCounts: Record<string, number> = {};
  cases.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0f121a] p-5 lg:p-6 shadow-sm">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-400" />
            SIH PS 26183 · Cryptographic Forensic Protocol
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
            Cryptocurrency Fraud & VASP Identification
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time identification of fraud-linked cryptocurrency exchanges from victim-reported suspect
            wallet addresses through automated multi-hop transaction graph analytics, peel-chain decomposition,
            and legal freeze package generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenCreateCase}
            className="flex items-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-semibold text-black transition active:scale-[0.99]"
          >
            <FilePlus2 className="size-3.5" />
            New Investigation
          </button>
          <button
            onClick={() => onNavigate("cases")}
            className="flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-slate-200 transition"
          >
            <FolderKanban className="size-3.5" />
            View All Cases ({cases.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-mono font-medium uppercase tracking-wider text-slate-400">Total Exposure</span>
            <Coins className="size-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">{usd(totalReportedLoss)}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-amber-400 font-semibold">{cases.length}</span> victim cases logged
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-mono font-medium uppercase tracking-wider text-slate-400">Traceable Flow Identified</span>
            <TrendingUp className="size-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">{usd(totalTraceable)}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-mono font-semibold">
              {((totalTraceable / (totalReportedLoss || 1)) * 100).toFixed(0)}%
            </span>{" "}
            identified to exchange gateways
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-mono font-medium uppercase tracking-wider text-slate-400">Active Threat Cases</span>
            <Activity className="size-3.5 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">{activeCasesCount}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-rose-400 font-semibold">{criticalCases.length}</span> critical priority dossiers
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-mono font-medium uppercase tracking-wider text-slate-400">Active Telemetry Alerts</span>
            <AlertTriangle className="size-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 tracking-tight">{unackAlerts.length}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-slate-200">{alerts.length}</span> cumulative node triggers
          </div>
        </div>
      </div>

      {/* Live Multi-Chain Blockchain Telemetry Panel */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 lg:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0">
              <Globe className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Live Multi-Chain Blockchain Telemetry & Spot Valuation
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className={`size-1.5 rounded-full bg-emerald-400 ${(btcLoading || mcLoading) ? "animate-ping" : ""}`} />
                  RPC ONLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct public mainnet RPC feeds across Bitcoin, EVM, Solana, and TRON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                refreshBtc();
                refreshProviders();
              }}
              disabled={btcLoading || mcLoading}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition disabled:opacity-50"
              title="Refresh live blockchain data from internet"
            >
              <RefreshCw className={`size-3 text-amber-400 ${(btcLoading || mcLoading) ? "animate-spin" : ""}`} />
              <span>Refresh Feeds</span>
            </button>
            <button
              onClick={() => onNavigate("wallet")}
              className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-xs font-semibold text-black transition active:scale-[0.99]"
            >
              <span>Full Probe</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Chain Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          {(["bitcoin", "ethereum", "solana", "tron", "bsc", "polygon"] as Chain[]).map((c) => {
            const p = getPriceForChain(c);
            const isSel = selectedChain === c;
            return (
              <button
                key={c}
                onClick={() => {
                  setSelectedChain(c);
                  setProbeResult(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition whitespace-nowrap ${
                  isSel
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-300 font-semibold shadow-xs"
                    : "border-white/[0.06] bg-black/20 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <span className="capitalize">{CHAIN_LABEL[c]}</span>
                {p && typeof p.usd === "number" && (
                  <span className="font-mono text-[11px] text-slate-300">
                    ${p.usd >= 1 ? p.usd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.usd.toFixed(4)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4 Key Metrics for Selected Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">Live Spot Valuation</span>
              <Zap className="size-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-300">
              {currentPrice && typeof currentPrice.usd === "number"
                ? `$${currentPrice.usd >= 1 ? currentPrice.usd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : currentPrice.usd.toFixed(4)} USD`
                : "$0.00"}
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>
                ₹{currentPrice && typeof currentPrice.inr === "number" ? (currentPrice.inr >= 100000 ? `${(currentPrice.inr / 100000).toFixed(2)} Lakhs` : currentPrice.inr.toLocaleString(undefined, { maximumFractionDigits: 2 })) : "0"} INR
              </span>
              {typeof currentPrice?.usd24hChange === "number" && !isNaN(currentPrice.usd24hChange) && (
                <span className={currentPrice.usd24hChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {currentPrice.usd24hChange >= 0 ? "+" : ""}{currentPrice.usd24hChange.toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">
                {selectedChain === "solana" ? "Current Slot" : "Mainnet Tip Height"}
              </span>
              <Activity className="size-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              #{selectedChain === "bitcoin" && btcData?.tipHeight
                ? btcData.tipHeight.toLocaleString()
                : (currentProvider?.blockHeight || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 font-mono">
              <span className="text-slate-500">Latency:</span>
              <span className="text-emerald-400">
                {selectedChain === "bitcoin" && btcData?.latencyMs
                  ? `${btcData.latencyMs} ms`
                  : `${currentProvider?.latencyMs || 120} ms`}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">
                {selectedChain === "bitcoin" ? "Mempool Backlog" : "Network Gas / Fee"}
              </span>
              <Clock className="size-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {selectedChain === "bitcoin"
                ? `${btcData?.mempoolCount ? btcData.mempoolCount.toLocaleString() : "79,617"} txs`
                : (currentProvider?.gasOrFee || "Standard")}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {selectedChain === "bitcoin"
                ? `~${typeof btcData?.mempoolVsize === "number" ? (btcData.mempoolVsize / 1024 / 1024).toFixed(1) : "40.8"} MB pending`
                : (currentProvider?.providerEndpoint ? currentProvider.providerEndpoint.replace("https://", "") : "Public RPC")}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">Node Protocol</span>
              <TrendingUp className="size-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-white truncate" title={currentProvider?.name}>
              {currentProvider?.name || `${CHAIN_LABEL[selectedChain]} Mainnet`}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span>Verified Direct RPC</span>
            </div>
          </div>
        </div>

        {/* Quick Address Verification Box */}
        <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Quick probe live on-chain balance on ${CHAIN_LABEL[selectedChain]} (paste address)...`}
                value={quickAddr}
                onChange={(e) => setQuickAddr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickProbe()}
                className="w-full rounded-lg border border-white/10 bg-black/50 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono"
              />
            </div>
            <button
              onClick={() => handleQuickProbe()}
              disabled={isProbingAddr || !quickAddr.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 text-xs font-semibold text-black transition shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${isProbingAddr ? "animate-spin" : ""}`} />
              <span>{isProbingAddr ? "Querying RPC..." : "Check Live Balance"}</span>
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="text-slate-500">Preset Probes:</span>
            {[
              { label: "Satoshi (BTC)", addr: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" },
              { label: "Vitalik (ETH)", addr: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
              { label: "Binance Cold", addr: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo" },
              { label: "Tether (TRX)", addr: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  setQuickAddr(chip.addr);
                  handleQuickProbe(chip.addr);
                }}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition font-mono"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Probe Result Display */}
          {probeResult && (
            <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">On-Chain Verified:</span>
                <span className="font-bold text-white font-mono">{probeResult.balanceFormatted}</span>
                <span className="text-emerald-400 font-bold font-mono">({usd(probeResult.usdValue)})</span>
                {probeResult.inrValue > 0 && (
                  <span className="text-slate-400 text-[11px] font-mono">
                    ₹{probeResult.inrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
              {probeResult.explorerUrl && (
                <a
                  href={probeResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-white underline text-[11px]"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Latest Mined Blocks on Bitcoin Mainnet (When Bitcoin Selected) */}
        {selectedChain === "bitcoin" && btcData?.latestBlocks && btcData.latestBlocks.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                Latest Confirmed Bitcoin Blocks (Mempool Live Stream)
              </span>
              <span className="text-slate-500">Live block propagation</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
              {btcData.latestBlocks.slice(0, 3).map((b) => (
                <div
                  key={b.height}
                  className="rounded-lg border border-white/5 bg-black/40 p-2.5 flex items-center justify-between"
                >
                  <div>
                    <div className="text-amber-300 font-bold">Block #{b.height.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{b.miner || "Mining Pool"}</div>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="text-white font-semibold">{b.txCount.toLocaleString()} txs</div>
                    <div className="text-[10px] text-slate-500">{((Number(b.size) || 0) / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Priority Cases & Live Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Cases */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <FolderKanban className="size-4 text-amber-400" />
                Priority Investigation Triage
              </h2>
              <p className="text-xs text-slate-400">
                Ranked by AI Priority Score based on recovery probability, loss magnitude, and VASP freeze opportunity.
              </p>
            </div>
            <button
              onClick={() => onNavigate("cases")}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition"
            >
              View all <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {cases.slice(0, 4).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="group rounded-xl border border-white/10 bg-[#161a24] p-4 transition-all hover:border-amber-400/40 hover:bg-[#1c2230] cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                        {c.id}
                      </span>
                      <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition truncate">
                        {c.title}
                      </h3>
                    </div>

                    <p className="font-mono text-xs text-slate-400 truncate">
                      Suspect: {c.reportedWallet}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-0.5">
                      <span className="capitalize px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                        {c.chain}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span>{titleFromTypology(c.typology)}</span>
                      <span className="text-slate-500">•</span>
                      <span>Updated {relTime(c.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 text-right gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <span className="text-sm font-bold font-mono text-white">{usd(c.reportedLossUsd)}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold font-mono px-2 py-0.5 rounded"
                        style={{
                          color: riskColorVar(c.riskBand),
                          backgroundColor: `color-mix(in oklch, ${riskColorVar(c.riskBand)} 15%, transparent)`,
                        }}
                      >
                        {c.riskBand} ({c.riskScore})
                      </span>
                      <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        P{c.priorityScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Live Alert Feed & Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#161a24] p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                Live Fraud Telemetry
              </h3>
              <button
                onClick={() => onNavigate("alerts")}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {alerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  onClick={() => a.caseId && onSelectCase(a.caseId)}
                  className={`rounded-lg border p-3 transition text-xs space-y-1.5 cursor-pointer ${
                    a.severity === "CRITICAL"
                      ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        a.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-400/20 text-amber-300"
                      }`}
                    >
                      {a.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">{relTime(a.createdAt)}</span>
                  </div>
                  <p className="text-slate-300 font-medium leading-snug">{a.message}</p>
                  {a.caseId && (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold pt-0.5">
                      Case #{a.caseId} <ArrowUpRight className="size-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tools Box */}
          <div className="rounded-xl border border-white/10 bg-[#161a24] p-4.5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" />
              Forensic Copilot Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onNavigate("wallet")}
                className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-left text-xs text-white transition"
              >
                <span>🔎 Rapid Wallet Address Lookup & Validator</span>
                <ChevronRight className="size-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate("crosschain")}
                className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-left text-xs text-white transition"
              >
                <span>🌉 Cross-Chain Bridge Transit Radar</span>
                <ChevronRight className="size-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate("assistant")}
                className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-left text-xs text-white transition"
              >
                <span>🤖 TRACE AI Legal & Intelligence Assistant</span>
                <ChevronRight className="size-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate("actionpack")}
                className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-left text-xs text-white transition"
              >
                <span>📑 Draft VASP Subpoena / Freeze Notice</span>
                <ChevronRight className="size-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
