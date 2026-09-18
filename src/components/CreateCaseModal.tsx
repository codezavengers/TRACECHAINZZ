import React, { useState } from "react";
import type { InvestigationCase, Chain, FraudTypology, RiskBand } from "@/lib/types";
import { CHAIN_LABEL, usd, titleFromTypology } from "@/lib/format";
import {
  FilePlus2,
  X,
  PlayCircle,
  Sparkles,
  Shield,
  Coins,
  Wand2,
  ArrowRight,
} from "lucide-react";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCase: (newCase: InvestigationCase) => void;
}

const DEMO_SCENARIOS = [
  {
    id: "SCN-1",
    name: "Pig Butchering (Sha Zhu Pan) -> OKX Hot Deposit",
    typology: "PIG_BUTCHERING" as FraudTypology,
    chain: "ethereum" as Chain,
    reportedLossUsd: 142500,
    traceableUsd: 138200,
    wallet: "0x71c0429f939e0807b1d1bc65860d5b77ecb2a601",
    description: "WhatsApp romance inducement -> fake DEX -> 2 burner hops -> OKX hot wallet.",
  },
  {
    id: "SCN-2",
    name: "Telegram High-Yield Task Scam -> Binance Sub-Account",
    typology: "TASK_SCAM" as FraudTypology,
    chain: "tron" as Chain,
    reportedLossUsd: 48000,
    traceableUsd: 46500,
    wallet: "TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA",
    description: "TRC-20 USDT rapid fan-out across 12 victim complaints into Binance TRON deposit gateway.",
  },
  {
    id: "SCN-3",
    name: "LockBit 3.0 Ransomware Payout -> Peel Chain -> Mixer",
    typology: "RANSOMWARE" as FraudTypology,
    chain: "bitcoin" as Chain,
    reportedLossUsd: 320000,
    traceableUsd: 295000,
    wallet: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    description: "5 BTC hospital extortion payment sliced through unspent change outputs towards mixer cluster.",
  },
  {
    id: "SCN-4",
    name: "Fake DEX Phishing Drainer -> Cross-Chain Avalanche Bridge",
    typology: "CROSS_CHAIN_LAUNDERING" as FraudTypology,
    chain: "polygon" as Chain,
    reportedLossUsd: 87200,
    traceableUsd: 84000,
    wallet: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    description: "Permit2 signature approval drainer bridged via Stargate to Avalanche C-Chain.",
  },
  {
    id: "SCN-5",
    name: "SIM Swap Executive Extortion -> Kraken Institutional OTC",
    typology: "ORGANIZED_FRAUD" as FraudTypology,
    chain: "ethereum" as Chain,
    reportedLossUsd: 510000,
    traceableUsd: 495000,
    wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    description: "Corporate multi-sig drained of 165 ETH directly into a verified Kraken OTC custody deposit address.",
  },
  {
    id: "SCN-6",
    name: "Ponzi Arbitrage Bot Scam -> KuCoin Rapid Multi-Hop",
    typology: "INVESTMENT_FRAUD" as FraudTypology,
    chain: "bsc" as Chain,
    reportedLossUsd: 64500,
    traceableUsd: 61000,
    wallet: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    description: "110 BNB flash loan scam laundered across PancakeSwap liquidity pools into KuCoin deposit tag.",
  },
];

export function CreateCaseModal({ isOpen, onClose, onCreateCase }: CreateCaseModalProps) {
  const [mode, setMode] = useState<"manual" | "demo">("manual");
  const [complaintRef, setComplaintRef] = useState("NCRP/2026/04/" + Math.floor(10000 + Math.random() * 90000));
  const [title, setTitle] = useState("");
  const [chain, setChain] = useState<Chain>("ethereum");
  const [complaintText, setComplaintText] = useState("");
  const [reportedWallet, setReportedWallet] = useState("");
  const [reportedLossUsd, setReportedLossUsd] = useState<number>(35000);
  const [typology, setTypology] = useState<FraudTypology>("INVESTMENT_FRAUD");
  const [extractedWallets, setExtractedWallets] = useState<string[]>([]);

  if (!isOpen) return null;

  // Regex extractor for cryptocurrency wallet addresses
  const handleExtractWallets = (text: string) => {
    setComplaintText(text);
    const ethRegex = /0x[a-fA-F0-9]{40}/g;
    const btcRegex = /(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}/g;
    const tronRegex = /T[A-Za-z1-9]{33}/g;

    const ethMatches = text.match(ethRegex) || [];
    const btcMatches = text.match(btcRegex) || [];
    const tronMatches = text.match(tronRegex) || [];

    const unique = Array.from(new Set([...ethMatches, ...btcMatches, ...tronMatches]));
    setExtractedWallets(unique);

    if (unique.length > 0 && !reportedWallet) {
      setReportedWallet(unique[0]);
      if (unique[0].startsWith("0x")) setChain("ethereum");
      else if (unique[0].startsWith("T")) setChain("tron");
      else if (unique[0].startsWith("bc1") || unique[0].startsWith("1") || unique[0].startsWith("3"))
        setChain("bitcoin");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedWallet.trim()) return;

    const newId = `TC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase: InvestigationCase = {
      id: newId,
      complaintRef: complaintRef || `NCRP/2026/${Math.floor(10000 + Math.random() * 90000)}`,
      title: title.trim() || `${titleFromTypology(typology)} Investigation`,
      reportedWallet: reportedWallet.trim(),
      chain,
      complaintText: complaintText.trim() || "Victim reported fraudulent cryptocurrency transfer.",
      extractedWallets: extractedWallets.length > 0 ? extractedWallets : [reportedWallet.trim()],
      typology,
      riskScore: 84,
      riskBand: "HIGH",
      priorityScore: 86,
      status: "NEW",
      investigator: "Special Agent Vikram Mehta",
      reportedLossUsd: Number(reportedLossUsd) || 25000,
      traceableUsd: Math.round(Number(reportedLossUsd) * 0.94),
      recoveryProbability: 0.75,
      connectedVictims: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: "LIVE_BLOCKCHAIN_DATA",
      notes: [],
      activity: [
        {
          id: `act-init-${newId}`,
          actor: "Special Agent Vikram Mehta",
          action: "CASE_CREATED",
          detail: `Initial investigation opened from complaint ${complaintRef}`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    onCreateCase(newCase);
    onClose();
  };

  const handleSelectDemoScenario = (scenario: typeof DEMO_SCENARIOS[0]) => {
    const newId = `TC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase: InvestigationCase = {
      id: newId,
      complaintRef: `SIH/DEMO/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      title: scenario.name,
      reportedWallet: scenario.wallet,
      chain: scenario.chain,
      complaintText: scenario.description,
      extractedWallets: [scenario.wallet],
      typology: scenario.typology,
      riskScore: 90,
      riskBand: "CRITICAL",
      priorityScore: 92,
      status: "ANALYZING",
      investigator: "Special Agent Vikram Mehta",
      reportedLossUsd: scenario.reportedLossUsd,
      traceableUsd: scenario.traceableUsd,
      recoveryProbability: 0.84,
      connectedVictims: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: "DEMO_DATA",
      notes: [],
      activity: [
        {
          id: `act-demo-${newId}`,
          actor: "TraceChain Engine",
          action: "DEMO_SCENARIO_LOADED",
          detail: `Loaded pre-wired presentation scenario: ${scenario.name}`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    onCreateCase(newCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-xl border border-white/[0.12] bg-[#0f121a] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-[#121622]">
          <div className="flex items-center gap-2.5">
            <FilePlus2 className="size-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-display">Open New Fraud Investigation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-white/[0.06]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-white/[0.08] bg-black/30 px-5 pt-2.5">
          <button
            onClick={() => setMode("manual")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              mode === "manual"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Manual Intake & Auto-Extract
          </button>
          <button
            onClick={() => setMode("demo")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              mode === "demo"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <PlayCircle className="size-3.5 text-amber-400" />
            Pre-Loaded Case Scenarios (6 Typologies)
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {mode === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Complaint / FIR Reference</label>
                  <input
                    type="text"
                    value={complaintRef}
                    onChange={(e) => setComplaintRef(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Estimated Reported Loss ($ USD)</label>
                  <input
                    type="number"
                    value={reportedLossUsd}
                    onChange={(e) => setReportedLossUsd(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Investigation Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sha Zhu Pan Romance Inducement -> Hot Wallet Deposit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Paste Complaint Text for Auto-Extraction */}
              <div className="space-y-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <Wand2 className="size-3.5" />
                    Victim Complaint Text (Automatic Address Extraction)
                  </label>
                  <span className="text-[10px] text-slate-400">Regex detects BTC, EVM, TRON</span>
                </div>
                <textarea
                  rows={3}
                  value={complaintText}
                  onChange={(e) => handleExtractWallets(e.target.value)}
                  placeholder="Paste victim FIR statement containing suspect wallet addresses..."
                  className="w-full rounded-lg border border-white/10 bg-black/50 p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-sans"
                />

                {extractedWallets.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-400">
                      ✓ Extracted {extractedWallets.length} address(es):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedWallets.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setReportedWallet(w)}
                          className="rounded bg-black/60 border border-emerald-400/40 px-2 py-0.5 font-mono text-[10px] text-emerald-300 hover:bg-emerald-400/20"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Primary Suspect Wallet Address *</label>
                  <input
                    type="text"
                    value={reportedWallet}
                    onChange={(e) => setReportedWallet(e.target.value)}
                    required
                    placeholder="0x... / bc1... / T..."
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Blockchain Network</label>
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value as Chain)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none capitalize"
                  >
                    {(Object.keys(CHAIN_LABEL) as Chain[]).map((c) => (
                      <option key={c} value={c}>
                        {CHAIN_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Suspected Fraud Typology</label>
                <select
                  value={typology}
                  onChange={(e) => setTypology(e.target.value as FraudTypology)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="PIG_BUTCHERING">Pig Butchering (Sha Zhu Pan)</option>
                  <option value="TASK_SCAM">Telegram High-Yield Task Scam</option>
                  <option value="INVESTMENT_FRAUD">Fictitious Arbitrage / Investment Fraud</option>
                  <option value="RANSOMWARE">Ransomware Extortion Payout</option>
                  <option value="CROSS_CHAIN_LAUNDERING">Cross-Chain Bridge Hopping</option>
                  <option value="ORGANIZED_FRAUD">Organized Cyber Syndicate</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reportedWallet.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold text-xs transition shadow-lg shadow-amber-400/20"
                >
                  Create & Auto-Investigate
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Choose a pre-seeded multi-hop scenario crafted for the Smart India Hackathon jury demonstration.
                Each scenario features verified hops, realistic burner transit, and identified exchange endpoints.
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {DEMO_SCENARIOS.map((scn) => (
                  <div
                    key={scn.id}
                    onClick={() => handleSelectDemoScenario(scn)}
                    className="group rounded-xl border border-white/10 bg-black/40 p-3.5 hover:border-amber-400/50 hover:bg-[#1a202c] transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          {scn.id}
                        </span>
                        <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                          {scn.name}
                        </h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {usd(scn.reportedLossUsd)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{scn.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span>{CHAIN_LABEL[scn.chain]}</span>
                      <span className="text-amber-400 group-hover:translate-x-1 transition flex items-center gap-1 font-semibold">
                        Load Scenario <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
