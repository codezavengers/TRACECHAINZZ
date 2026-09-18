import { GoogleGenAI } from "@google/genai";
import type { LiveProbeResponse } from "./types";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function generateCaseAiAnalysis(probe: LiveProbeResponse, complaintText?: string): Promise<{
  executiveSummary: string;
  threatAssessment: string;
  recommendedSubpoenas: string[];
  countermeasureTactics: string[];
  aiModelUsed: string;
} | null> {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const prompt = `
You are a senior blockchain forensics investigator assisting law enforcement in analyzing victim-reported fraud.
Review the following verified on-chain probe results and provide a precise, objective forensic briefing:

TARGET WALLET: ${probe.address}
CHAIN: ${probe.chain.toUpperCase()}
STATUS: ${probe.status} (Data Source: ${probe.dataSource})
NATIVE BALANCE: ${probe.balanceFormatted}
TOTAL ON-CHAIN TRANSACTIONS: ${probe.txCount}
SMART CONTRACT: ${probe.isContract ? "YES" : "NO"}
VASP ATTRIBUTION: ${probe.vasp.status} - ${probe.vasp.vaspName || "None identified"} (Confidence: ${(probe.vasp.confidenceScore * 100).toFixed(0)}%)
DETERMINISTIC RISK SCORE: ${probe.risk.score}/100 (${probe.risk.band}) - ${probe.risk.threatCategory}
DETECTED TYPOLOGIES: ${probe.patterns.map((p) => `${p.name} (${p.severity})`).join(", ") || "None"}
COMPLAINT CONTEXT: ${complaintText || "Victim reported funds sent to unauthorized suspect address."}

Please respond strictly in valid JSON format matching this schema:
{
  "executiveSummary": "Concise forensic summary of what on-chain activity reveals.",
  "threatAssessment": "Detailed analysis of fund flow behavior, laundering typologies, and suspect tactics.",
  "recommendedSubpoenas": ["Specific legal action 1 with entity and rationale", "Specific legal action 2"],
  "countermeasureTactics": ["Immediate technical countermeasure or watch list action 1", "Action 2"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      executiveSummary: parsed.executiveSummary || "Forensic analysis completed.",
      threatAssessment: parsed.threatAssessment || "Review on-chain indicators.",
      recommendedSubpoenas: Array.isArray(parsed.recommendedSubpoenas) ? parsed.recommendedSubpoenas : [],
      countermeasureTactics: Array.isArray(parsed.countermeasureTactics) ? parsed.countermeasureTactics : [],
      aiModelUsed: "gemini-3.8-flash",
    };
  } catch (err) {
    console.error("Gemini case analysis error:", err);
    return null;
  }
}

export async function askAiForensicCopilot(
  userQuery: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  context?: {
    currentChain?: string;
    targetAddress?: string;
    activeCaseId?: string;
  }
): Promise<{ reply: string; model: string }> {
  const ai = getAiClient();
  const model = "gemini-3.8-flash";

  if (!ai) {
    return {
      reply:
        "The Gemini AI API key is not currently configured on this server environment. Please set GEMINI_API_KEY in your settings or .env file to enable live Gemini forensic intelligence responses.",
      model: "offline-fallback",
    };
  }

  try {
    const systemInstruction = `You are TRACE-AI, a world-class senior cryptocurrency forensics and blockchain financial intelligence expert assisting cybercrime investigators and law enforcement under directives like SIH PS 26183.
Your job is to provide accurate, objective, statutory, and forensic guidance on:
1. Public blockchain transparency: why cryptocurrency ledgers are public, how transaction calldata and contract storage slots are fully readable by nodes (via eth_getStorageAt), and how cryptographic secrets (private keys/mnemonics) are never stored on-chain.
2. Forensic tracing: peel chains, mixer hops, cross-chain bridging, UTXO common-input heuristics, and exchange deposit sweeps.
3. Law enforcement action: drafting statutory preservation requests (Section 91/102 CrPC, 18 U.S.C. § 981, Interpol notices), contacting exchange compliance desks (Binance, OKX, Coinbase, KuCoin, etc.), and certifying electronic evidence under Section 65B of the Indian Evidence Act / BSA.
4. Active investigation context: ${context ? JSON.stringify(context) : "None provided"}.

Always maintain an authoritative, objective, professional, and law-enforcement-oriented tone. Cite realistic statutory frameworks and forensic procedures. Do not invent fake transaction hashes or hallucinate private key recoveries.`;

    // Map conversation history
    const contents: any[] = history.slice(-6).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Append latest question
    contents.push({
      role: "user",
      parts: [{ text: userQuery }],
    });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const reply = response.text?.trim() || "No response received from TRACE-AI.";
    return { reply, model };
  } catch (err: any) {
    console.error("Gemini copilot error:", err);
    return {
      reply: `Forensic AI Copilot encountered an error communicating with Gemini: ${err.message || "Unknown error"}`,
      model,
    };
  }
}

