import React, { useState, useMemo } from "react";
import type { InvestigationCase, CaseStatus, RiskBand, Chain } from "@/lib/types";
import { usd, relTime, titleFromTypology, riskColorVar, STATUS_LABEL, CHAIN_LABEL } from "@/lib/format";
import {
  FolderKanban,
  Search,
  FilePlus2,
  Filter,
  ArrowUpDown,
  Coins,
  Users,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";

interface CasesListViewProps {
  cases: InvestigationCase[];
  onSelectCase: (caseId: string) => void;
  onOpenCreateCase: () => void;
}

export function CasesListView({ cases, onSelectCase, onOpenCreateCase }: CasesListViewProps) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | "ALL">("ALL");
  const [selectedRisk, setSelectedRisk] = useState<RiskBand | "ALL">("ALL");
  const [selectedChain, setSelectedChain] = useState<Chain | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"priority" | "risk" | "loss" | "recent">("priority");

  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;
        if (selectedRisk !== "ALL" && c.riskBand !== selectedRisk) return false;
        if (selectedChain !== "ALL" && c.chain !== selectedChain) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            c.id.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.reportedWallet.toLowerCase().includes(q) ||
            c.complaintRef.toLowerCase().includes(q) ||
            c.typology.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") return b.priorityScore - a.priorityScore;
        if (sortBy === "risk") return b.riskScore - a.riskScore;
        if (sortBy === "loss") return b.reportedLossUsd - a.reportedLossUsd;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [cases, search, selectedStatus, selectedRisk, selectedChain, sortBy]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
            <FolderKanban className="size-5 text-amber-400" />
            Cryptocurrency Fraud Investigations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            All victim-reported cryptocurrency fraud dossiers triaged by AI Priority Score and VASP recovery probability.
          </p>
        </div>

        <button
          onClick={onOpenCreateCase}
          className="flex items-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-semibold text-black transition shrink-0 active:scale-[0.99]"
        >
          <FilePlus2 className="size-4" />
          New Investigation
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 rounded-xl border border-white/[0.08] bg-[#0f121a] p-3 text-xs">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by case ID, suspect wallet, or complaint reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-black/30 pl-8.5 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as CaseStatus | "ALL")}
          className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="ANALYZING">Analyzing</option>
          <option value="TRACING">Tracing</option>
          <option value="VASP_IDENTIFIED">VASP Identified</option>
          <option value="ACTION_REQUIRED">Action Required</option>
          <option value="FREEZE_REVIEW">Freeze Review</option>
          <option value="MONITORING">Monitoring</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={selectedRisk}
          onChange={(e) => setSelectedRisk(e.target.value as RiskBand | "ALL")}
          className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="ALL">All Risk Bands</option>
          <option value="CRITICAL">Critical Risk (90-100)</option>
          <option value="HIGH">High Risk (70-89)</option>
          <option value="MEDIUM">Medium Risk (40-69)</option>
          <option value="LOW">Low Risk (&lt;40)</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="priority">Sort: AI Priority Score</option>
          <option value="risk">Sort: Threat Risk Score</option>
          <option value="loss">Sort: Loss Amount ($)</option>
          <option value="recent">Sort: Most Recently Updated</option>
        </select>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#161a24] p-12 text-center text-slate-400 space-y-3">
            <Shield className="size-8 mx-auto text-slate-500 opacity-60" />
            <div className="text-sm font-semibold text-white">No matching investigations found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search criteria, or click New Investigation to register a new victim complaint.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c.id)}
              className="group rounded-xl border border-white/[0.08] bg-[#0f121a] hover:bg-[#141824] hover:border-amber-400/30 p-4 transition-all cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                      {c.id}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-amber-300 transition">
                      {c.title}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      Ref: {c.complaintRef}
                    </span>
                  </div>

                  <p className="font-mono text-xs text-amber-300/80 truncate">
                    Suspect Wallet: {c.reportedWallet}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                    <span
                      className="px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider font-mono"
                      style={{
                        color: riskColorVar(c.riskBand),
                        backgroundColor: `color-mix(in oklch, ${riskColorVar(c.riskBand)} 16%, transparent)`,
                        borderColor: `color-mix(in oklch, ${riskColorVar(c.riskBand)} 35%, transparent)`,
                      }}
                    >
                      {c.riskBand} · {c.riskScore}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-white/[0.04] border border-white/[0.06] text-slate-300">
                      {STATUS_LABEL[c.status]}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-white/[0.04] border border-white/[0.06] text-slate-300 uppercase font-mono">
                      {CHAIN_LABEL[c.chain]}
                    </span>

                    <span className="text-slate-400 text-xs">
                      {titleFromTypology(c.typology)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-5 border-t lg:border-t-0 border-white/[0.06] pt-2.5 lg:pt-0 shrink-0">
                  <div className="space-y-0.5 text-left lg:text-right">
                    <div className="text-sm font-bold font-mono text-white">{usd(c.reportedLossUsd)}</div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      Traceable: {usd(c.traceableUsd)}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg border border-amber-400/25 bg-amber-400/5">
                    <span className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider font-mono">PRIORITY</span>
                    <span className="text-sm font-bold font-mono text-amber-400">{c.priorityScore}</span>
                  </div>

                  <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-amber-400 transition" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
