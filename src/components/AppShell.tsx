import React, { useState } from "react";
import type { UserProfile, Role, Alert } from "@/lib/types";
import { ROLE_BADGE_STYLE } from "@/lib/permissions";
import { useLiveBitcoin } from "@/lib/useLiveBitcoin";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  ShieldAlert,
  ArrowLeftRight,
  Bell,
  Bot,
  ShieldCheck,
  ClipboardList,
  Globe,
  Settings,
  Menu,
  X,
  FilePlus2,
  ChevronDown,
  Shield,
  Activity,
} from "lucide-react";

interface AppShellProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  alerts: Alert[];
  onOpenCreateCase: () => void;
  children: React.ReactNode;
}

export function AppShell({
  currentView,
  onNavigate,
  currentUser,
  availableUsers,
  onSwitchUser,
  alerts,
  onOpenCreateCase,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const unackAlertsCount = alerts.filter((a) => !a.acknowledged).length;
  const { data: btcData, refresh: refreshBtc, isLoading: btcLoading } = useLiveBitcoin();

  const navSections = [
    {
      title: "INVESTIGATION",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "cases", label: "Investigations", icon: FolderKanban },
        { id: "wallet", label: "Wallet Probe", icon: Wallet },
      ],
    },
    {
      title: "INTELLIGENCE",
      items: [
        { id: "watchtower", label: "Watchtower Sentinel", icon: ShieldAlert },
        { id: "crosschain", label: "Cross-Chain Radar", icon: ArrowLeftRight },
        {
          id: "alerts",
          label: "Alerts Center",
          icon: Bell,
          badge: unackAlertsCount > 0 ? unackAlertsCount : undefined,
        },
      ],
    },
    {
      title: "FORENSIC OPS",
      items: [
        { id: "assistant", label: "TRACE-AI Copilot", icon: Bot },
        { id: "evidence", label: "Evidence Custody", icon: ShieldCheck },
        { id: "actionpack", label: "ActionPack Freeze", icon: ClipboardList },
      ],
    },
    {
      title: "INFRASTRUCTURE",
      items: [
        { id: "integrations", label: "Providers & VASPs", icon: Globe },
        { id: "settings", label: "Settings & RBAC", icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090b10] text-slate-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/[0.07] bg-[#0d1016] shrink-0">
        {/* Brand / Logo */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-400 flex items-center justify-center text-black font-mono font-bold text-xs tracking-wider shadow-sm">
              TC
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                TraceChain
              </div>
              <div className="text-[10px] font-mono text-amber-400/90 tracking-wider">
                SIH PS 26183 FORENSICS
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <button
            onClick={onOpenCreateCase}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-semibold text-black transition active:scale-[0.99]"
          >
            <FilePlus2 className="size-3.5" />
            New Investigation
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? "bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/25"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`size-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-rose-500 text-white font-mono text-[10px] px-1.5 py-0.2 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Node Health Status */}
        <div className="p-3 border-t border-white/[0.07] bg-black/20">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              RPC Direct Nodes
            </span>
            <span className="text-amber-400/90 font-medium">10 Chains</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#0d1016] px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
            >
              <Menu className="size-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live Node Multi-Hop Active
              </span>

              {btcData && (
                <button
                  onClick={() => refreshBtc()}
                  title={`Live Bitcoin Internet Feed: $${btcData.priceUsd.toLocaleString()} USD · Block #${btcData.tipHeight.toLocaleString()} · ${btcData.fastestFee} sat/vB fee. Click to refresh.`}
                  className="flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-mono text-amber-300 transition"
                >
                  <span className={`size-1.5 rounded-full bg-amber-400 ${btcLoading ? "animate-ping" : ""}`} />
                  <span className="font-semibold">BTC ${btcData.priceUsd.toLocaleString()}</span>
                  <span className="text-slate-400 text-[10px] hidden md:inline">#{btcData.tipHeight.toLocaleString()}</span>
                  <span className="text-emerald-400 text-[10px] hidden lg:inline">{btcData.fastestFee} sat/vB</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Header Area: Officer Profile & Role Switcher */}
          <div className="flex items-center gap-2.5 relative">
            <button
              onClick={() => onNavigate("alerts")}
              className="relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              title="Alerts Center"
            >
              <Bell className="size-4" />
              {unackAlertsCount > 0 && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-rose-500" />
              )}
            </button>

            {/* Officer Badge Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-2.5 py-1 transition text-left"
              >
                <div className="size-6 rounded bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 font-mono font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-slate-200 leading-tight">{currentUser.name}</div>
                  <div
                    className="text-[10px] font-mono font-semibold uppercase tracking-wider"
                    style={{ color: ROLE_BADGE_STYLE[currentUser.role].color }}
                  >
                    {ROLE_BADGE_STYLE[currentUser.role].label}
                  </div>
                </div>
                <ChevronDown className="size-3 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-11 w-64 rounded-lg border border-white/[0.1] bg-[#141822] p-2 shadow-2xl z-50 animate-in fade-in space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
                    Switch Active Persona:
                  </div>
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-md text-xs transition flex items-center justify-between ${
                        u.id === currentUser.id ? "bg-amber-400/15 text-amber-300 font-medium" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <div>
                        <div className="text-white font-medium">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.role} · {u.agency}</div>
                      </div>
                    </button>
                  ))}
                  <div className="pt-1 border-t border-white/[0.08]">
                    <button
                      onClick={() => {
                        onNavigate("settings");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left p-1.5 rounded-md text-xs text-amber-400 hover:bg-white/5 flex items-center gap-1.5"
                    >
                      <Settings className="size-3.5" /> Open RBAC Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#090b10]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm">
          <div className="w-72 bg-[#12151e] h-full p-4 flex flex-col border-r border-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="text-base font-bold text-white">TraceChain</div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 space-y-4">
              {navSections.map((sec) => (
                <div key={sec.title} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-2">{sec.title}</div>
                  {sec.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                        currentView === item.id ? "bg-amber-400/10 text-amber-300" : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
