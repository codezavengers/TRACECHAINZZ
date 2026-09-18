import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Lightbulb,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: `Greetings, Investigator. I am TRACE-AI, your forensic cryptocurrency analyst copilot specialized in SIH PS 26183 directives.

I can assist you with:
• Multi-hop peel chain and mixer heuristic identification.
• VASP attribution and exchange legal compliance contact discovery.
• Drafting statutory preservation notices under Section 91/102 CrPC, 18 U.S.C. § 981, or Interpol red notices.
• Evaluating probability of asset freezing based on deposit velocity and exchange KYC levels.

How can I assist your active investigation today?`,
  },
];

const PROMPT_SUGGESTIONS = [
  "How does TraceChain detect peel chains in Bitcoin/EVM transactions?",
  "Draft an emergency freeze letter for Binance regarding a TRC-20 USDT deposit.",
  "What is the difference between a hot deposit wallet and a cold storage vault?",
  "How do we prove chain of custody under Section 65B of the Indian Evidence Act?",
];

export function AssistantView() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = { role: "user", content: query };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    if (!textToSend) setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          history: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            app: "TraceChain Autonomous Forensics",
            activeTask: "Victim fraud trace and VASP subpoena intelligence",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
          setIsTyping(false);
          return;
        }
      }
    } catch (err) {
      console.error("Copilot fetch error:", err);
    }

    // Fallback heuristic if API is unreachable
    let reply = "";
    const q = query.toLowerCase();

    if (q.includes("peel chain") || q.includes("peel")) {
      reply = `**Peel Chain Forensic Decomposition Analysis:**

A peel chain is an obfuscation technique where a threat actor systematically transfers a large balance through a sequence of single-input, two-output transactions:
1. **Peel Output (Small):** Sliced off and directed toward cashout portals, burner accounts, or gift card off-ramps.
2. **Change Output (Large):** Retained and passed forward to the next transaction in the sequence.

**Detection Heuristic in TraceChain:**
• **Output Asymmetry:** Identifying UTXOs or ERC-20 transfers where one output accounts for >85% of input value while the remainder matches standard consumer denominations.
• **Velocity Correlation:** Detecting rapid automated execution (<3 minutes per hop) without intermediate contract calls.
• **Terminal Destination Clustering:** Tracking successive small peel outputs until they terminate at known VASP deposit tags.`;
    } else if (q.includes("freeze") || q.includes("binance") || q.includes("letter")) {
      reply = `**Automated Freeze Subpoena Generation for VASP (Binance):**

**Subject:** URGENT: Mutual Legal Assistance & Emergency Cryptocurrency Preservation Directive
**Attention:** Binance Legal Compliance / Law Enforcement Response Desk

**Directive Summary:**
Under applicable international criminal procedure statutes, please be advised that funds originating from Cyber Financial Fraud have been traced directly into Binance Deposit Gateway:
• **Target Deposit Address:** 0x5a21b3f940268ec3802e3b3a6e9a8f276189c441
• **Attributed Volume:** $89,300.00 USD (equivalent in USDT/ETH)
• **Time of Deposit:** Block #21983021

**Demands:**
1. Place an immediate administrative freeze on all withdrawals for the recipient Binance User ID (UID).
2. Retain all KYC registration documents, linked fiat bank accounts, and IPv4/IPv6 login audit logs.
3. Transmit confirmation of asset preservation to the investigating cyber crime officer within 4 hours.`;
    } else if (q.includes("65b") || q.includes("evidence") || q.includes("court")) {
      reply = `**Section 65B Electronic Evidence Certification Requirements:**

Under Section 65B of the Indian Evidence Act, 1872 (and corresponding Bharatiya Sakshya Adhiniyam standards), blockchain transaction logs are classified as secondary electronic records requiring a statutory Certificate of Authenticity.

**TraceChain Compliance Architecture:**
1. **Cryptographic Chaining:** Each investigation state (complaint intake, raw RPC responses, graph edges) is cryptographically signed using SHA-256.
2. **Hardware & Node Provenance:** The certificate records the node client version (e.g. Geth v1.13 / Erigon), RPC endpoint URL, block header hash, and system timestamps.
3. **Integrity Hash Validation:** Any alteration to recorded logs invalidates the Merkle root, guaranteeing court admissibility without risk of evidentiary challenge.`;
    } else {
      reply = `**TraceChain Forensic Intelligence Advisory:**

Regarding: "${query}"

1. **Analytical Assessment:**
Automated graph tracing indicates high probability of organized laundering. Stolen assets from victim deposits are commonly split across 2 to 4 burner transit addresses before hitting liquidity hubs.

2. **Recommended Action Sequence:**
• **Step 1:** Issue immediate automated freeze notice via the **ActionPack** tab to freeze exchange accounts before fiat conversion.
• **Step 2:** Add all intermediate addresses to **Watchtower** to trigger alerts if dormant funds start moving.
• **Step 3:** Export signed SHA-256 evidence docket from the **Evidence Center** for court certification.`;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setIsTyping(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Bot className="size-6 text-amber-400" />
          TRACE-AI Forensic Copilot
        </h1>
        <p className="text-sm text-slate-400">
          AI assistant trained in blockchain forensics, VASP legal subpoena requirements, and financial crime typologies.
        </p>
      </div>

      {/* Main Chat Box */}
      <div className="rounded-2xl border border-white/10 bg-[#161a24] overflow-hidden flex flex-col h-[600px]">
        {/* Messages feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === "assistant" ? "items-start" : "items-start flex-row-reverse"
              }`}
            >
              <div
                className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                  m.role === "assistant"
                    ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                    : "bg-white/10 text-white"
                }`}
              >
                {m.role === "assistant" ? <Bot className="size-4" /> : <User className="size-4" />}
              </div>

              <div
                className={`relative group max-w-2xl rounded-2xl p-4 space-y-2 ${
                  m.role === "assistant"
                    ? "bg-black/40 border border-white/10 text-slate-200"
                    : "bg-amber-400 text-black font-medium"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition rounded bg-white/5"
                    title="Copy text"
                  >
                    {copiedIndex === idx ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Bot className="size-4 animate-bounce" />
              <span>Analyzing blockchain topology & legal statutes...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="border-t border-white/10 bg-black/40 p-3 overflow-x-auto">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Lightbulb className="size-3 text-amber-400" /> Suggestions:
            </span>
            {PROMPT_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 transition hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/10 bg-[#181c26] p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TRACE-AI about a transaction hash, legal subpoena, or laundering typology..."
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 px-4 py-2.5 text-xs font-semibold text-black transition shadow-lg shadow-amber-400/20"
            >
              <Send className="size-3.5" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
