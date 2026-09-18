import React, { useState } from "react";
import type { InvestigationCase, CaseStatus, Role } from "@/lib/types";
import { generateCaseInvestigationData } from "@/lib/store";
import { GraphCanvas } from "./GraphCanvas";
import {
  usd,
  usdFull,
  relTime,
  dateTime,
  titleFromTypology,
  riskColorVar,
  STATUS_LABEL,
  CHAIN_LABEL,
  shortAddr,
} from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";
import { useMultiChain } from "@/lib/useMultiChain";
import type { LiveAddressProbeResult } from "@/lib/multichain-live";
import {
  ArrowLeft,
  Share2,
  FileText,
  Route,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  MessageSquare,
  Activity,
  Copy,
  Check,
  ExternalLink,
  Send,
  AlertCircle,
  Landmark,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Lock,
  RefreshCw,
  Globe,
} from "lucide-react";

interface CaseDetailViewProps {
  investigationCase: InvestigationCase;
  currentRole: Role;
  onBack: () => void;
  onUpdateStatus: (caseId: string, newStatus: CaseStatus) => void;
  onAddNote: (caseId: string, noteText: string) => void;
}

export function CaseDetailView({
  investigationCase,
  currentRole,
  onBack,
  onUpdateStatus,
  onAddNote,
}: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "graph" | "fundflow" | "journey" | "intel" | "evidence" | "actionpack"
  >("overview");
  const [copied, setCopied] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [verifyingEvidence, setVerifyingEvidence] = useState(false);
  const [evidenceVerified, setEvidenceVerified] = useState<boolean | null>(null);

  const { probeAddress } = useMultiChain();
  const [liveProbe, setLiveProbe] = useState<LiveAddressProbeResult | null>(null);
  const [isProbingOnChain, setIsProbingOnChain] = useState(false);

  const handleProbeOnChain = async () => {
    setIsProbingOnChain(true);
    try {
      const res = await probeAddress(investigationCase.reportedWallet, investigationCase.chain);
      setLiveProbe(res);
    } catch (e) {
      console.error("Failed to probe on-chain:", e);
    } finally {
      setIsProbingOnChain(false);
    }
  };

  const intelData = generateCaseInvestigationData(investigationCase);
  const canUpdateStatus = PERMISSIONS.updateStatus(currentRole);
  const canAddNotes = PERMISSIONS.addNotes(currentRole);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(investigationCase.id, newNote.trim());
    setNewNote("");
  };

  const handleVerifyEvidence = () => {
    setVerifyingEvidence(true);
    setTimeout(() => {
      setVerifyingEvidence(false);
      setEvidenceVerified(true);
    }, 600);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ArrowLeft className="size-3.5" /> Back to Cases
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
            {investigationCase.id}
          </span>
          <span className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
            {investigationCase.title}
          </span>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          {canUpdateStatus ? (
            <select
              value={investigationCase.status}
              onChange={(e) => onUpdateStatus(investigationCase.id, e.target.value as CaseStatus)}
              className="rounded-lg border border-amber-400/30 bg-[#161a24] px-3 py-1.5 text-xs font-semibold text-amber-300 focus:outline-none"
            >
              {(Object.keys(STATUS_LABEL) as CaseStatus[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {STATUS_LABEL[investigationCase.status]}
            </span>
          )}
        </div>
      </div>

      {/* Case Header Banner */}
      <div className="rounded-2xl border border-white/10 bg-[#161a24] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {investigationCase.title}
              </h1>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                style={{
                  color: riskColorVar(investigationCase.riskBand),
                  backgroundColor: `color-mix(in oklch, ${riskColorVar(investigationCase.riskBand)} 16%, transparent)`,
                  borderColor: `color-mix(in oklch, ${riskColorVar(investigationCase.riskBand)} 35%, transparent)`,
                }}
              >
                {investigationCase.riskBand} Risk · Score {investigationCase.riskScore}/100
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span>FIR/Complaint Ref: <strong className="text-slate-200">{investigationCase.complaintRef}</strong></span>
              <span>•</span>
              <span>Chain: <strong className="text-slate-200 uppercase">{CHAIN_LABEL[investigationCase.chain]}</strong></span>
              <span>•</span>
              <span>Typology: <strong className="text-slate-200">{titleFromTypology(investigationCase.typology)}</strong></span>
              <span>•</span>
              <span>Lead: <strong className="text-slate-200">{investigationCase.investigator}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-right space-y-0.5">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Reported Loss</span>
              <div className="text-xl font-bold font-mono text-white">{usd(investigationCase.reportedLossUsd)}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-right space-y-0.5">
              <span className="text-[10px] uppercase text-emerald-300 font-semibold tracking-wider">Identified Traceable</span>
              <div className="text-xl font-bold font-mono text-emerald-400">{usd(investigationCase.traceableUsd)}</div>
            </div>
          </div>
        </div>

        {/* Primary Wallet Copier & Live Blockchain Probe */}
        <div className="space-y-2 bg-black/30 rounded-xl p-3 border border-white/5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-400 shrink-0">Primary Suspect Wallet:</span>
              <span className="font-mono text-amber-300 font-medium truncate">{investigationCase.reportedWallet}</span>
              <button
                onClick={() => handleCopy(investigationCase.reportedWallet)}
                className="text-slate-400 hover:text-white transition p-1 shrink-0"
                title="Copy address"
              >
                {copied === investigationCase.reportedWallet ? (
                  <Check className="size-3.5 text-green-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Recovery Probability:</span>
                <span className="font-mono font-bold text-amber-400">
                  {Math.round(investigationCase.recoveryProbability * 100)}%
                </span>
              </div>

              <button
                onClick={handleProbeOnChain}
                disabled={isProbingOnChain}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 px-3 py-1 text-xs font-semibold transition disabled:opacity-50"
              >
                <RefreshCw className={`size-3 ${isProbingOnChain ? "animate-spin" : ""}`} />
                <span>{isProbingOnChain ? "Querying RPC..." : "Probe Live On-Chain"}</span>
              </button>
            </div>
          </div>

          {/* Live On-Chain Probe Result Banner */}
          {liveProbe && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">Verified On-Chain:</span>
                <span className="font-bold text-white font-mono">{liveProbe.balanceFormatted}</span>
                <span className="text-emerald-400 font-bold font-mono">({usd(liveProbe.usdValue)})</span>
                {liveProbe.inrValue > 0 && (
                  <span className="text-slate-400 text-[11px] font-mono">
                    ₹{liveProbe.inrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} INR
                  </span>
                )}
                <span className="text-slate-500 text-[10px]">· Verified {new Date(liveProbe.queriedAt).toLocaleTimeString()}</span>
              </div>

              {liveProbe.explorerUrl && (
                <a
                  href={liveProbe.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-white underline text-[11px] shrink-0"
                >
                  <span>Inspect on Explorer</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: "overview", label: "Overview & Evidence", icon: FileText },
          { id: "graph", label: "Transaction Graph", icon: Share2 },
          { id: "fundflow", label: "Fund Flow Ledger", icon: Activity },
          { id: "journey", label: "Fraud Journey", icon: Route },
          { id: "intel", label: "VASP Attribution & Patterns", icon: Landmark },
          { id: "evidence", label: "SHA-256 Chain of Custody", icon: ShieldCheck },
          { id: "actionpack", label: "ActionPack (Freeze Packet)", icon: ClipboardList },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg transition whitespace-nowrap ${
                isActive
                  ? "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Victim Complaint Section */}
            <div className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="size-4 text-amber-400" />
                Victim Complaint Statement & Ingestion
              </h3>
              <div className="rounded-lg bg-black/40 border border-white/5 p-4 text-xs text-slate-300 leading-relaxed font-sans">
                "{investigationCase.complaintText}"
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Extracted Suspect Wallets ({investigationCase.extractedWallets.length}):
                </div>
                <div className="space-y-1.5">
                  {investigationCase.extractedWallets.map((w, i) => (
                    <div
                      key={w}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-slate-300 border border-white/5"
                    >
                      <span className="truncate">
                        <strong className="text-amber-400 font-sans mr-2">#{i + 1}</strong>
                        {w}
                      </span>
                      <button
                        onClick={() => handleCopy(w)}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy wallet"
                      >
                        {copied === w ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Summary of Graph */}
            <div className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Share2 className="size-4 text-amber-400" />
                  Primary Fund Flow Preview
                </h3>
                <button
                  onClick={() => setActiveTab("graph")}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Open Fullscreen Graph →
                </button>
              </div>

              <GraphCanvas nodes={intelData.graph.nodes} edges={intelData.graph.edges} />
            </div>
          </div>

          {/* Notes & Activity Log */}
          <div className="space-y-6">
            {/* Notes Panel */}
            <div className="rounded-xl border border-white/10 bg-[#161a24] p-4.5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="size-4 text-amber-400" />
                Case Notes & Observations
              </h3>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {investigationCase.notes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No investigator notes recorded yet.</p>
                ) : (
                  investigationCase.notes.map((n) => (
                    <div key={n.id} className="rounded-lg bg-black/40 border border-white/5 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-200">{n.author}</span>
                        <span>{relTime(n.createdAt)}</span>
                      </div>
                      <p className="text-slate-300">{n.body}</p>
                    </div>
                  ))
                )}
              </div>

              {canAddNotes && (
                <form onSubmit={handleAddNoteSubmit} className="space-y-2 pt-2 border-t border-white/10">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add forensic finding or update..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newNote.trim()}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold text-xs transition"
                  >
                    <Send className="size-3" /> Post Note
                  </button>
                </form>
              )}
            </div>

            {/* Audit Trail */}
            <div className="rounded-xl border border-white/10 bg-[#161a24] p-4.5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="size-4 text-amber-400" />
                Case Activity Audit Trail
              </h3>
              <div className="space-y-2 text-xs">
                {investigationCase.activity.map((act) => (
                  <div key={act.id} className="border-l-2 border-amber-400/40 pl-3 py-1 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300">{act.action.replace(/_/g, " ")}</span>
                      <span className="text-slate-500 text-[10px]">{relTime(act.createdAt)}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{act.detail}</p>
                    <span className="text-[10px] text-slate-500">By: {act.actor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Graph */}
      {activeTab === "graph" && (
        <div className="space-y-4">
          <GraphCanvas nodes={intelData.graph.nodes} edges={intelData.graph.edges} />
        </div>
      )}

      {/* TAB CONTENT: Fund Flow Ledger */}
      {activeTab === "fundflow" && (
        <div className="rounded-xl border border-white/10 bg-[#161a24] overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Hop-by-Hop Transaction Ledger</h3>
            <p className="text-xs text-slate-400">
              Granular movement of funds across all verified addresses in this investigation graph.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-black/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Tx Hash</th>
                  <th className="p-3">From Address</th>
                  <th className="p-3">To Address</th>
                  <th className="p-3">Transfer Type</th>
                  <th className="p-3">Crypto Amount</th>
                  <th className="p-3 text-right">USD Value</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {intelData.graph.edges.map((edge: any) => (
                  <tr key={edge.id} className="hover:bg-white/5 transition">
                    <td className="p-3 text-amber-300 truncate max-w-[120px]">
                      {edge.txHash}
                    </td>
                    <td className="p-3 truncate max-w-[160px] text-slate-400">
                      {shortAddr(edge.source, 8, 6)}
                    </td>
                    <td className="p-3 truncate max-w-[160px] text-slate-300 font-semibold">
                      {shortAddr(edge.target, 8, 6)}
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">
                        {edge.kind}
                      </span>
                    </td>
                    <td className="p-3">
                      {(Number(edge.amount) || 0).toFixed(3)} {edge.asset}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {usd(edge.usdValue)}
                    </td>
                    <td className="p-3 text-[11px] text-slate-400 font-sans">
                      {dateTime(edge.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Fraud Journey */}
      {activeTab === "journey" && (
        <div className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Fraud Journey Reconstruction</h3>
            <p className="text-xs text-slate-400">
              Chronological timeline tracking stolen victim assets through intermediate obfuscation to identified cashout portals.
            </p>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-amber-400 before:to-emerald-500">
            {intelData.journey.map((step: any) => (
              <div key={step.step} className="relative space-y-1.5">
                <div className="absolute -left-[27px] top-1 size-5 rounded-full border-2 border-[#161a24] bg-amber-400 flex items-center justify-center text-[10px] font-bold text-black shadow-md">
                  {step.step}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                  <span className="font-mono text-xs font-bold text-amber-400">{usd(step.usdValue)}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 pt-0.5">
                  <span className="text-slate-500">Address:</span>
                  <span className="text-amber-300">{step.address}</span>
                  <button onClick={() => handleCopy(step.address)} className="hover:text-white p-0.5">
                    {copied === step.address ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Intelligence & VASP Attribution */}
      {activeTab === "intel" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VASP Attribution Card */}
          <div className="rounded-xl border border-amber-400/40 bg-[#161a24] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="size-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Identified VASP Attribution</h3>
              </div>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300 font-mono">
                98% Attribution Match
              </span>
            </div>

            {intelData.vaspAttribution && (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-black/40 border border-white/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Exchange:</span>
                    <span className="font-bold text-white text-sm">{intelData.vaspAttribution.vasp.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Jurisdiction:</span>
                    <span className="text-slate-200">{intelData.vaspAttribution.vasp.jurisdiction}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">KYC Verification Standard:</span>
                    <span className="font-semibold text-amber-400">{intelData.vaspAttribution.vasp.kycLevel} KYC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Law Enforcement Cooperation:</span>
                    <span className="font-semibold text-emerald-400">
                      {intelData.vaspAttribution.vasp.cooperationLevel} COOPERATION
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-300">Identified Deposit Gateway:</span>
                  <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 font-mono text-[11px] text-amber-300">
                    <span className="truncate">{intelData.vaspAttribution.depositAddress}</span>
                    <button
                      onClick={() => handleCopy(intelData.vaspAttribution!.depositAddress)}
                      className="p-1 hover:text-white"
                    >
                      {copied === intelData.vaspAttribution.depositAddress ? (
                        <Check className="size-3 text-green-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                  <span className="font-semibold text-amber-300">Legal Recommendation:</span>
                  <p className="text-slate-300">{intelData.vaspAttribution.recommendedAction}</p>
                </div>
              </div>
            )}
          </div>

          {/* Laundering Patterns Card */}
          <div className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-amber-400" />
              <h3 className="text-base font-semibold text-white">Detected Laundering Typologies</h3>
            </div>

            <div className="space-y-3">
              {intelData.patterns.map((p: any) => (
                <div key={p.name} className="rounded-lg border border-white/5 bg-black/40 p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white">{p.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-400/20 text-amber-300"
                      }`}
                    >
                      {p.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{p.description}</p>
                  <div className="text-[10px] text-slate-400">
                    Confidence: <strong className="text-amber-400">{Math.round(p.confidence * 100)}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SHA-256 Chain of Custody */}
      {activeTab === "evidence" && (
        <div className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="size-5 text-amber-400" />
                Cryptographic Evidence Chain of Custody
              </h3>
              <p className="text-xs text-slate-400">
                Tamper-evident SHA-256 chained evidence records suitable for court submission under Indian Evidence Act § 65B / Federal Rule 902.
              </p>
            </div>

            <button
              onClick={handleVerifyEvidence}
              disabled={verifyingEvidence}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition"
            >
              {verifyingEvidence ? (
                "Verifying Chained Hashes..."
              ) : evidenceVerified ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-400" /> Hashes Validated (100% Intact)
                </>
              ) : (
                <>
                  <Lock className="size-3.5" /> Validate Chain Integrity
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {intelData.evidence.map((ev: any, idx: number) => (
              <div key={ev.id} className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded text-[11px]">
                      Block #{idx + 1}
                    </span>
                    <h4 className="font-semibold text-white">{ev.title}</h4>
                  </div>
                  <span className="text-slate-400 text-[11px]">{dateTime(ev.createdAt)}</span>
                </div>

                <p className="text-slate-300">{ev.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-white/5 font-mono text-[11px]">
                  <div className="bg-white/5 p-2 rounded truncate">
                    <span className="text-slate-500 block text-[9px] uppercase">SHA-256 Content Hash:</span>
                    <span className="text-emerald-400 font-semibold">{ev.contentHash}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded truncate">
                    <span className="text-slate-500 block text-[9px] uppercase">Previous Block Hash:</span>
                    <span className="text-slate-400">{ev.prevHash}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ActionPack */}
      {activeTab === "actionpack" && (
        <div className="rounded-xl border border-white/10 bg-[#161a24] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ClipboardList className="size-5 text-amber-400" />
                VASP Subpoena & Emergency Freeze Request
              </h3>
              <p className="text-xs text-slate-400">
                Official statutory freeze notice drafted for immediate transmission to exchange legal compliance desk.
              </p>
            </div>

            <button
              onClick={() =>
                handleCopy(`EMERGENCY CRYPTOCURRENCY ASSET FREEZE NOTICE
CASE REFERENCE: ${investigationCase.id}
FIR/COMPLAINT: ${investigationCase.complaintRef}
TARGET VASP: ${intelData.vaspAttribution?.vasp.name}
DEPOSIT ADDRESS: ${intelData.vaspAttribution?.depositAddress}
AMOUNT TO PRESERVE: ${usdFull(investigationCase.traceableUsd)}
PRIMARY SUSPECT: ${investigationCase.reportedWallet}
LEAD INVESTIGATOR: ${investigationCase.investigator}`)
              }
              className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 text-xs font-semibold text-black transition"
            >
              <Copy className="size-3.5" /> Copy Freeze Subpoena Packet
            </button>
          </div>

          <div className="rounded-xl bg-black/60 border border-white/10 p-5 font-mono text-xs text-slate-300 space-y-3 leading-relaxed">
            <div className="text-amber-400 font-bold border-b border-white/10 pb-2">
              FORMAL DIRECTIVE: PRESERVATION & FREEZING OF CRYPTO-ASSETS
            </div>
            <div>
              <strong>TO:</strong> {intelData.vaspAttribution?.vasp.name} Legal Compliance Department<br />
              <strong>JURISDICTION:</strong> {intelData.vaspAttribution?.vasp.jurisdiction}<br />
              <strong>CASE REF:</strong> {investigationCase.id} (FIR Ref: {investigationCase.complaintRef})<br />
              <strong>DATE:</strong> {new Date().toUTCString()}
            </div>

            <p>
              Under applicable statutory provisions governing cyber financial crime investigation, notice is hereby given that the following cryptocurrency deposit address has been conclusively identified via automated blockchain multi-hop graph analytics as the destination of stolen victim assets:
            </p>

            <div className="bg-white/5 p-3 rounded border border-white/10 space-y-1">
              <div><strong>TARGET DEPOSIT ADDRESS:</strong> {intelData.vaspAttribution?.depositAddress}</div>
              <div><strong>NETWORK:</strong> {investigationCase.chain.toUpperCase()}</div>
              <div><strong>TOTAL FRAUDULENT VOLUME:</strong> {usdFull(investigationCase.traceableUsd)}</div>
              <div><strong>ORIGINATING SUSPECT WALLET:</strong> {investigationCase.reportedWallet}</div>
            </div>

            <p>
              You are hereby requested to IMMEDIATELY FREEZE and PRESERVE any accounts, sub-accounts, or fiat balances associated with the above deposit address, and preserve all KYC records, IP access logs, login timestamps, and bank account withdrawal destinations pending formal court seizure order.
            </p>

            <div className="pt-3 border-t border-white/10 text-slate-400 text-[11px]">
              INVESTIGATOR SIGN-OFF: {investigationCase.investigator} · TraceChain Verified Incident #
              {investigationCase.id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
