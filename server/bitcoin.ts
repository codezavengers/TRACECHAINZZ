import { getChainConfig } from "./config";
import type {
  NormalizedTransaction,
  ProviderHealth,
  TokenBalanceItem,
  FundFlowSummary,
  LiveProbeResponse,
} from "./types";
import { getLivePrice } from "./price";

export function isValidBitcoinAddress(address: string): boolean {
  const clean = address.trim();
  // Standard mainnet regex: legacy P2PKH (starts with 1), P2SH (starts with 3), Native SegWit Bech32 (starts with bc1)
  return /^(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(clean);
}

async function callBitcoinRpc<T>(method: string, params: any[] = []): Promise<T> {
  const config = getChainConfig("bitcoin");
  if (!config.rpcUrl) {
    throw new Error("CONFIGURATION_REQUIRED: BITCOIN_RPC_URL is not configured.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.user && config.password) {
    const auth = Buffer.from(`${config.user}:${config.password}`).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  const res = await fetch(config.rpcUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "1.0",
      id: "tracechain-btc",
      method,
      params,
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("PROVIDER_ERROR: Bitcoin Core RPC Unauthorized. Check BITCOIN_RPC_USER and BITCOIN_RPC_PASSWORD.");
    }
    if (res.status === 429) {
      throw new Error("RATE_LIMITED: Bitcoin Core RPC rate limit reached.");
    }
    throw new Error(`PROVIDER_ERROR: Bitcoin RPC returned HTTP status ${res.status}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC_ERROR: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result as T;
}

export async function checkBitcoinHealth(): Promise<ProviderHealth> {
  const config = getChainConfig("bitcoin");
  const t0 = Date.now();

  // If operator provided a custom Bitcoin Core RPC node, query it directly
  if (config.isCustomRpc && config.rpcUrl) {
    try {
      const [blockchainInfo, networkInfo] = await Promise.all([
        callBitcoinRpc<any>("getblockchaininfo"),
        callBitcoinRpc<any>("getnetworkinfo").catch(() => null),
      ]);

      const latencyMs = Math.max(1, Date.now() - t0);
      return {
        chain: "bitcoin",
        name: config.name,
        provider: `Bitcoin Core RPC (${config.rpcUrl})`,
        configured: true,
        reachable: true,
        status: "LIVE",
        dataSource: "RAW_RPC",
        blockHeight: blockchainInfo.blocks,
        latestBlock: blockchainInfo.headers,
        latencyMs,
        fetchedAt: new Date().toISOString(),
        gasOrFee: networkInfo?.relayfee ? `${networkInfo.relayfee} BTC/kB` : "1.0 sat/vB",
        capabilities: {
          nativeBalance: true,
          tokenTransfers: false,
          historicalSearch: false,
          contractCode: false,
          utxo: true,
        },
      };
    } catch (err: any) {
      // Fall through to public telemetry
    }
  }

  // Public Live Bitcoin Blockchain Analysis (mempool.space live telemetry)
  try {
    const [tipRes, feeRes] = await Promise.all([
      fetch("https://mempool.space/api/blocks/tip/height", {
        headers: { Accept: "text/plain, application/json" },
        signal: AbortSignal.timeout(4000),
      }),
      fetch("https://mempool.space/api/v1/fees/recommended", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      }).catch(() => null),
    ]);

    if (tipRes.ok) {
      const text = await tipRes.text();
      const height = parseInt(text.trim(), 10);
      const latencyMs = Math.max(1, Date.now() - t0);
      let feeStr = "1-2 sat/vB";
      if (feeRes && feeRes.ok) {
        const fees = await feeRes.json();
        if (fees?.fastestFee) {
          feeStr = `${fees.fastestFee} sat/vB`;
        }
      }

      return {
        chain: "bitcoin",
        name: config.name,
        provider: "Public Bitcoin Analysis (mempool.space live telemetry)",
        configured: true,
        reachable: true,
        status: "LIVE",
        dataSource: "RAW_RPC",
        blockHeight: height,
        latestBlock: height,
        latencyMs,
        fetchedAt: new Date().toISOString(),
        gasOrFee: feeStr,
        capabilities: {
          nativeBalance: true,
          tokenTransfers: false,
          historicalSearch: true,
          contractCode: false,
          utxo: true,
        },
      };
    }
  } catch {
    // Try secondary blockchain.info
  }

  // Secondary Public Fallback: blockchain.info/latestblock
  try {
    const res = await fetch("https://blockchain.info/latestblock", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      const latencyMs = Math.max(1, Date.now() - t0);
      const height = data.height || 0;
      return {
        chain: "bitcoin",
        name: config.name,
        provider: "Public Bitcoin Mainnet Node (blockchain.info)",
        configured: true,
        reachable: true,
        status: "LIVE",
        dataSource: "RAW_RPC",
        blockHeight: height,
        latestBlock: height,
        latencyMs,
        fetchedAt: new Date().toISOString(),
        gasOrFee: "2 sat/vB",
        capabilities: {
          nativeBalance: true,
          tokenTransfers: false,
          historicalSearch: true,
          contractCode: false,
          utxo: true,
        },
      };
    }
  } catch {
    // Continue
  }

  return {
    chain: "bitcoin",
    name: config.name,
    provider: "Public Bitcoin Mainnet Analysis",
    configured: true,
    reachable: false,
    status: "UNAVAILABLE",
    dataSource: "RAW_RPC",
    latencyMs: 0,
    fetchedAt: new Date().toISOString(),
    capabilities: {
      nativeBalance: true,
      tokenTransfers: false,
      historicalSearch: false,
      contractCode: false,
      utxo: true,
    },
    error: "Public Bitcoin analysis endpoints temporarily unavailable.",
  };
}

export async function probeBitcoinAddress(address: string): Promise<Partial<LiveProbeResponse>> {
  const config = getChainConfig("bitcoin");
  const isValid = isValidBitcoinAddress(address);

  if (!isValid) {
    return {
      address,
      chain: "bitcoin",
      isValid: false,
      status: "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: "Bitcoin Address Validator",
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00000000 BTC",
      ticker: "BTC",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: "Invalid Bitcoin address format. Supported: Bech32 (bc1...), P2PKH (1...), P2SH (3...).",
    };
  }

  const priceData = await getLivePrice("bitcoin");

  // 1. If BITCOIN_RPC_URL is set, use dedicated Bitcoin Core node
  if (config.rpcUrl) {
    try {
      const blockchainInfo = await callBitcoinRpc<any>("getblockchaininfo");

      return {
        address,
        chain: "bitcoin",
        isValid: true,
        isContract: false,
        status: "LIVE",
        dataSource: "RAW_RPC",
        provider: `Bitcoin Core RPC (${config.rpcUrl})`,
        queriedAt: new Date().toISOString(),
        blockHeight: blockchainInfo.blocks,
        balanceNative: 0,
        balanceFormatted: "0.00000000 BTC",
        ticker: "BTC",
        usdValue: null,
        inrValue: null,
        txCount: 0,
        tokens: [],
        transactions: [],
        limitations: [
          `Bitcoin Core node connected at block #${blockchainInfo.blocks}. Address indexing (-txindex) is required for external address history lookups on native Core.`,
        ],
      };
    } catch (err: any) {
      // Fall through to public fallback
    }
  }

  // 2. Public Live Bitcoin Address Fetcher (mempool.space + blockchain.info)
  try {
    const mempoolRes = await fetch(`https://mempool.space/api/address/${encodeURIComponent(address)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4500),
    });

    if (mempoolRes.ok) {
      const stats = await mempoolRes.json();
      const chainStats = stats.chain_stats || {};
      const mempoolStats = stats.mempool_stats || {};

      const funded = (chainStats.funded_txo_sum || 0) + (mempoolStats.funded_txo_sum || 0);
      const spent = (chainStats.spent_txo_sum || 0) + (mempoolStats.spent_txo_sum || 0);
      const balanceSats = Math.max(0, funded - spent);
      const balanceNative = balanceSats / 1e8;
      const txCount = (chainStats.tx_count || 0) + (mempoolStats.tx_count || 0);

      const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
      const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

      // Fetch recent txs for the address
      let transactions: NormalizedTransaction[] = [];
      try {
        const txsRes = await fetch(`https://mempool.space/api/address/${encodeURIComponent(address)}/txs`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        });
        if (txsRes.ok) {
          const rawTxs = await txsRes.json();
          if (Array.isArray(rawTxs)) {
            transactions = rawTxs.slice(0, 10).map((t: any) => {
              const totalOut = Array.isArray(t.vout)
                ? t.vout.reduce((acc: number, v: any) => acc + (v.value || 0), 0)
                : 0;
              const amountBtc = totalOut / 1e8;
              const txUsd = priceData?.usd ? amountBtc * priceData.usd : null;
              const firstSender = t.vin?.[0]?.prevout?.scriptpubkey_address || "Bitcoin Network";
              const firstRecipient = t.vout?.find((v: any) => v.scriptpubkey_address !== address)?.scriptpubkey_address || t.vout?.[0]?.scriptpubkey_address || "Bitcoin Network";

              const isOutgoing = firstSender === address;
              return {
                transactionHash: t.txid || "unknown_hash",
                chain: "bitcoin",
                blockNumber: t.status?.block_height,
                timestamp: t.status?.block_time ? new Date(t.status.block_time * 1000).toISOString() : new Date().toISOString(),
                from: firstSender,
                to: firstRecipient,
                asset: "BTC",
                amount: amountBtc,
                amountUsd: txUsd,
                direction: isOutgoing ? "OUTGOING" : "INCOMING",
                fee: t.fee ? `${(t.fee / 1e8).toFixed(8)} BTC` : undefined,
                feeFormatted: t.fee ? `${(t.fee / 1e8).toFixed(8)} BTC` : undefined,
                status: (t.status?.confirmed ? "CONFIRMED" : "PENDING") as "CONFIRMED" | "PENDING",
                provider: "Public Bitcoin Mainnet Node (mempool.space)",
                dataSource: "RAW_RPC",
                fetchedAt: new Date().toISOString(),
              };
            });
          }
        }
      } catch {
        // Continue with stats even if tx history times out
      }

      return {
        address,
        chain: "bitcoin",
        isValid: true,
        isContract: false,
        status: "LIVE",
        dataSource: "RAW_RPC",
        provider: "Public Bitcoin Mainnet Node (mempool.space live API)",
        queriedAt: new Date().toISOString(),
        balanceNative,
        balanceFormatted: `${balanceNative.toFixed(8)} BTC`,
        ticker: "BTC",
        usdValue,
        inrValue,
        txCount,
        tokens: [],
        transactions,
      };
    }
  } catch (err: any) {
    // Try secondary blockchain.info
  }

  // Secondary public fallback: blockchain.info
  try {
    const res = await fetch(`https://blockchain.info/rawaddr/${encodeURIComponent(address)}?limit=10`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const finalBalSats = data.final_balance ?? 0;
      const balanceNative = finalBalSats / 1e8;
      const txCount = data.n_tx ?? 0;

      const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
      const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

      const transactions: NormalizedTransaction[] = (data.txs || []).map((t: any) => {
        const timeIso = t.time ? new Date(t.time * 1000).toISOString() : new Date().toISOString();
        let totalOutSats = 0;
        let recipientAddr = "Bitcoin Network UTXO";

        if (Array.isArray(t.out) && t.out.length > 0) {
          totalOutSats = t.out.reduce((acc: number, o: any) => acc + (o.value || 0), 0);
          const firstOutWithAddr = t.out.find((o: any) => o.addr && o.addr !== address);
          if (firstOutWithAddr) {
            recipientAddr = firstOutWithAddr.addr;
          } else if (t.out[0]?.addr) {
            recipientAddr = t.out[0].addr;
          }
        }

        const txAmountBtc = totalOutSats / 1e8;
        const txUsd = priceData?.usd ? txAmountBtc * priceData.usd : null;

        return {
          transactionHash: t.hash || "unknown_hash",
          chain: "bitcoin",
          blockNumber: t.block_height || undefined,
          timestamp: timeIso,
          from: address,
          to: recipientAddr,
          asset: "BTC",
          amount: txAmountBtc,
          amountUsd: txUsd,
          direction: "OUTGOING",
          fee: t.fee ? `${t.fee / 1e8} BTC` : undefined,
          feeFormatted: t.fee ? `${t.fee / 1e8} BTC` : undefined,
          status: (t.block_height ? "CONFIRMED" : "PENDING") as "CONFIRMED" | "PENDING",
          provider: "Public Bitcoin Mainnet Node (blockchain.info)",
          dataSource: "RAW_RPC",
          fetchedAt: new Date().toISOString(),
        };
      });

      return {
        address,
        chain: "bitcoin",
        isValid: true,
        isContract: false,
        status: "LIVE",
        dataSource: "RAW_RPC",
        provider: "Public Bitcoin Mainnet Node (blockchain.info rawaddr)",
        queriedAt: new Date().toISOString(),
        blockHeight: data.txs?.[0]?.block_height,
        balanceNative,
        balanceFormatted: `${balanceNative.toFixed(8)} BTC`,
        ticker: "BTC",
        usdValue,
        inrValue,
        txCount,
        tokens: [],
        transactions,
      };
    }
  } catch (err: any) {
    console.error("Public Bitcoin lookup error:", err);
  }

  // 3. Fallback unconfigured message if public endpoint is unavailable
  return {
    address,
    chain: "bitcoin",
    isValid: true,
    isContract: false,
    status: "CONFIGURATION_REQUIRED",
    dataSource: "RAW_RPC",
    provider: "Bitcoin Core JSON-RPC (Unconfigured)",
    queriedAt: new Date().toISOString(),
    balanceNative: 0,
    balanceFormatted: "0.00000000 BTC",
    ticker: "BTC",
    usdValue: null,
    inrValue: null,
    txCount: 0,
    tokens: [],
    transactions: [],
    limitations: [
      "Set BITCOIN_RPC_URL, BITCOIN_RPC_USER, and BITCOIN_RPC_PASSWORD to connect to a dedicated Bitcoin Core RPC node.",
    ],
    error: "Bitcoin live endpoint unavailable or unconfigured.",
  };
}
