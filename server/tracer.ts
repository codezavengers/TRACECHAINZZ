import type { Chain } from "../src/lib/types";
import type { NormalizedTransaction } from "./types";
import { runLiveInvestigation } from "./investigator";
import { attributeVasp } from "./vasp";
import { detectBridgeInteraction, detectDexInteraction, detectMixerInteraction } from "./defi_intel";
import {
  insertInvestigation,
  insertInvestigationPaths,
  addEvidenceRecord,
  logAuditEvent,
} from "./db";
import type { DbInvestigation, DbInvestigationPath } from "./db/schema";

export interface TraceGraphNode {
  id: string;
  label: string;
  address: string;
  chain: Chain;
  kind: "VICTIM" | "SUSPICIOUS" | "BURNER" | "INTERMEDIARY" | "CONSOLIDATION" | "VASP" | "EXCHANGE" | "BRIDGE" | "MIXER" | "DEFI" | "UNKNOWN";
  riskScore: number;
  balanceNative: number;
  balanceUsd: number;
  hopDistance: number;
  vaspName?: string;
  bridgeName?: string;
  dexName?: string;
  mixerName?: string;
}

export interface TraceGraphEdge {
  id: string;
  txHash: string;
  source: string;
  target: string;
  kind: "TRANSFERRED_TO" | "BRIDGED_TO" | "SWAPPED" | "DEPOSITED_TO" | "CONSOLIDATED";
  amount: number;
  asset: string;
  usdValue?: number;
  timestamp: string;
  chain: Chain;
  hopNumber: number;
}

export interface RecursiveTraceResult {
  investigationId: string;
  rootAddress: string;
  chain: Chain;
  maxDepthReached: number;
  totalHops: number;
  totalWalletsDiscovered: number;
  totalTransactionsTraced: number;
  nodes: TraceGraphNode[];
  edges: TraceGraphEdge[];
  terminalVaspDeposit?: {
    vaspName: string;
    depositAddress: string;
    hopDistance: number;
    confidence: number;
    complianceContact?: string;
    subpoenaFormat?: string;
  };
  bridgeHops: Array<{
    bridgeName: string;
    sourceAddress: string;
    targetAddress: string;
    sourceChain: Chain;
  }>;
  dexSwaps: Array<{
    dexName: string;
    contractAddress: string;
    chain: Chain;
  }>;
  mixerInteractions: Array<{
    mixerName: string;
    address: string;
    sanctioned?: boolean;
  }>;
  executionTimeMs: number;
  tracedAt: string;
}

export interface TraceOptions {
  maxDepth?: number;
  minValue?: number;
  direction?: "OUTGOING" | "INCOMING" | "BOTH";
  caseId?: string;
  investigator?: string;
  maxBreadthPerHop?: number;
}

export async function traceWallet(
  rootAddress: string,
  chain: Chain,
  options: TraceOptions = {}
): Promise<RecursiveTraceResult> {
  const startTime = Date.now();
  const maxDepth = Math.min(5, Math.max(1, options.maxDepth || 3));
  const minValue = options.minValue || 0;
  const direction = options.direction || "OUTGOING";
  const caseId = options.caseId || `CASE-${Date.now().toString(36)}`;
  const investigator = options.investigator || "Inspector Vikram Mehta";
  const maxBreadth = options.maxBreadthPerHop || 3; // Sensible pruning to prevent branch explosion
  const maxTotalWallets = 8; // Cap total graph nodes for responsive sub-second tracing

  const investigationId = `inv-${caseId}-${Date.now().toString(36)}`;
  const cleanRoot = rootAddress.trim();

  const visitedAddresses = new Set<string>();
  const nodesMap = new Map<string, TraceGraphNode>();
  const edges: TraceGraphEdge[] = [];
  const dbPaths: DbInvestigationPath[] = [];

  const bridgeHops: RecursiveTraceResult["bridgeHops"] = [];
  const dexSwaps: RecursiveTraceResult["dexSwaps"] = [];
  const mixerInteractions: RecursiveTraceResult["mixerInteractions"] = [];
  let terminalVasp: RecursiveTraceResult["terminalVaspDeposit"] | undefined;

  // Queue item: { address, currentChain, currentHop, parentAddress }
  interface QueueItem {
    address: string;
    chain: Chain;
    hop: number;
    parentAddress?: string;
  }

  const queue: QueueItem[] = [{ address: cleanRoot, chain, hop: 0 }];

  while (queue.length > 0 && visitedAddresses.size < maxTotalWallets) {
    const current = queue.shift()!;
    const normCurrent = current.address.toLowerCase();

    if (visitedAddresses.has(normCurrent)) {
      continue;
    }
    visitedAddresses.add(normCurrent);

    // 1. Probe address (Full probe for root, fast local attribute check for child hops)
    let probe: any = null;
    if (current.hop === 0) {
      probe = await runLiveInvestigation(current.address, current.chain, caseId, false).catch(() => null);
    }

    // Classify node characteristics
    const vaspAttribution = probe ? probe.vasp : attributeVasp(current.address, current.chain, []);
    const bridgeCheck = detectBridgeInteraction(current.address, current.chain);
    const dexCheck = detectDexInteraction(current.address, current.chain);
    const mixerCheck = detectMixerInteraction(current.address, current.chain);

    let nodeKind: TraceGraphNode["kind"] = "INTERMEDIARY";
    let risk = probe ? probe.risk.score : 50;

    if (vaspAttribution.status === "VERIFIED" || vaspAttribution.status === "PROBABLE") {
      nodeKind = "VASP";
      risk = 20;
      if (!terminalVasp && current.hop > 0) {
        terminalVasp = {
          vaspName: vaspAttribution.vaspName || "Known Exchange",
          depositAddress: current.address,
          hopDistance: current.hop,
          confidence: vaspAttribution.confidenceScore,
          complianceContact: vaspAttribution.complianceContact,
          subpoenaFormat: vaspAttribution.subpoenaFormat,
        };
      }
    } else if (bridgeCheck.isBridge) {
      nodeKind = "BRIDGE";
      risk = 75;
      bridgeHops.push({
        bridgeName: bridgeCheck.bridgeName || "Cross-Chain Bridge",
        sourceAddress: current.parentAddress || cleanRoot,
        targetAddress: current.address,
        sourceChain: current.chain,
      });
    } else if (dexCheck.isDex) {
      nodeKind = "DEFI";
      risk = 60;
      dexSwaps.push({
        dexName: dexCheck.dexName || "Automated Market Maker",
        contractAddress: current.address,
        chain: current.chain,
      });
    } else if (mixerCheck.isMixer) {
      nodeKind = "MIXER";
      risk = 98;
      mixerInteractions.push({
        mixerName: mixerCheck.mixerName || "Privacy Protocol",
        address: current.address,
        sanctioned: mixerCheck.sanctioned,
      });
    } else if (current.hop === 0) {
      nodeKind = "SUSPICIOUS";
      risk = probe ? probe.risk.score : 85;
    } else if (current.hop === 1) {
      nodeKind = "BURNER";
      risk = 88;
    }

    const nodeLabel = vaspAttribution.vaspName || bridgeCheck.bridgeName || dexCheck.dexName || mixerCheck.mixerName || `Hop ${current.hop} Wallet`;

    const graphNode: TraceGraphNode = {
      id: `${current.chain}:${normCurrent}`,
      label: nodeLabel,
      address: current.address,
      chain: current.chain,
      kind: nodeKind,
      riskScore: risk,
      balanceNative: probe ? probe.balanceNative : 0,
      balanceUsd: probe ? (probe.usdValue || 0) : 0,
      hopDistance: current.hop,
      vaspName: vaspAttribution.vaspName,
      bridgeName: bridgeCheck.bridgeName,
      dexName: dexCheck.dexName,
      mixerName: mixerCheck.mixerName,
    };

    nodesMap.set(graphNode.id, graphNode);

    // Stop exploring deeper if we have reached maxDepth or a verified VASP sink or mixer
    if (current.hop >= maxDepth || nodeKind === "VASP" || nodeKind === "MIXER") {
      continue;
    }

    // 2. Select next counterparties to trace
    const txs: NormalizedTransaction[] = probe?.transactions || [];

    // Filter candidate transactions by direction
    const filteredTxs = txs.filter((t) => {
      if (t.amount < minValue) return false;
      if (direction === "OUTGOING") return t.direction === "OUTGOING" || t.from.toLowerCase() === normCurrent;
      if (direction === "INCOMING") return t.direction === "INCOMING" || t.to.toLowerCase() === normCurrent;
      return true;
    });

    // Sort by largest transaction amount (follow the money heuristic)
    filteredTxs.sort((a, b) => b.amount - a.amount);

    // Pick top candidates up to maxBreadth
    const candidates = filteredTxs.slice(0, maxBreadth);

    for (const tx of candidates) {
      const nextTarget = tx.to.toLowerCase() === normCurrent ? tx.from : tx.to;
      if (!nextTarget || nextTarget === "0x" || nextTarget.toLowerCase() === normCurrent) {
        continue;
      }

      const edgeId = `edge-${tx.transactionHash.slice(0, 16)}-${current.hop + 1}`;
      let edgeKind: TraceGraphEdge["kind"] = "TRANSFERRED_TO";
      if (bridgeCheck.isBridge) edgeKind = "BRIDGED_TO";
      else if (dexCheck.isDex) edgeKind = "SWAPPED";
      else if (vaspAttribution.status === "VERIFIED") edgeKind = "DEPOSITED_TO";

      edges.push({
        id: edgeId,
        txHash: tx.transactionHash,
        source: `${current.chain}:${normCurrent}`,
        target: `${current.chain}:${nextTarget.toLowerCase()}`,
        kind: edgeKind,
        amount: tx.amount,
        asset: tx.asset,
        usdValue: tx.amountUsd || undefined,
        timestamp: tx.timestamp || new Date().toISOString(),
        chain: current.chain,
        hopNumber: current.hop + 1,
      });

      dbPaths.push({
        id: `path-${edgeId}`,
        investigationId,
        hopNumber: current.hop + 1,
        sourceAddress: current.address,
        sourceRole: nodeKind,
        targetAddress: nextTarget,
        targetRole: "DISCOVERED_HOP",
        txHash: tx.transactionHash,
        asset: tx.asset,
        amount: tx.amount,
        amountUsd: tx.amountUsd || 0,
        timestamp: tx.timestamp || new Date().toISOString(),
        chain: current.chain,
        detectedVasp: vaspAttribution.vaspName,
        detectedBridge: bridgeCheck.bridgeName,
        detectedDex: dexCheck.dexName,
      });

      if (!visitedAddresses.has(nextTarget.toLowerCase())) {
        queue.push({
          address: nextTarget,
          chain: current.chain,
          hop: current.hop + 1,
          parentAddress: current.address,
        });
      }
    }
  }

  // If graph is small (e.g. single target or no external RPC txs available), ensure meaningful flow from known cluster
  const nodes = Array.from(nodesMap.values());
  const maxDepthReached = nodes.reduce((max, n) => Math.max(max, n.hopDistance), 0);
  const totalHops = edges.length;
  const executionTimeMs = Date.now() - startTime;

  // Persist Investigation to DB
  const dbInv: DbInvestigation = {
    id: investigationId,
    caseId,
    targetAddress: cleanRoot,
    chain,
    maxDepth,
    minValue,
    direction,
    status: "COMPLETED",
    discoveredHops: totalHops,
    discoveredWallets: nodes.length,
    discoveredTxs: edges.length,
    attributedVasp: terminalVasp?.vaspName,
    riskScore: nodes[0]?.riskScore || 85,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    investigator,
  };
  insertInvestigation(dbInv);
  insertInvestigationPaths(dbPaths);

  // Add evidence record for multi-hop graph completion
  addEvidenceRecord(
    caseId,
    `Multi-Hop Recursive Trace Graph (${maxDepthReached} Hops Resolved)`,
    "FORENSIC_EVALUATION",
    investigator,
    {
      investigationId,
      rootAddress: cleanRoot,
      chain,
      maxDepthReached,
      totalHops,
      nodesCount: nodes.length,
      terminalVasp: terminalVasp?.vaspName || "None",
      bridgesDetected: bridgeHops.map((b) => b.bridgeName),
    }
  );

  // Audit log
  logAuditEvent(
    investigator,
    "ANALYST",
    "TRACE_STARTED",
    "RECURSIVE_TRACE",
    investigationId,
    { rootAddress: cleanRoot, chain, maxDepth, discoveredNodes: nodes.length }
  );

  return {
    investigationId,
    rootAddress: cleanRoot,
    chain,
    maxDepthReached,
    totalHops,
    totalWalletsDiscovered: nodes.length,
    totalTransactionsTraced: edges.length,
    nodes,
    edges,
    terminalVaspDeposit: terminalVasp,
    bridgeHops,
    dexSwaps,
    mixerInteractions,
    executionTimeMs,
    tracedAt: new Date().toISOString(),
  };
}
