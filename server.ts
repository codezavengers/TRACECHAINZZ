import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { checkAllProvidersHealth, runLiveInvestigation, detectChainForAddress } from "./server/investigator";
import { getAllLivePrices, getLivePrice } from "./server/price";
import { generateCaseAiAnalysis, askAiForensicCopilot } from "./server/ai";
import type { Chain } from "./src/lib/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// 1. API Routes (MUST be registered before Vite / static middlewares)
// ---------------------------------------------------------------------------

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "TraceChain Autonomous Forensics Node",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || "development",
  });
});

// Real-time Provider Health across all 10 chains
app.get(["/api/blockchain/health", "/api/blockchain/providers/status"], async (_req, res) => {
  try {
    const health = await checkAllProvidersHealth();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      providers: health,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to check provider health",
    });
  }
});

// Live On-Chain Address Probe
app.post("/api/blockchain/probe", async (req, res) => {
  try {
    const { address, chain, caseId } = req.body || {};

    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Address parameter is required and must be a non-empty string.",
      });
    }

    const cleanAddress = address.trim();
    const probe = await runLiveInvestigation(cleanAddress, chain as Chain, caseId);

    return res.json({
      success: true,
      probe,
    });
  } catch (err: any) {
    console.error("Probe error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Investigation query failed",
    });
  }
});

// Detect chain matching for an address
app.post("/api/blockchain/detect-chain", (req, res) => {
  const { address } = req.body || {};
  if (!address || typeof address !== "string") {
    return res.status(400).json({ success: false, error: "Address is required" });
  }

  const chains = detectChainForAddress(address);
  return res.json({ success: true, chains });
});

// Live market prices
app.get("/api/blockchain/prices", async (_req, res) => {
  try {
    const prices = await getAllLivePrices();
    res.json({ success: true, prices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server-side AI Forensics Reasoning (Gemini)
app.post("/api/ai/analyze-case", async (req, res) => {
  try {
    const { probe, complaintText } = req.body || {};
    if (!probe || !probe.address) {
      return res.status(400).json({ success: false, error: "Probe payload is required" });
    }

    const analysis = await generateCaseAiAnalysis(probe, complaintText);
    if (!analysis) {
      return res.json({
        success: false,
        message: "Gemini API key is not configured or analysis failed. Returning heuristic assessment only.",
      });
    }

    return res.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Interactive AI Copilot chat (TRACE-AI powered by Gemini 3.8 Flash)
app.post("/api/ai/copilot", async (req, res) => {
  try {
    const { query, history, context } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query string is required" });
    }

    const result = await askAiForensicCopilot(query, Array.isArray(history) ? history : [], context);
    return res.json({
      success: true,
      reply: result.reply,
      model: result.model,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Vite Middleware / Production Static Serving
// ---------------------------------------------------------------------------
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TraceChain Forensics Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
