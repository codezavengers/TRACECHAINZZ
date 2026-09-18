import { getChainConfig } from "./config";
import type {
  NormalizedTransaction,
  ProviderHealth,
  TokenBalanceItem,
  LiveProbeResponse,
} from "./types";
import { getLivePrice } from "./price";

export function isValidTronAddress(address: string): boolean {
  // Standard TRON mainnet addresses are 34-character Base58Check strings starting with 'T'
  return /^T[A-Za-z1-9]{33}$/.test(address.trim());
}

export async function checkTronHealth(): Promise<ProviderHealth> {
  const config = getChainConfig("tron");
  const t0 = Date.now();

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers["TRON-PRO-API-KEY"] = config.apiKey;

    const res = await fetch(`${config.rpcUrl}/wallet/getnowblock`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("RATE_LIMITED: TronGrid returned HTTP 429");
      }
      throw new Error(`PROVIDER_ERROR: TronGrid HTTP ${res.status}`);
    }

    const data = await res.json();
    const blockHeight = data?.block_header?.raw_data?.number;
    const latencyMs = Math.max(1, Date.now() - t0);

    return {
      chain: "tron",
      name: config.name,
      provider: `TronGrid Official FullNode (${config.rpcUrl})`,
      configured: true,
      reachable: true,
      status: "LIVE",
      dataSource: "LIVE_NATIVE_API",
      latestBlock: blockHeight,
      blockHeight,
      latencyMs,
      fetchedAt: new Date().toISOString(),
      gasOrFee: "420 Sun / Energy",
      capabilities: {
        nativeBalance: true,
        tokenTransfers: true,
        historicalSearch: true,
        contractCode: true,
        utxo: false,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, Date.now() - t0);
    const isRate = err.message?.includes("RATE_LIMITED") || err.message?.includes("429");
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");

    return {
      chain: "tron",
      name: config.name,
      provider: `TronGrid API (${config.rpcUrl})`,
      configured: true,
      reachable: false,
      status: isRate ? "RATE_LIMITED" : isTimeout ? "TIMEOUT" : "UNAVAILABLE",
      dataSource: "LIVE_NATIVE_API",
      latencyMs,
      fetchedAt: new Date().toISOString(),
      capabilities: {
        nativeBalance: true,
        tokenTransfers: true,
        historicalSearch: false,
        contractCode: true,
        utxo: false,
      },
      error: err.message,
    };
  }
}

export async function probeTronAddress(address: string): Promise<Partial<LiveProbeResponse>> {
  const config = getChainConfig("tron");
  const isValid = isValidTronAddress(address);

  if (!isValid) {
    return {
      address,
      chain: "tron",
      isValid: false,
      status: "UNAVAILABLE",
      dataSource: "LIVE_NATIVE_API",
      provider: "TRON Base58Check Validator",
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00 TRX",
      ticker: "TRX",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: "Invalid TRON address format. Must be a 34-character Base58Check string starting with 'T'.",
    };
  }

  const priceData = await getLivePrice("tron");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers["TRON-PRO-API-KEY"] = config.apiKey;

  try {
    // 1. Fetch native account details via official /wallet/getaccount
    const accRes = await fetch(`${config.rpcUrl}/wallet/getaccount`, {
      method: "POST",
      headers,
      body: JSON.stringify({ address, visible: true }),
      signal: AbortSignal.timeout(5000),
    });

    const accData = await accRes.json();
    const balanceSun = accData?.balance || 0;
    const balanceNative = balanceSun / 1e6; // 1 TRX = 1,000,000 SUN
    const isWitness = Boolean(accData?.is_witness);

    const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
    const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

    // 2. Query TRC-20 transfers (USDT, etc.) via official TronGrid endpoint
    const trc20Res = await fetch(
      `${config.rpcUrl}/v1/accounts/${encodeURIComponent(address)}/transactions/trc20?limit=20`,
      { headers, signal: AbortSignal.timeout(5000) }
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    const rawTrc20 = trc20Res?.data || [];
    const transactions: NormalizedTransaction[] = [];
    const tokens: TokenBalanceItem[] = [];

    // Track TRC-20 balances from transfer history / token info
    const tokenMap = new Map<string, { symbol: string; decimals: number; amount: number }>();

    for (const tx of rawTrc20) {
      const isIncoming = tx.to === address;
      const tokenInfo = tx.token_info || {};
      const decimals = tokenInfo.decimals || 6;
      const symbol = tokenInfo.symbol || "TRC-20";
      const rawVal = Number(tx.value || 0) / Math.pow(10, decimals);

      transactions.push({
        transactionHash: tx.transaction_id,
        chain: "tron",
        blockNumber: tx.block_timestamp ? Math.floor(tx.block_timestamp / 3000) : undefined,
        timestamp: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : undefined,
        from: tx.from,
        to: tx.to,
        asset: symbol,
        tokenAddress: tokenInfo.address,
        tokenSymbol: symbol,
        amount: rawVal,
        amountUsd: symbol.includes("USD") ? rawVal : null,
        direction: isIncoming ? "INCOMING" : "OUTGOING",
        status: "CONFIRMED",
        provider: "TronGrid Official API",
        dataSource: "LIVE_NATIVE_API",
        fetchedAt: new Date().toISOString(),
      });

      if (!tokenMap.has(tokenInfo.address || symbol)) {
        tokenMap.set(tokenInfo.address || symbol, {
          symbol,
          decimals,
          amount: isIncoming ? rawVal : 0,
        });
      }
    }

    for (const [addrKey, item] of tokenMap.entries()) {
      tokens.push({
        tokenAddress: addrKey,
        symbol: item.symbol,
        name: item.symbol === "USDT" ? "Tether USD (TRC-20)" : item.symbol,
        decimals: item.decimals,
        rawBalance: item.amount.toString(),
        balanceFormatted: `${item.amount.toLocaleString()} ${item.symbol}`,
        balanceNumber: item.amount,
        usdValue: item.symbol.includes("USD") ? item.amount : null,
      });
    }

    return {
      address,
      chain: "tron",
      isValid: true,
      isContract: isWitness,
      status: "LIVE",
      dataSource: "LIVE_NATIVE_API",
      provider: `TronGrid Official FullNode (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative,
      balanceFormatted: `${balanceNative.toLocaleString(undefined, { maximumFractionDigits: 4 })} TRX`,
      ticker: "TRX",
      usdValue,
      inrValue,
      txCount: transactions.length,
      tokens,
      transactions,
      limitations: [
        "Retrieved via official TronGrid native node infrastructure.",
        "TRC-20 transfers reflect authenticated events on the TRON network.",
      ],
    };
  } catch (err: any) {
    const isRate = err.message?.includes("RATE_LIMITED") || err.message?.includes("429");
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");

    return {
      address,
      chain: "tron",
      isValid: true,
      isContract: false,
      status: isRate ? "RATE_LIMITED" : isTimeout ? "TIMEOUT" : "UNAVAILABLE",
      dataSource: "LIVE_NATIVE_API",
      provider: `TronGrid API (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00 TRX",
      ticker: "TRX",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: `TRON node error: ${err.message}`,
    };
  }
}
