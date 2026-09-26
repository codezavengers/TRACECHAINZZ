import type { Chain } from "../src/lib/types";
import { getWatchlist, updateWatchlistWallet, insertAlert, getAlerts, updateAlert, logAuditEvent } from "./db";
import { runLiveInvestigation } from "./investigator";

class WatchtowerWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollIntervalMs = 25000; // 25s background polling loop

  public start() {
    if (this.timer) return;
    console.log(`[Watchtower Worker] Autonomous background monitor started (Interval: ${this.pollIntervalMs / 1000}s).`);
    this.timer = setInterval(() => {
      this.pollCycle().catch((err) => {
        console.error("[Watchtower Worker] Poll cycle error:", err);
      });
    }, this.pollIntervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[Watchtower Worker] Stopped.");
    }
  }

  public async pollCycle(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const items = getWatchlist().filter((w) => w.status === "ACTIVE" || w.status === "ALERTING");

      for (const item of items) {
        try {
          const probe = await runLiveInvestigation(item.address, item.chain, item.caseId, true);

          const previousBalance = item.balanceNative;
          const currentBalance = probe.balanceNative;
          const delta = Math.abs(currentBalance - previousBalance);

          // Update watchlist entry with latest balance and timestamp
          updateWatchlistWallet(item.id, {
            balanceNative: currentBalance,
            balanceUsd: probe.usdValue || 0,
            ticker: probe.ticker,
            lastCheckedAt: new Date().toISOString(),
            riskScore: probe.risk.score,
            riskBand: probe.risk.band,
          });

          // If substantial balance shift (>0.01 native or >$50 USD change)
          if (delta > 0.005 && previousBalance > 0) {
            const isOutgoing = currentBalance < previousBalance;
            const alertMsg = isOutgoing
              ? `Watchtower Alert: Outgoing sweep of ${delta.toFixed(4)} ${probe.ticker} ($${((probe.usdValue || 0) * (delta / (currentBalance || 1))).toFixed(0)}) detected on ${item.chain.toUpperCase()}`
              : `Watchtower Alert: Inflow of ${delta.toFixed(4)} ${probe.ticker} received on target ${item.address.slice(0, 10)}...`;

            insertAlert({
              id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: isOutgoing ? "RAPID_SWEEP_DETECTED" : "UNUSUAL_INFLOW_DETECTED",
              severity: probe.risk.score >= 80 ? "CRITICAL" : "HIGH",
              status: "OPEN",
              message: alertMsg,
              caseId: item.caseId,
              walletAddress: item.address,
              chain: item.chain,
              amount: delta,
              asset: probe.ticker,
              vasp: probe.vasp.vaspName,
              riskScore: probe.risk.score,
              acknowledged: false,
              createdAt: new Date().toISOString(),
            });

            logAuditEvent(
              "Watchtower Background Daemon",
              "ADMIN",
              "WATCHLIST_MODIFIED",
              "ALERT",
              item.address,
              { chain: item.chain, delta, currentBalance, previousBalance }
            );
          }

          // Check if newly touched a verified VASP
          if (probe.vasp.status === "VERIFIED" && item.status !== "ALERTING") {
            updateWatchlistWallet(item.id, { status: "ALERTING" });
            insertAlert({
              id: `alt-vasp-${Date.now()}`,
              type: "VASP_DEPOSIT_MATCH",
              severity: "CRITICAL",
              status: "OPEN",
              message: `High Priority: Monitored wallet ${item.address.slice(0, 10)}... resolved to verified ${probe.vasp.vaspName} deposit gateway!`,
              caseId: item.caseId,
              walletAddress: item.address,
              chain: item.chain,
              vasp: probe.vasp.vaspName,
              riskScore: probe.risk.score,
              acknowledged: false,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          // Gracefully continue without failing other watchlist wallets
          console.warn(`[Watchtower Worker] Failed probe for ${item.address}:`, err.message);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}

export const watchtowerWorker = new WatchtowerWorker();
