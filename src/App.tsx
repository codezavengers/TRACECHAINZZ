import React, { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DashboardView } from "@/components/DashboardView";
import { CasesListView } from "@/components/CasesListView";
import { CaseDetailView } from "@/components/CaseDetailView";
import { WalletInvestigationView } from "@/components/WalletInvestigationView";
import { WatchtowerView } from "@/components/WatchtowerView";
import { AssistantView } from "@/components/AssistantView";
import { IntegrationsView } from "@/components/IntegrationsView";
import { ActionPackView } from "@/components/ActionPackView";
import { CreateCaseModal } from "@/components/CreateCaseModal";
import {
  INITIAL_CASES,
  INITIAL_ALERTS,
  INITIAL_WATCHLIST,
  AVAILABLE_USERS,
  SAMPLE_VASPS,
} from "@/lib/store";
import type {
  InvestigationCase,
  Alert,
  WatchlistWallet,
  UserProfile,
  CaseStatus,
  Chain,
} from "@/lib/types";
import { Shield, Lock, Users, Activity, CheckCircle2 } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [cases, setCases] = useState<InvestigationCase[]>(INITIAL_CASES);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [watchlist, setWatchlist] = useState<WatchlistWallet[]>(INITIAL_WATCHLIST);
  const [currentUser, setCurrentUser] = useState<UserProfile>(AVAILABLE_USERS[0]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentView("case-detail");
  };

  const handleCreateCase = (newCase: InvestigationCase) => {
    setCases((prev) => [newCase, ...prev]);
    setIsCreateCaseOpen(false);
    setSelectedCaseId(newCase.id);
    setCurrentView("case-detail");
  };

  const handleUpdateStatus = (caseId: string, newStatus: CaseStatus) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: newStatus,
              updatedAt: new Date().toISOString(),
              activity: [
                {
                  id: `act-${Date.now()}`,
                  action: "STATUS_UPDATE",
                  detail: `Investigation status transitioned to ${newStatus}`,
                  actor: currentUser.name,
                  createdAt: new Date().toISOString(),
                  timestamp: new Date().toISOString(),
                },
                ...c.activity,
              ],
            }
          : c
      )
    );
  };

  const handleAddNote = (caseId: string, noteText: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              updatedAt: new Date().toISOString(),
              notes: [
                {
                  id: `note-${Date.now()}`,
                  body: noteText,
                  text: noteText,
                  author: currentUser.name,
                  createdAt: new Date().toISOString(),
                  timestamp: new Date().toISOString(),
                },
                ...c.notes,
              ],
            }
          : c
      )
    );
  };

  const handleAddWalletToWatchlist = (
    item: Partial<WatchlistWallet> & Pick<WatchlistWallet, "address" | "chain">
  ) => {
    const newEntry: WatchlistWallet = {
      id: `w-${Date.now()}`,
      address: item.address,
      chain: item.chain,
      label: item.label || "Suspect Target Wallet",
      riskBand: item.riskBand || "HIGH",
      riskScore: item.riskScore ?? 85,
      status: "ACTIVE",
      caseId: item.caseId,
      lastActive: new Date().toISOString(),
      balanceUsd: item.balanceUsd ?? 0,
      lastCheckedAt: new Date().toISOString(),
      addedAt: new Date().toISOString(),
      notes: item.notes || "Added from investigation probe",
    };
    setWatchlist((prev) => [newEntry, ...prev]);
  };

  const handleRemoveWalletFromWatchlist = (id: string) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  const handleOpenCreateCaseWithAddress = (addr: string, chain: Chain) => {
    const freshCase: InvestigationCase = {
      id: `TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `Suspect Entity Dossier (${chain.toUpperCase()} - ${addr.slice(0, 8)}...)`,
      description: `Formal law enforcement dossier registered for address ${addr} on ${chain} network.`,
      reportedWallet: addr,
      chain,
      status: "NEW",
      riskBand: "HIGH",
      riskScore: 85,
      priorityScore: 82,
      typology: "INVESTMENT_FRAUD",
      reportedLossUsd: 0,
      traceableUsd: 0,
      complaintRef: `FIR-${Date.now().toString().slice(-6)}`,
      complaintText: `Automated investigation initiated from live on-chain forensic probe on ${addr}.`,
      investigator: currentUser.name,
      recoveryProbability: 0.75,
      extractedWallets: [addr],
      assignedTo: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          action: "CASE_CREATED",
          detail: `Case initialized from on-chain probe for ${addr}`,
          actor: currentUser.name,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        },
      ],
    };
    handleCreateCase(freshCase);
  };

  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  return (
    <AppShell
      currentView={currentView}
      onNavigate={(view) => {
        if (view === "cases" && selectedCaseId) {
          // If viewing cases list, reset detail view
          setSelectedCaseId(null);
        }
        setCurrentView(view);
      }}
      currentUser={currentUser}
      availableUsers={AVAILABLE_USERS}
      onSwitchUser={(user) => setCurrentUser(user)}
      alerts={alerts}
      onOpenCreateCase={() => setIsCreateCaseOpen(true)}
    >
      {/* Dynamic Views */}
      {currentView === "dashboard" && (
        <DashboardView
          cases={cases}
          alerts={alerts}
          onSelectCase={handleSelectCase}
          onNavigate={(view) => setCurrentView(view)}
          onOpenCreateCase={() => setIsCreateCaseOpen(true)}
        />
      )}

      {currentView === "cases" && (
        <CasesListView
          cases={cases}
          onSelectCase={handleSelectCase}
          onOpenCreateCase={() => setIsCreateCaseOpen(true)}
        />
      )}

      {currentView === "case-detail" && activeCase && (
        <CaseDetailView
          investigationCase={activeCase}
          currentRole={currentUser.role}
          onBack={() => setCurrentView("cases")}
          onUpdateStatus={handleUpdateStatus}
          onAddNote={handleAddNote}
        />
      )}

      {currentView === "wallet" && (
        <WalletInvestigationView
          onOpenCreateCaseWithAddress={handleOpenCreateCaseWithAddress}
          onAddToWatchtower={(addr, chain, label) =>
            handleAddWalletToWatchlist({ address: addr, chain, label })
          }
        />
      )}

      {currentView === "watchtower" && (
        <WatchtowerView
          watchlist={watchlist}
          onAddWallet={handleAddWalletToWatchlist}
          onRemoveWallet={handleRemoveWalletFromWatchlist}
          onSelectCase={handleSelectCase}
        />
      )}

      {currentView === "assistant" && <AssistantView />}

      {currentView === "integrations" && (
        <IntegrationsView vasps={SAMPLE_VASPS} />
      )}

      {currentView === "actionpack" && <ActionPackView cases={cases} />}

      {/* Cross-chain Radar View */}
      {currentView === "crosschain" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
              <Activity className="size-5 text-amber-400" />
              Cross-Chain Bridge & Hop Radar
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Correlating liquidity bridge transfers, Stargate swaps, and multi-network laundering across 10 blockchains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cases.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCase(c.id)}
                className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-3 cursor-pointer hover:border-amber-400/40 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-300 font-bold">{c.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/5 text-slate-300">
                    {c.chain}
                  </span>
                </div>
                <div className="font-semibold text-white text-sm line-clamp-2">
                  {c.title}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Reported: ${c.reportedLossUsd.toLocaleString()} USD
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-amber-400">
                  <span>Attributed VASP: {c.targetVasp || "Under Analysis"}</span>
                  <span>Inspect →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts View */}
      {currentView === "alerts" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                Real-Time Sentinel Alerts
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Automated alerts triggered by watchtower address sweeps and VASP deposit clustering.
              </p>
            </div>
            <button
              onClick={() =>
                setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })))
              }
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-3 py-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10"
            >
              Mark All Acknowledged
            </button>
          </div>

          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 flex items-start justify-between gap-4 transition ${
                  alert.acknowledged
                    ? "border-white/[0.05] bg-[#0f121a]/60 text-slate-400"
                    : "border-amber-400/30 bg-[#0f121a] text-white shadow-sm"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        alert.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : alert.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </span>
                    {alert.chain && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-white/5 rounded text-slate-400">
                        {alert.chain}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium">{alert.message}</div>
                  {alert.walletAddress && (
                    <div className="text-xs font-mono text-amber-400/80 truncate max-w-lg">
                      Target: {alert.walletAddress}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.caseId && (
                    <button
                      onClick={() => handleSelectCase(alert.caseId!)}
                      className="text-xs px-2.5 py-1 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 hover:bg-amber-400/20 font-medium"
                    >
                      View Case
                    </button>
                  )}
                  {!alert.acknowledged && (
                    <button
                      onClick={() =>
                        setAlerts((prev) =>
                          prev.map((a) =>
                            a.id === alert.id ? { ...a, acknowledged: true } : a
                          )
                        )
                      }
                      className="p-1 text-slate-400 hover:text-emerald-400"
                      title="Acknowledge Alert"
                    >
                      <CheckCircle2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence View */}
      {currentView === "evidence" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
              <Lock className="size-5 text-emerald-400" />
              Cryptographic Evidence Custody & Chain of Custody
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Section 65B Indian Evidence Act & NIST FIPS 180-4 SHA-256 sealed digital exhibits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-amber-300 font-bold">{c.id}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    SHA-256 SEALED
                  </span>
                </div>
                <div className="font-semibold text-white text-sm">{c.title}</div>
                <div className="text-xs text-slate-400 font-mono">
                  Investigator: {c.investigator} · Reference: {c.complaintRef}
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-slate-400">Reported Wallet: {c.reportedWallet.slice(0, 10)}...</span>
                  <button
                    onClick={() => handleSelectCase(c.id)}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    Open Custody Vault →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings & RBAC View */}
      {currentView === "settings" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2.5">
              <Shield className="size-5 text-amber-400" />
              Role-Based Access Control (RBAC) & Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Statutory law enforcement access control adhering to SIH PS 26183 and national police IT mandates.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="size-4 text-amber-400" />
              Active System Personas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_USERS.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setCurrentUser(user)}
                  className={`rounded-lg border p-3.5 cursor-pointer transition text-xs space-y-1 ${
                    user.id === currentUser.id
                      ? "border-amber-400/40 bg-amber-400/10 text-white"
                      : "border-white/[0.06] bg-black/20 text-slate-300 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{user.name}</span>
                    <span className="font-mono text-amber-300">{user.role}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">{user.department}</div>
                  <div className="text-slate-500 text-[10px] font-mono">{user.agency}</div>
                  {user.id === currentUser.id && (
                    <div className="text-emerald-400 text-[10px] font-bold pt-1">
                      ● Active Current User
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">RBAC Permissions Matrix</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 text-[11px]">
                    <th className="pb-2">Capability</th>
                    <th className="pb-2 text-center">VIEWER</th>
                    <th className="pb-2 text-center">ANALYST</th>
                    <th className="pb-2 text-center">INVESTIGATOR</th>
                    <th className="pb-2 text-center">ADMIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-slate-300">
                  <tr>
                    <td className="py-2 text-white">View Cases & Intelligence</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white">Create Investigations</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white">Modify Case Status</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white">Generate Statutory Freeze Pack</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-emerald-400">✓</td>
                    <td className="text-center text-emerald-400">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-white">Manage Node Infrastructure</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-slate-600">✕</td>
                    <td className="text-center text-emerald-400">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={isCreateCaseOpen}
        onClose={() => setIsCreateCaseOpen(false)}
        onCreateCase={handleCreateCase}
      />
    </AppShell>
  );
}
