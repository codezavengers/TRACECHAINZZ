import type { DetectedPattern, NormalizedTransaction, RiskAnalysis, FundFlowSummary } from "./types";
import type { Chain } from "../src/lib/types";

export function analyzePatternsAndRisk(
  targetAddress: string,
  chain: Chain,
  transactions: NormalizedTransaction[],
  balanceNative: number,
  isContract: boolean
): { patterns: DetectedPattern[]; risk: RiskAnalysis; fundFlow: FundFlowSummary } {
  const normTarget = targetAddress.toLowerCase();
  const patterns: DetectedPattern[] = [];
  const factors: RiskAnalysis["factors"] = [];

  // Calculate Fund Flow Summary
  let incomingTotal = 0;
  let incomingCount = 0;
  let outgoingTotal = 0;
  let outgoingCount = 0;

  const counterpartyMap = new Map<string, { direction: "IN" | "OUT"; totalAmount: number; count: number }>();

  for (const tx of transactions) {
    const isIncoming = tx.to.toLowerCase() === normTarget;
    const cp = isIncoming ? tx.from : tx.to;

    if (isIncoming) {
      incomingTotal += tx.amount;
      incomingCount++;
    } else {
      outgoingTotal += tx.amount;
      outgoingCount++;
    }

    if (cp && cp !== "0x" && cp !== normTarget) {
      const existing = counterpartyMap.get(cp);
      if (existing) {
        existing.totalAmount += tx.amount;
        existing.count += 1;
      } else {
        counterpartyMap.set(cp, {
          direction: isIncoming ? "IN" : "OUT",
          totalAmount: tx.amount,
          count: 1,
        });
      }
    }
  }

  const primaryCounterparties = Array.from(counterpartyMap.entries())
    .map(([addr, data]) => ({
      address: addr,
      direction: data.direction,
      totalAmount: data.totalAmount,
      txCount: data.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  const fundFlow: FundFlowSummary = {
    incomingTotal,
    incomingCount,
    outgoingTotal,
    outgoingCount,
    netFlow: incomingTotal - outgoingTotal,
    primaryCounterparties,
  };

  let riskScore = 15; // Baseline clean address
  let threatCategory = "Low Risk / Standard Activity";

  // Check 1: Contract Analysis
  if (isContract) {
    factors.push({
      title: "Smart Contract Execution Target",
      description: "Address contains compiled bytecode. Executes programmatic state transitions.",
      weight: 10,
    });
    riskScore += 10;
  }

  // Check 2: Fan-Out Dispersal Pattern (multiple distinct outgoing counterparties)
  const outgoingCounterparties = new Set(
    transactions.filter((t) => t.to.toLowerCase() !== normTarget).map((t) => t.to.toLowerCase())
  );

  if (outgoingCounterparties.size >= 3) {
    const evidenceHashes = transactions
      .filter((t) => t.to.toLowerCase() !== normTarget)
      .map((t) => t.transactionHash)
      .slice(0, 5);

    patterns.push({
      id: "pat-fanout",
      name: "Fan-Out Dispersal",
      typology: "LAYERING_DISPERSAL",
      severity: "HIGH",
      description: `Funds dispersed across ${outgoingCounterparties.size} distinct recipient destinations in quick succession.`,
      confidence: 0.89,
      evidenceTxHashes: evidenceHashes,
      metrics: { destinationCount: outgoingCounterparties.size },
    });

    factors.push({
      title: "Rapid Multi-Destination Splitting (Fan-Out)",
      description: `Funds split into ${outgoingCounterparties.size} separate addresses to hinder tracking.`,
      weight: 25,
      supportingTxs: evidenceHashes,
    });
    riskScore += 25;
    threatCategory = "Layering / Splitting Transit Node";
  }

  // Check 3: Fan-In Consolidation Pattern (multiple distinct senders converging into target)
  const incomingCounterparties = new Set(
    transactions.filter((t) => t.to.toLowerCase() === normTarget).map((t) => t.from.toLowerCase())
  );

  if (incomingCounterparties.size >= 3) {
    const evidenceHashes = transactions
      .filter((t) => t.to.toLowerCase() === normTarget)
      .map((t) => t.transactionHash)
      .slice(0, 5);

    patterns.push({
      id: "pat-fanin",
      name: "Fan-In Consolidation",
      typology: "FUNDS_AGGREGATION",
      severity: "MEDIUM",
      description: `Consolidation of deposits from ${incomingCounterparties.size} distinct origin addresses into single hub.`,
      confidence: 0.82,
      evidenceTxHashes: evidenceHashes,
      metrics: { sourceCount: incomingCounterparties.size },
    });

    factors.push({
      title: "Deposit Aggregation (Fan-In)",
      description: `Received tranches from ${incomingCounterparties.size} distinct wallets.`,
      weight: 15,
      supportingTxs: evidenceHashes,
    });
    riskScore += 15;
  }

  // Check 4: Repeated Counterparty Velocity
  const repeatedCp = Array.from(counterpartyMap.entries()).filter(([_, d]) => d.count >= 3);
  if (repeatedCp.length > 0) {
    const cpAddr = repeatedCp[0][0];
    factors.push({
      title: "High-Frequency Counterparty Clustering",
      description: `Repeated cyclic interaction (${repeatedCp[0][1].count} txs) with counterparty ${cpAddr.slice(0, 10)}...`,
      weight: 15,
    });
    riskScore += 15;
  }

  // Check 5: High Velocity Transit (Drainage Ratio)
  if (incomingTotal > 0 && outgoingTotal > 0) {
    const drainageRatio = outgoingTotal / incomingTotal;
    if (drainageRatio >= 0.85) {
      patterns.push({
        id: "pat-high-velocity",
        name: "High Velocity Pass-Through",
        typology: "TRANSIT_CLEANING",
        severity: "CRITICAL",
        description: `Over ${(drainageRatio * 100).toFixed(1)}% of incoming funds rapidly drained out, indicating transit node behavior.`,
        confidence: 0.94,
        evidenceTxHashes: transactions.map((t) => t.transactionHash).slice(0, 4),
      });

      factors.push({
        title: "Near-Complete Fund Drainage (>85%)",
        description: `Target retains minimal native balance (${balanceNative.toFixed(4)}), acting as an automated pass-through.`,
        weight: 30,
      });
      riskScore += 30;
      threatCategory = "High-Velocity Transit / Mule Wallet";
    }
  }

  // Clamp score
  riskScore = Math.min(98, Math.max(10, riskScore));

  let band: RiskAnalysis["band"] = "LOW";
  if (riskScore >= 80) band = "CRITICAL";
  else if (riskScore >= 60) band = "HIGH";
  else if (riskScore >= 40) band = "MEDIUM";

  let explanation = `Wallet risk assessment (${riskScore}/100, ${band}) computed deterministically from ${transactions.length} verified on-chain transactions.`;
  if (factors.length > 0) {
    explanation += ` Primary contributing risk drivers: ${factors.map((f) => f.title).join("; ")}.`;
  } else {
    explanation += " No suspicious laundering typologies or anomalous clustering patterns detected.";
  }

  return {
    patterns,
    risk: {
      score: riskScore,
      band,
      threatCategory,
      factors,
      explanation,
    },
    fundFlow,
  };
}
