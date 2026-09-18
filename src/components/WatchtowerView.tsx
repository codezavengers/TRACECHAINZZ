import React, { useState, useEffect } from "react";
import type { WatchlistWallet, Chain } from "@/lib/types";
import { CHAIN_LABEL, usd, relTime, shortAddr } from "@/lib/format";
import { useMultiChain } from "@/lib/useMultiChain";
import {
  ShieldAlert,
  PlusCircle,
  Bell,
  Search,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Eye,
  Activity,
  RefreshCw,
  ExternalLink,
  Zap,
} from "lucide-react";

interface WatchtowerViewProps {
  watchlist: WatchlistWallet[];
  onAddWallet: (item: Partial<WatchlistWallet> & Pick<WatchlistWallet, "address" | "chain">) => void;
  onRemoveWallet: (id: string) => void;
  onSelectCase?: (caseId: string) => void;
}

interface LiveWalletBalance {
  nativeBalance: number;
  balanceFormatted: string;
  usdValue: number;
  inrValue: number;
  isLive: boolean;
  explorerUrl?: string;
}

export function WatchtowerView({
  watchlist,
  onAddWallet,
  onRemoveWallet,
  onSelectCase,
}: WatchtowerViewProps) {
  const { probeAddress, isProbing } = useMultiChain();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddr, setNewAddr] = useState("");
  const [newChain, setNewChain] = useState<Chain>("ethereum");
  const [newLabel, setNewLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [liveBalances, setLiveBalances] = useState<Record<string, LiveWalletBalance>>({});
  const [isPollingAll, setIsPollingAll] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const pollAllOnChain = async () => {
    setIsPollingAll(true);
    const updates: Record<string, LiveWalletBalance> = {};
    for (const w of watchlist) {
      try {
        const res = await probeAddress(w.address, w.chain);
        updates[w.address] = {
          nativeBalance: res.balanceNative,
          balanceFormatted: res.balanceFormatted,
          usdValue: res.usdValue,
          inrValue: res.inrValue,
          isLive: res.isLive,
          explorerUrl: res.explorerUrl,
        };
      } catch (err) {
        console.error("Watchtower probe error:", err);
      }
    }
    setLiveBalances((prev) => ({ ...prev, ...updates }));
    setIsPollingAll(false);
  };

  useEffect(() => {
    pollAllOnChain();
  }, [watchlist.length]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.trim()) return;

    const trimmedAddr = newAddr.trim();
    let initialUsd = 0;
    let initialBalance = 0;

    try {
      const probeRes = await probeAddress(trimmedAddr, newChain);
      initialUsd = probeRes.usdValue;
      initialBalance = probeRes.balanceNative;
      setLiveBalances((prev) => ({
        ...prev,
        [trimmedAddr]: {
          nativeBalance: probeRes.balanceNative,
          balanceFormatted: probeRes.balanceFormatted,
          usdValue: probeRes.usdValue,
          inrValue: probeRes.inrValue,
          isLive: probeRes.isLive,
          explorerUrl: probeRes.explorerUrl,
        },
      }));
    } catch {
      // fallback
    }

    onAddWallet({
      address: trimmedAddr,
      chain: newChain,
      label: newLabel.trim() || "Monitored Suspect Address",
      status: "ACTIVE",
      riskScore: 88,
      balance: initialBalance,
      usdBalance: initialUsd,
      balanceUsd: initialUsd,
      addedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    });

    setNewAddr("");
    setNewLabel("");
    setShowAddModal(false);
  };

  const filtered = watchlist.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      w.address.toLowerCase().includes(q) ||
      w.label.toLowerCase().includes(q) ||
      (w.caseId && w.caseId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
            <ShieldAlert className="size-5 text-amber-400" />
            Watchtower Suspect Sentinel
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Automated continuous mempool & block polling for balance changes, burner fan-outs, and VASP deposit triggers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={pollAllOnChain}
            disabled={isPollingAll}
            className="flex items-center gap-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/25 px-3 py-2 text-xs font-semibold transition shrink-0"
          >
            <RefreshCw className={`size-3.5 ${isPollingAll ? "animate-spin" : ""}`} />
            {isPollingAll ? "Polling Blockchains..." : "Poll Live Blockchains"}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-semibold text-black transition shrink-0 active:scale-[0.99]"
          >
            <PlusCircle className="size-4" /> Add Wallet
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-3 text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by monitored wallet address, label, or linked case ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-black/30 pl-8.5 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px] font-mono">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Monitored Address</th>
                <th className="p-3">Network</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Current Balance</th>
                <th className="p-3">Linked Case</th>
                <th className="p-3">Last Checked</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "TRIGGERED"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : item.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          item.status === "TRIGGERED"
                            ? "bg-rose-400 animate-ping"
                            : item.status === "ACTIVE"
                              ? "bg-emerald-400"
                              : "bg-slate-400"
                        }`}
                      />
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white">{item.label}</div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-amber-300">
                        <span>{shortAddr(item.address, 10, 8)}</span>
                        <button onClick={() => handleCopy(item.address)} className="hover:text-white p-0.5">
                          {copied === item.address ? (
                            <Check className="size-3 text-green-400" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 capitalize font-medium">{CHAIN_LABEL[item.chain]}</td>

                  <td className="p-3.5 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (item.riskScore ?? 80) > 85 ? "text-rose-400 bg-rose-500/10" : "text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {item.riskScore ?? 80}/100
                    </span>
                  </td>

                  <td className="p-3.5 font-mono">
                    {liveBalances[item.address] ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{usd(liveBalances[item.address].usdValue)}</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-sans px-1 py-0.2 rounded font-bold">
                            LIVE
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-300 flex items-center gap-1">
                          <span>{liveBalances[item.address].balanceFormatted}</span>
                          {liveBalances[item.address].explorerUrl && (
                            <a
                              href={liveBalances[item.address].explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-white"
                              title="Inspect on live blockchain explorer"
                            >
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{usd(item.balanceUsd)}</div>
                        <div className="text-[10px] text-slate-400">
                          {isPollingAll ? (
                            <span className="animate-pulse text-amber-400">Querying on-chain...</span>
                          ) : (
                            <span>{item.balance} {item.chain === "bitcoin" ? "BTC" : item.chain === "ethereum" ? "ETH" : "tokens"}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="p-3.5">
                    {item.caseId ? (
                      <button
                        onClick={() => onSelectCase?.(item.caseId!)}
                        className="text-amber-400 hover:text-amber-300 font-mono font-semibold"
                      >
                        {item.caseId}
                      </button>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="p-3.5 text-slate-400 text-[11px]">{relTime(item.lastCheckedAt)}</td>

                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => onRemoveWallet(item.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 transition"
                      title="Remove from Watchtower"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161a24] p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="size-4 text-amber-400" />
              Add Suspect Address to Sentinel
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Suspect Address *</label>
                <input
                  type="text"
                  value={newAddr}
                  onChange={(e) => setNewAddr(e.target.value)}
                  required
                  placeholder="0x... / bc1... / T..."
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Blockchain Network</label>
                <select
                  value={newChain}
                  onChange={(e) => setNewChain(e.target.value as Chain)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none capitalize"
                >
                  {(Object.keys(CHAIN_LABEL) as Chain[]).map((c) => (
                    <option key={c} value={c}>
                      {CHAIN_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Investigator Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Sha Zhu Pan Primary Burner Node"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAddr.trim()}
                  className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold"
                >
                  Add to Sentinel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
