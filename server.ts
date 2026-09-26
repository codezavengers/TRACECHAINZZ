import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { checkAllProvidersHealth, runLiveInvestigation, detectChainForAddress } from "./server/investigator";
import { getAllLivePrices, getLivePrice } from "./server/price";
import { generateCaseAiAnalysis, askAiForensicCopilot } from "./server/ai";
import { verifyEvidenceChain } from "./server/evidence";
import { validateStartupConfig, getStartupConfigHealth } from "./server/config";
import type { Chain, CaseStatus, Role } from "./src/lib/types";

// DB & Domain Services
import {
  getAllCases,
  getCaseById,
  insertCase,
  updateCase,
  getWatchlist,
  addWatchlistWallet,
  removeWatchlistWallet,
  getAlerts,
  updateAlert,
  getEvidenceRecordsForCase,
  addEvidenceRecord,
  getAuditLogs,
  getAllUsers,
  getUserById,
  getReportByCaseId,
  getActionPacketByCaseId,
  getInvestigationPaths,
} from "./server/db";
import {
  authenticateUserMiddleware,
  requireRole,
  generateToken,
  type AuthenticatedRequest,
} from "./server/auth";
import { traceWallet } from "./server/tracer";
import { parseComplaintWithAiFallback, createCaseFromComplaint } from "./server/complaint";
import { generateInvestigationReport, generateStatutoryActionPacket } from "./server/reports";
import { processNcrpComplaint, SAMPLE_NCRP_FIXTURES } from "./server/integrations/ncrp";
import { AUTHORITATIVE_VASP_DIRECTORY } from "./server/vasp";
import { watchtowerWorker } from "./server/watchtower";

dotenv.config();

// Run startup configuration validation and emit stderr table
validateStartupConfig();

// Start background Watchtower worker
watchtowerWorker.start();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));
app.use(authenticateUserMiddleware);

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

// Startup Config Validator health & per-chain status
app.get("/api/config/health", (_req, res) => {
  res.json({
    success: true,
    report: getStartupConfigHealth(),
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
    const { address, chain, caseId, forceRefresh } = req.body || {};

    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Address parameter is required and must be a non-empty string.",
      });
    }

    const cleanAddress = address.trim();
    const probe = await runLiveInvestigation(cleanAddress, chain as Chain, caseId, Boolean(forceRefresh));

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

// ---------------------------------------------------------------------------
// Case Management API
// ---------------------------------------------------------------------------

// List all cases
app.get("/api/cases", (_req, res) => {
  const cases = getAllCases();
  res.json({ success: true, cases });
});

// Get case by ID
app.get("/api/cases/:id", (req, res) => {
  const c = getCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: `Case '${req.params.id}' not found` });
  }
  res.json({ success: true, case: c });
});

// Create new case (Requires INVESTIGATOR role)
app.post("/api/cases", requireRole("INVESTIGATOR"), (req: AuthenticatedRequest, res) => {
  try {
    const caseData = req.body;
    if (!caseData || !caseData.title || !caseData.reportedWallet || !caseData.chain) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory fields: title, reportedWallet, chain",
      });
    }

    const now = new Date().toISOString();
    const newCase = {
      id: caseData.id || `TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: caseData.title,
      description: caseData.description || "",
      reportedWallet: caseData.reportedWallet,
      chain: caseData.chain,
      status: (caseData.status || "NEW") as CaseStatus,
      riskBand: caseData.riskBand || "HIGH",
      riskScore: caseData.riskScore ?? 85,
      priorityScore: caseData.priorityScore ?? 80,
      typology: caseData.typology || "INVESTMENT_FRAUD",
      reportedLossUsd: caseData.reportedLossUsd ?? 0,
      traceableUsd: caseData.traceableUsd ?? 0,
      complaintRef: caseData.complaintRef || `FIR-${Date.now().toString().slice(-6)}`,
      complaintText: caseData.complaintText || "",
      investigator: req.user?.name || caseData.investigator || "Inspector Vikram Mehta",
      recoveryProbability: caseData.recoveryProbability ?? 0.75,
      extractedWallets: caseData.extractedWallets || [caseData.reportedWallet],
      connectedVictims: caseData.connectedVictims ?? 1,
      provenance: caseData.provenance || "LIVE_BLOCKCHAIN_DATA",
      victimName: caseData.victimName,
      victimEmail: caseData.victimEmail,
      assignedTo: req.user?.name || caseData.assignedTo,
      createdAt: caseData.createdAt || now,
      updatedAt: now,
      notes: caseData.notes || [],
      activity: caseData.activity || [
        {
          id: `act-${Date.now()}`,
          action: "CASE_CREATED",
          detail: `Case initialized by ${req.user?.name || "Investigator"}`,
          actor: req.user?.name || "Investigator",
          createdAt: now,
          timestamp: now,
        },
      ],
    };

    insertCase(newCase as any);
    return res.status(201).json({ success: true, case: newCase });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Update case status (Requires INVESTIGATOR role)
app.patch("/api/cases/:id/status", requireRole("INVESTIGATOR"), (req: AuthenticatedRequest, res) => {
  const { status } = req.body || {};
  if (!status) {
    return res.status(400).json({ success: false, error: "New status is required" });
  }

  const existing = getCaseById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: "Case not found" });
  }

  const actor = req.user?.name || "Investigator";
  const now = new Date().toISOString();

  const updated = updateCase(req.params.id, {
    status: status as CaseStatus,
    activity: [
      {
        id: `act-${Date.now()}`,
        action: "STATUS_UPDATE",
        detail: `Status transitioned to ${status} by ${actor}`,
        actor,
        createdAt: now,
        timestamp: now,
      },
      ...existing.activity,
    ],
  });

  return res.json({ success: true, case: updated });
});

// Add case note (Requires INVESTIGATOR role)
app.post("/api/cases/:id/notes", requireRole("INVESTIGATOR"), (req: AuthenticatedRequest, res) => {
  const { body, text } = req.body || {};
  const noteBody = (body || text || "").trim();
  if (!noteBody) {
    return res.status(400).json({ success: false, error: "Note content cannot be empty" });
  }

  const existing = getCaseById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: "Case not found" });
  }

  const author = req.user?.name || "Investigator";
  const now = new Date().toISOString();
  const noteItem = {
    id: `note-${Date.now()}`,
    body: noteBody,
    text: noteBody,
    author,
    createdAt: now,
    timestamp: now,
  };

  const updated = updateCase(req.params.id, {
    notes: [noteItem, ...existing.notes],
  });

  return res.json({ success: true, case: updated, note: noteItem });
});

// ---------------------------------------------------------------------------
// Recursive Multi-Hop Tracing & Graph API
// ---------------------------------------------------------------------------

// Run recursive multi-hop trace (Requires ANALYST role)
app.post(["/api/trace", "/api/trace/run"], requireRole("ANALYST"), async (req: AuthenticatedRequest, res) => {
  try {
    const { address, chain, maxDepth, minValue, direction, caseId } = req.body || {};
    if (!address || typeof address !== "string") {
      return res.status(400).json({ success: false, error: "Address is required" });
    }

    const result = await traceWallet(address, (chain || "ethereum") as Chain, {
      maxDepth: maxDepth ? parseInt(maxDepth, 10) : 3,
      minValue: minValue ? parseFloat(minValue) : 0,
      direction: direction || "OUTGOING",
      caseId: caseId || "TC-PROBE",
      investigator: req.user?.name || "Inspector Vikram Mehta",
    });

    return res.json({
      success: true,
      trace: result,
    });
  } catch (err: any) {
    console.error("Tracing error:", err);
    return res.status(500).json({ success: false, error: err.message || "Tracing failed" });
  }
});

// Get investigation paths & graph
app.get(["/api/trace/:investigationId", "/api/graph/:investigationId"], (req, res) => {
  const paths = getInvestigationPaths(req.params.investigationId);
  return res.json({
    success: true,
    investigationId: req.params.investigationId,
    paths,
  });
});

// ---------------------------------------------------------------------------
// Watchlist & Alerts API
// ---------------------------------------------------------------------------

// List watchlist wallets
app.get("/api/watchlist", (_req, res) => {
  const list = getWatchlist();
  res.json({ success: true, watchlist: list });
});

// Add to watchlist
app.post("/api/watchlist", (req: AuthenticatedRequest, res) => {
  const { address, chain, label, riskBand, riskScore, notes, caseId } = req.body || {};
  if (!address || !chain) {
    return res.status(400).json({ success: false, error: "Address and chain are required" });
  }

  const now = new Date().toISOString();
  const entry = addWatchlistWallet({
    id: `w-${Date.now()}`,
    address: address.trim(),
    chain: chain as Chain,
    label: label || "Monitored Target Wallet",
    riskBand: riskBand || "HIGH",
    riskScore: riskScore ?? 85,
    status: "ACTIVE",
    caseId,
    lastActive: now,
    balanceNative: 0,
    balanceUsd: 0,
    ticker: chain === "bitcoin" ? "BTC" : chain === "solana" ? "SOL" : chain === "tron" ? "TRX" : "ETH",
    lastCheckedAt: now,
    addedAt: now,
    notes: notes || `Added by ${req.user?.name || "Investigator"}`,
  });

  return res.status(201).json({ success: true, item: entry });
});

// Remove from watchlist
app.delete("/api/watchlist/:id", (req, res) => {
  const removed = removeWatchlistWallet(req.params.id);
  res.json({ success: removed });
});

// Trigger manual watchtower poll cycle
app.post("/api/watchlist/check", async (_req, res) => {
  try {
    await watchtowerWorker.pollCycle();
    res.json({ success: true, message: "Watchtower poll cycle completed" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get alerts
app.get("/api/alerts", (_req, res) => {
  const alerts = getAlerts();
  res.json({ success: true, alerts });
});

// Update alert status (acknowledge / resolve)
app.patch("/api/alerts/:id", (req: AuthenticatedRequest, res) => {
  const { acknowledged, status } = req.body || {};
  const updated = updateAlert(req.params.id, {
    acknowledged: acknowledged !== undefined ? Boolean(acknowledged) : undefined,
    status: status || (acknowledged ? "ACKNOWLEDGED" : undefined),
    acknowledgedBy: req.user?.name,
    acknowledgedAt: new Date().toISOString(),
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: "Alert not found" });
  }
  return res.json({ success: true, alert: updated });
});

// ---------------------------------------------------------------------------
// Evidence & Cryptographic Verification API
// ---------------------------------------------------------------------------

// Get evidence records for case
app.get("/api/cases/:id/evidence", (req, res) => {
  const records = getEvidenceRecordsForCase(req.params.id);
  res.json({ success: true, evidence: records });
});

// Add new evidence record (Requires INVESTIGATOR role)
app.post("/api/evidence", requireRole("INVESTIGATOR"), (req: AuthenticatedRequest, res) => {
  const { caseId, title, type, payload } = req.body || {};
  if (!caseId || !title || !type) {
    return res.status(400).json({ success: false, error: "caseId, title, and type are required" });
  }

  const record = addEvidenceRecord(
    caseId,
    title,
    type,
    req.user?.name || "Inspector Vikram Mehta",
    payload || {}
  );
  return res.status(201).json({ success: true, record });
});

// Verify cryptographic integrity of evidence ledger
app.post("/api/evidence/verify", (req, res) => {
  try {
    const { caseId, records } = req.body || {};
    const result = verifyEvidenceChain(caseId || records);
    return res.json({ success: true, verification: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Reports & Action Packets API
// ---------------------------------------------------------------------------

// Generate Law Enforcement Investigation Report
app.post("/api/reports", requireRole("INVESTIGATOR"), async (req: AuthenticatedRequest, res) => {
  try {
    const { caseId, agency } = req.body || {};
    if (!caseId) {
      return res.status(400).json({ success: false, error: "caseId is required" });
    }

    const report = await generateInvestigationReport(
      caseId,
      req.user?.name || "Inspector Vikram Mehta",
      agency || req.user?.agency || "Delhi Police Cyber Cell / NCRP Desk"
    );
    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get investigation report by case ID
app.get("/api/reports/:caseId", (req, res) => {
  const report = getReportByCaseId(req.params.caseId);
  if (!report) {
    return res.status(404).json({ success: false, error: "Report not found" });
  }
  return res.json({ success: true, report });
});

// Generate Statutory Preservation Action Packet
app.post("/api/action-packets", requireRole("INVESTIGATOR"), (req: AuthenticatedRequest, res) => {
  try {
    const { caseId, jurisdiction, recipientVasp } = req.body || {};
    if (!caseId) {
      return res.status(400).json({ success: false, error: "caseId is required" });
    }

    const packet = generateStatutoryActionPacket(
      caseId,
      req.user?.name || "Inspector Vikram Mehta",
      jurisdiction || "CYBER_CELL",
      recipientVasp || "Binance Legal Compliance Desk"
    );
    return res.json({ success: true, actionPacket: packet });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get Action Packet by case ID
app.get("/api/action-packets/:caseId", (req, res) => {
  const packet = getActionPacketByCaseId(req.params.caseId);
  if (!packet) {
    return res.status(404).json({ success: false, error: "Action packet not found" });
  }
  return res.json({ success: true, actionPacket: packet });
});

// ---------------------------------------------------------------------------
// VASP Directory API
// ---------------------------------------------------------------------------

app.get("/api/vasps", (_req, res) => {
  res.json({
    success: true,
    total: AUTHORITATIVE_VASP_DIRECTORY.length,
    vasps: AUTHORITATIVE_VASP_DIRECTORY,
  });
});

app.get("/api/vasps/:id", (req, res) => {
  const v = AUTHORITATIVE_VASP_DIRECTORY.find((item) => item.id === req.params.id);
  if (!v) {
    return res.status(404).json({ success: false, error: "VASP not found" });
  }
  return res.json({ success: true, vasp: v });
});

// ---------------------------------------------------------------------------
// Complaint Ingestion & NCRP / SAHYOG Integrations
// ---------------------------------------------------------------------------

// Universal Complaint Ingestion
app.post("/api/complaints/ingest", async (req: AuthenticatedRequest, res) => {
  try {
    const { text, victimName, victimEmail, complaintRef } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ success: false, error: "Complaint text is required" });
    }

    const createdCase = await createCaseFromComplaint(text, {
      victimName,
      victimEmail,
      complaintRef,
      officerName: req.user?.name || "Inspector Vikram Mehta",
      source: "DIRECT_FIR",
    });

    return res.status(201).json({
      success: true,
      case: createdCase,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// NCRP Complaint Webhook / API Ingestion (DEMO ADAPTER)
app.post("/api/integrations/ncrp/complaint", async (req: AuthenticatedRequest, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.acknowledgementNumber || !payload.complaintDescription) {
      return res.status(400).json({
        success: false,
        error: "Missing required NCRP fields: acknowledgementNumber and complaintDescription",
      });
    }

    const result = await processNcrpComplaint(payload, req.user?.name || "Inspector Vikram Mehta");
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get sample NCRP test fixtures
app.get("/api/integrations/ncrp/fixtures", (_req, res) => {
  res.json({
    success: true,
    fixtures: SAMPLE_NCRP_FIXTURES,
  });
});

// ---------------------------------------------------------------------------
// Audit Logging API
// ---------------------------------------------------------------------------
app.get("/api/audit-logs", (_req, res) => {
  const logs = getAuditLogs(100);
  res.json({ success: true, logs });
});

// ---------------------------------------------------------------------------
// Authentication & User Session API
// ---------------------------------------------------------------------------
app.get("/api/auth/users", (_req, res) => {
  const users = getAllUsers();
  res.json({ success: true, users });
});

app.get("/api/auth/me", (req: AuthenticatedRequest, res) => {
  res.json({ success: true, user: req.user });
});

app.post("/api/auth/login", (req, res) => {
  const { userId } = req.body || {};
  const user = getUserById(userId || "usr-1");
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  const token = generateToken(user as any);
  return res.json({
    success: true,
    user: { ...user, token },
  });
});

// ---------------------------------------------------------------------------
// Server-side AI Forensics Reasoning (Gemini)
// ---------------------------------------------------------------------------
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
