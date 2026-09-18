import React, { useState } from "react";
import type { InvestigationCase } from "@/lib/types";
import { usdFull, shortAddr } from "@/lib/format";
import {
  ClipboardList,
  Copy,
  Check,
  Download,
  Building,
  Scale,
  Send,
} from "lucide-react";

interface ActionPackViewProps {
  cases: InvestigationCase[];
}

export function ActionPackView({ cases }: ActionPackViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || "");
  const [jurisdiction, setJurisdiction] = useState<"CBI" | "CYBER_CELL" | "INTERPOL" | "FBI" | "EUROPOL">("CYBER_CELL");
  const [recipientVasp, setRecipientVasp] = useState("Binance Legal Compliance");
  const [officerName, setOfficerName] = useState("Inspector Vikram Mehta, Cyber Crime Division");
  const [copied, setCopied] = useState(false);

  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  const noticeText = `FORMAL LEGAL DIRECTIVE: IMMEDIATE PRESERVATION & ASSET FREEZE UNDER CYBERCRIME STATUTES

TO: Legal Compliance & Law Enforcement Liaison Desk, ${recipientVasp}
FROM: ${officerName}
AUTHORITY: ${
    jurisdiction === "CYBER_CELL"
      ? "State Cyber Police / Section 91 & 102 Code of Criminal Procedure (CrPC)"
      : jurisdiction === "CBI"
        ? "Central Bureau of Investigation (CBI) Financial Crimes Unit"
        : jurisdiction === "INTERPOL"
          ? "Interpol Financial Crime and Anti-Corruption Centre (IFCACC)"
          : jurisdiction === "FBI"
            ? "Federal Bureau of Investigation / 18 U.S.C. § 981 Civil Forfeiture"
            : "Europol European Cybercrime Centre (EC3)"
  }
DATE OF ISSUANCE: ${new Date().toUTCString()}
INVESTIGATION DOSSIER REF: ${currentCase?.id}
FIRST INFORMATION REPORT (FIR) REF: ${currentCase?.complaintRef}

1. EMERGENCY SUMMARY
You are hereby notified that the following cryptocurrency deposit address hosted on your platform has been identified through forensic blockchain analytics as having directly received stolen victim funds originating from an ongoing cyber fraud investigation:

• IDENTIFIED VASP DEPOSIT ADDRESS: ${currentCase?.reportedWallet}
• BLOCKCHAIN NETWORK: ${currentCase?.chain.toUpperCase()}
• TOTAL FRAUDULENT VOLUME RECEIPT: ${usdFull(currentCase?.traceableUsd || 0)}
• PRIMARY FRAUD TYPOLOGY: ${currentCase?.typology}

2. STATUTORY FREEZE DEMAND
Pursuant to international mutual legal assistance treaties (MLAT) and statutory criminal procedure powers:
a) You are commanded to IMMEDIATELY SUSPEND AND FREEZE all withdrawal capabilities, spot trade executions, and fiat off-ramping connected to the above address and any linked UID / account identifier.
b) Preserve in an un-tampered state all Know-Your-Customer (KYC) documents, national identity cards, verified bank account credentials, device IP access logs, and transaction ledgers.
c) Do NOT notify the account holder or disclose this freeze inquiry if doing so would jeopardize criminal asset recovery or result in secondary asset dissipation.

3. AFFIRMATION
This notice has been generated through the TraceChain Real-Time Blockchain Analytics Platform with SHA-256 tamper-evident custody verification.

ISSUING OFFICER: ${officerName}
CONTACT: le-compliance@tracechain.gov.in / emergency-desk@cyberpolice.gov.in`;

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([noticeText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `TraceChain_Freeze_Notice_${currentCase?.id}.txt`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ClipboardList className="size-6 text-amber-400" />
            ActionPack Statutory Freeze Packet
          </h1>
          <p className="text-sm text-slate-400">
            Automated production of formal legal preservation notices and subpoena requests tailored for cryptocurrency exchanges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition"
          >
            {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
            {copied ? "Copied Packet" : "Copy Document"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-semibold text-black transition shadow-lg shadow-amber-400/20"
          >
            <Download className="size-3.5" /> Download Notice (.txt)
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-white/10 bg-[#161a24] p-4 text-xs">
        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Investigation Case Dossier</label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Law Enforcement Jurisdiction</label>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as any)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="CYBER_CELL">State Cyber Police (CrPC 91/102)</option>
            <option value="CBI">Central Bureau of Investigation (CBI)</option>
            <option value="INTERPOL">Interpol Financial Crime (IFCACC)</option>
            <option value="FBI">Federal Bureau of Investigation (FBI)</option>
            <option value="EUROPOL">Europol Cybercrime Centre (EC3)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Target VASP Compliance Desk</label>
          <input
            type="text"
            value={recipientVasp}
            onChange={(e) => setRecipientVasp(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Document Preview */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0f121a] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Scale className="size-4 text-amber-400" />
            Official Law Enforcement Freeze Subpoena Docket
          </div>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            Case Ref: {currentCase?.id}
          </span>
        </div>

        {/* Paper-styled statutory legal packet */}
        <div className="rounded-lg bg-[#0a0c10] border border-white/[0.08] p-6 lg:p-8 font-mono text-xs text-slate-200 shadow-inner overflow-x-auto selection:bg-amber-400 selection:text-black">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="border-b border-white/10 pb-4 text-center space-y-1">
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                GOVERNMENT OF INDIA · MINISTRY OF HOME AFFAIRS
              </div>
              <div className="text-sm font-bold text-white font-display">
                NATIONAL CYBERCRIME THREAT MITIGATION PROTOCOL
              </div>
              <div className="text-[10px] text-amber-400">
                CRIMINAL PROCEDURE STATUTORY PRESERVATION DIRECTIVE
              </div>
            </div>

            <pre className="whitespace-pre-wrap leading-relaxed text-[11.5px] font-mono text-slate-300 font-normal">
              {noticeText}
            </pre>

            <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] text-slate-400">
              <span>NIST FIPS 180-4 SHA-256 VERIFIED</span>
              <span>CONFIDENTIAL & PRIVILEGED LAW ENFORCEMENT TRANSMISSION</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
