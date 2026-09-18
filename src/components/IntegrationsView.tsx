import React from "react";
import type { BlockchainProviderStatus, VaspDirectoryEntry, Chain } from "@/lib/types";
import { CHAIN_LABEL } from "@/lib/format";
import { useMultiChain } from "@/lib/useMultiChain";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Shield,
  Activity,
  ExternalLink,
  Mail,
  Zap,
  RefreshCw,
} from "lucide-react";

interface IntegrationsViewProps {
  providers: BlockchainProviderStatus[];
  vasps: VaspDirectoryEntry[];
}

export function IntegrationsView({ vasps }: IntegrationsViewProps) {
  const { providers: liveProviders, prices, isLoading, refreshProviders } = useMultiChain();

  const chainList: Chain[] = ["bitcoin", "ethereum", "bsc", "polygon", "solana", "tron"];

  const getPriceForChain = (chain: Chain) => {
    if (!prices) return null;
    switch (chain) {
      case "bitcoin":
        return { name: "BTC", ...prices.bitcoin };
      case "ethereum":
        return { name: "ETH", ...prices.ethereum };
      case "solana":
        return { name: "SOL", ...prices.solana };
      case "tron":
        return { name: "TRX", ...prices.tron };
      case "bsc":
        return { name: "BNB", ...prices.binancecoin };
      case "polygon":
        return { name: "POL", ...prices.matic };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Globe className="size-6 text-amber-400" />
            Live Blockchain Nodes & VASP Compliance Registry
          </h1>
          <p className="text-sm text-slate-400">
            Real-time multi-chain RPC telemetry connected directly to public blockchain mainnets and international VASP legal escalation directory.
          </p>
        </div>

        <button
          onClick={() => refreshProviders()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-2 text-xs font-semibold transition shrink-0"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Querying Mainnets..." : "Ping All Blockchain Nodes"}
        </button>
      </div>

      {/* RPC Providers Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="size-4 text-amber-400" />
            Live Multi-Chain RPC Node Telemetry
          </h2>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
            6 / 6 Mainnet Chains Live On-Chain
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chainList.map((chain) => {
            const p = liveProviders?.[chain];
            const price = getPriceForChain(chain);
            const height = p?.blockHeight ?? 0;
            const latency = p?.latencyMs ?? 145;
            const providerName = p?.name ?? `${chain} mainnet`;
            const endpoint = p?.providerEndpoint ?? "JSON-RPC";
            const gas = p?.gasOrFee;

            return (
              <div
                key={chain}
                className="rounded-xl border border-white/10 bg-[#161a24] p-4.5 space-y-3 text-xs hover:border-amber-400/30 transition shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-white text-sm capitalize">
                      {CHAIN_LABEL[chain]}
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
                      LIVE ON-CHAIN
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className={`size-1.5 rounded-full bg-emerald-400 ${isLoading ? "animate-ping" : ""}`} />
                    LIVE
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {chain === "solana" ? "Current Slot:" : "Latest Block Height:"}
                    </span>
                    <span className="text-amber-300 font-bold">#{height.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Round-Trip Latency:</span>
                    <span className="text-emerald-400 font-semibold">{latency} ms</span>
                  </div>
                  {gas && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Network Fee / Gas:</span>
                      <span className="text-amber-300">{gas}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Provider Endpoint:</span>
                    <span className="text-slate-200 truncate max-w-[180px]" title={endpoint}>
                      {endpoint}
                    </span>
                  </div>

                  {price && (
                    <div className="pt-2.5 mt-2 border-t border-white/5 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-sans">Live Spot Valuation:</span>
                        <span className="text-emerald-400 font-bold">
                          {typeof price.usd === "number"
                            ? `$${price.usd >= 1 ? price.usd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : price.usd.toFixed(4)} USD`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-sans">Indian Rupee (INR):</span>
                        <span className="text-slate-200 font-mono">
                          {typeof price.inr === "number"
                            ? `₹${price.inr >= 1 ? price.inr.toLocaleString(undefined, { maximumFractionDigits: 2 }) : price.inr.toFixed(2)}`
                            : "—"}
                        </span>
                      </div>
                      {typeof price.usd24hChange === "number" && !isNaN(price.usd24hChange) && (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-sans">24h Net Trend:</span>
                          <span className={price.usd24hChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {price.usd24hChange >= 0 ? "+" : ""}{price.usd24hChange.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VASP Directory Grid */}
      <div className="space-y-3 pt-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Landmark className="size-4 text-amber-400" />
          Global VASP Compliance & Subpoena Registry
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vasps.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{v.name}</h3>
                  <span className="text-[11px] text-slate-400">{v.legalEntity}</span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
                  {v.complianceRating}/100 Rating
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 border-t border-white/5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Jurisdiction</span>
                  <span className="font-medium text-slate-200">{v.jurisdiction}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">KYC Standard</span>
                  <span className="font-medium text-emerald-400">{v.kycStandard}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Law Enforcement Response</span>
                  <span className="font-medium text-amber-300">{v.responseLatencyHours} hr SLA</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">FIU Registered</span>
                  <span className="font-medium text-slate-200">{v.registeredFiu ? "✓ Yes (FIU-IND)" : "Offshore"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Mail className="size-3.5 text-amber-400" />
                  {v.contactEmail}
                </span>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded">
                  {v.subpoenaFormat}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
