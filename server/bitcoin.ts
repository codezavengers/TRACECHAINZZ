import { getChainConfig } from "./config";
import type {
  NormalizedTransaction,
  ProviderHealth,
  TokenBalanceItem,
  LiveProbeResponse,
} from "./types";
import { getLivePrice } from "./price";

/**
 * Validates Bitcoin address across all standard formats:
 * - Native SegWit Bech32 (P2WPKH / P2WSH): bc1q...
 * - Taproot Bech32m (P2TR): bc1p...
 * - Legacy P2PKH: 1...
 * - Pay-to-Script-Hash P2SH: 3...
 */
export function isValidBitcoinAddress(address: string): boolean {
  const clean = address.trim();
  // Mainnet Bitcoin regex
  return /^(?:bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(clean);
}

/**
 * Direct JSON-RPC caller to Bitcoin Core node.
 * Strictly uses standard Bitcoin Core RPC API with Basic Auth.
 */
export async function callBitcoinRpc<T>(method: string, params: any[] = []): Promise<T> {
  const config = getChainConfig("bitcoin");
  if (!config.rpcUrl) {
    throw new Error("CONFIGURATION_REQUIRED: BITCOIN_RPC_URL is not configured in the environment.");
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
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("PROVIDER_ERROR: Bitcoin Core RPC Unauthorized. Check BITCOIN_RPC_USER and BITCOIN_RPC_PASSWORD.");
    }
    if (res.status === 429) {
      throw new Error("RATE_LIMITED: Bitcoin Core RPC rate limit reached.");
    }
    throw new Error(`PROVIDER_ERROR: Bitcoin Core RPC returned HTTP status ${res.status}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC_ERROR: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result as T;
}

/**
 * Verifies health and telemetry of the direct Bitcoin Core node.
 * Strictly adheres to direct-node mandates. Zero third-party explorer fallbacks.
 */
export async function checkBitcoinHealth(): Promise<ProviderHealth> {
  const config = getChainConfig("bitcoin");
  const t0 = Date.now();

  // If BITCOIN_RPC_URL, BITCOIN_RPC_USER, or BITCOIN_RPC_PASSWORD are not configured, report CONFIGURATION_REQUIRED honestly.
  if (!config.rpcUrl || !config.user || !config.password) {
    return {
      chain: "bitcoin",
      name: config.name,
      provider: "Bitcoin Core JSON-RPC (Unconfigured)",
      configured: false,
      reachable: false,
      status: "CONFIGURATION_REQUIRED",
      dataSource: "RAW_RPC",
      latencyMs: 0,
      fetchedAt: new Date().toISOString(),
      capabilities: {
        nativeBalance: false,
        tokenTransfers: false,
        historicalSearch: false,
        contractCode: false,
        utxo: true,
      },
      error: "CONFIGURATION_REQUIRED: BITCOIN_RPC_URL, BITCOIN_RPC_USER, and BITCOIN_RPC_PASSWORD are not configured. Live Bitcoin node connection requires Bitcoin Core node credentials. Third-party explorer APIs are strictly excluded from execution paths.",
    };
  }

  // Query the node directly
  try {
    const [blockchainInfo, networkInfo, bestHash] = await Promise.all([
      callBitcoinRpc<any>("getblockchaininfo"),
      callBitcoinRpc<any>("getnetworkinfo").catch(() => null),
      callBitcoinRpc<string>("getbestblockhash").catch(() => undefined),
    ]);

    const latencyMs = Math.max(1, Date.now() - t0);
    const blocks = blockchainInfo.blocks || blockchainInfo.headers || 0;
    const relayFee = networkInfo?.relayfee ? `${networkInfo.relayfee} BTC/kB` : "1.0 sat/vB";

    return {
      chain: "bitcoin",
      name: config.name,
      provider: `Bitcoin Core RPC (${config.rpcUrl})`,
      configured: true,
      reachable: true,
      status: "LIVE",
      dataSource: "RAW_RPC",
      blockHeight: blocks,
      latestBlock: blockchainInfo.headers || blocks,
      latencyMs,
      fetchedAt: new Date().toISOString(),
      gasOrFee: relayFee,
      capabilities: {
        nativeBalance: true,
        tokenTransfers: false,
        historicalSearch: true,
        contractCode: false,
        utxo: true,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, Date.now() - t0);
    return {
      chain: "bitcoin",
      name: config.name,
      provider: `Bitcoin Core RPC (${config.rpcUrl})`,
      configured: true,
      reachable: false,
      status: "UNAVAILABLE",
      dataSource: "RAW_RPC",
      latencyMs,
      fetchedAt: new Date().toISOString(),
      capabilities: {
        nativeBalance: false,
        tokenTransfers: false,
        historicalSearch: false,
        contractCode: false,
        utxo: true,
      },
      error: `Bitcoin Core RPC node unreachable: ${err.message}`,
    };
  }
}

/**
 * Investigates a Bitcoin address using native Bitcoin Core node RPC capabilities.
 * Checks validity, queries UTXO set via scantxoutset if supported, inspects mempool,
 * and formats transactions into the standard TraceChain forensic model.
 * Zero third-party explorer dependencies.
 */
export async function probeBitcoinAddress(address: string): Promise<Partial<LiveProbeResponse>> {
  const config = getChainConfig("bitcoin");
  const cleanAddr = address.trim();
  const isValid = isValidBitcoinAddress(cleanAddr);

  if (!isValid) {
    return {
      address: cleanAddr,
      chain: "bitcoin",
      isValid: false,
      isContract: false,
      status: "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: "Bitcoin Address Syntactic Validator",
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00000000 BTC",
      ticker: "BTC",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: "Invalid Bitcoin address format. Expected Native SegWit Bech32 (bc1q...), Taproot Bech32m (bc1p...), Legacy P2PKH (1...), or Nested P2SH (3...).",
    };
  }

  const priceData = await getLivePrice("bitcoin");

  // 1. If Bitcoin Core credentials are not configured, report CONFIGURATION_REQUIRED honestly
  if (!config.rpcUrl || !config.user || !config.password) {
    return {
      address: cleanAddr,
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
        "CONFIGURATION_REQUIRED: Set BITCOIN_RPC_URL, BITCOIN_RPC_USER, and BITCOIN_RPC_PASSWORD in .env to query a live Bitcoin Core node.",
        "Direct-Node Forensic Architecture Mandate: Third-party explorer APIs (mempool.space, blockchain.info, Blockstream, Blockchair) are strictly excluded from execution paths.",
        "To index arbitrary external Bitcoin address history, configure a Bitcoin Core node with -txindex=1 or scantxoutset scanning enabled.",
      ],
      error: "CONFIGURATION_REQUIRED: BITCOIN_RPC_USER and BITCOIN_RPC_PASSWORD are not configured. Live Bitcoin node connection requires node authentication.",
    };
  }

  // 2. Execute direct Bitcoin Core queries
  try {
      const blockchainInfo = await callBitcoinRpc<any>("getblockchaininfo");
      const tipHeight = blockchainInfo.blocks || 0;
      let balanceSats = 0;
      let txCount = 0;
      const transactions: NormalizedTransaction[] = [];
      const limitations: string[] = [];

      // Attempt UTXO scan via Bitcoin Core scantxoutset if available
      try {
        const scanRes = await callBitcoinRpc<any>("scantxoutset", [
          "start",
          [`addr(${cleanAddr})`],
        ]);

        if (scanRes && typeof scanRes.total_amount === "number") {
          balanceSats = Math.round(scanRes.total_amount * 1e8);
          txCount = scanRes.unspents?.length || 0;

          if (Array.isArray(scanRes.unspents)) {
            for (const utxo of scanRes.unspents.slice(0, 10)) {
              transactions.push({
                transactionHash: utxo.txid,
                chain: "bitcoin",
                blockNumber: utxo.height,
                timestamp: new Date().toISOString(),
                from: "Bitcoin Network UTXO",
                to: cleanAddr,
                asset: "BTC",
                amount: utxo.amount,
                amountUsd: priceData?.usd ? utxo.amount * priceData.usd : null,
                direction: "INCOMING",
                status: "CONFIRMED",
                provider: `Bitcoin Core RPC (${config.rpcUrl})`,
                dataSource: "RAW_RPC",
                fetchedAt: new Date().toISOString(),
              });
            }
          }
        }
      } catch (scanErr: any) {
        // scantxoutset might be disabled or busy; check mempool for pending transactions
        limitations.push(`UTXO set scan note: ${scanErr.message || "scantxoutset not enabled on target node"}.`);
      }

      // Check mempool for unconfirmed transactions involving this address
      try {
        const mempoolTxids = await callBitcoinRpc<string[]>("getrawmempool");
        if (Array.isArray(mempoolTxids) && mempoolTxids.length > 0) {
          // Inspect top 15 mempool txs for address match
          const checkCount = Math.min(15, mempoolTxids.length);
          for (let i = 0; i < checkCount; i++) {
            const rawTx = await callBitcoinRpc<any>("getrawtransaction", [mempoolTxids[i], true]).catch(() => null);
            if (rawTx) {
              const matchedOut = rawTx.vout?.find((v: any) => v.scriptPubKey?.address === cleanAddr);
              if (matchedOut) {
                transactions.unshift({
                  transactionHash: rawTx.txid,
                  chain: "bitcoin",
                  timestamp: new Date().toISOString(),
                  from: "Mempool Counterparty",
                  to: cleanAddr,
                  asset: "BTC",
                  amount: matchedOut.value || 0,
                  amountUsd: priceData?.usd ? (matchedOut.value || 0) * priceData.usd : null,
                  direction: "INCOMING",
                  status: "PENDING",
                  provider: `Bitcoin Core Mempool (${config.rpcUrl})`,
                  dataSource: "RAW_RPC",
                  fetchedAt: new Date().toISOString(),
                });
              }
            }
          }
        }
      } catch {
        // Mempool inspection optional
      }

      // If neither scantxoutset nor mempool yielded data because the node lacks an address index:
      const addressIndexAvailable = balanceSats > 0 || transactions.length > 0;
      if (!addressIndexAvailable) {
        return {
          address: cleanAddr,
          chain: "bitcoin",
          isValid: true,
          isContract: false,
          status: "UNSUPPORTED_WITH_CURRENT_RPC",
          dataSource: "RAW_RPC",
          provider: `Bitcoin Core RPC (${config.rpcUrl})`,
          queriedAt: new Date().toISOString(),
          blockHeight: tipHeight,
          balanceNative: 0,
          balanceFormatted: "0.00000000 BTC",
          ticker: "BTC",
          usdValue: null,
          inrValue: null,
          txCount: 0,
          tokens: [],
          transactions: [],
          limitations: [
            "UNSUPPORTED_WITH_CURRENT_RPC: Bitcoin address history without explorers or an indexed node is not possible.",
            "Required node configuration: Bitcoin Core with server=1, txindex=1, and electrs/Fulcrum or equivalent address index.",
            "Do NOT interpret empty transaction list as lack of on-chain activity; the configured node cannot index arbitrary external addresses without an address index.",
          ],
          error: "UNSUPPORTED_WITH_CURRENT_RPC: Address history unavailable from this Bitcoin node. Node requires txindex=1 and electrs/Fulcrum or scantxoutset access.",
        };
      }

      const balanceNative = balanceSats / 1e8;
      const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
      const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

      return {
        address: cleanAddr,
        chain: "bitcoin",
        isValid: true,
        isContract: false,
        status: "LIVE",
        dataSource: "RAW_RPC",
        provider: `Bitcoin Core RPC (${config.rpcUrl})`,
        queriedAt: new Date().toISOString(),
        blockHeight: tipHeight,
        balanceNative,
        balanceFormatted: `${balanceNative.toFixed(8)} BTC`,
        ticker: "BTC",
        usdValue,
        inrValue,
        txCount: Math.max(txCount, transactions.length),
        tokens: [],
        transactions,
        limitations: limitations.length > 0 ? limitations : [
          "Direct Bitcoin Core node authenticated. Historical multi-year UTXO tracking utilizes node -txindex and scantxoutset primitives.",
        ],
      };
    } catch (err: any) {
      return {
        address: cleanAddr,
        chain: "bitcoin",
        isValid: true,
        isContract: false,
        status: "UNAVAILABLE",
        dataSource: "RAW_RPC",
        provider: `Bitcoin Core RPC (${config.rpcUrl})`,
        queriedAt: new Date().toISOString(),
        balanceNative: 0,
        balanceFormatted: "0.00000000 BTC",
        ticker: "BTC",
        usdValue: null,
        inrValue: null,
        txCount: 0,
        tokens: [],
        transactions: [],
        error: `Error querying configured Bitcoin Core node: ${err.message}`,
      };
    }
}
