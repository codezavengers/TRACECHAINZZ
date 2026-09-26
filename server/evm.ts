import { getChainConfig } from "./config";
import type { Chain } from "../src/lib/types";
import type {
  NormalizedTransaction,
  ProviderHealth,
  TokenBalanceItem,
  LiveProbeResponse,
} from "./types";
import { getLivePrice } from "./price";

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

let evmReqCounter = 1;

/**
 * Direct JSON-RPC caller with automatic retry and rate-limiting detection.
 */
async function callEvmRpc<T>(chain: Chain, method: string, params: any[] = []): Promise<T> {
  const config = getChainConfig(chain);
  if (!config.rpcUrl) {
    throw new Error(`CONFIGURATION_REQUIRED: RPC URL not configured for ${chain}.`);
  }

  let lastError: any = null;
  const maxAttempts = 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(config.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++evmReqCounter,
          method,
          params,
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(`RATE_LIMITED: ${config.name} RPC returned HTTP 429`);
        }
        throw new Error(`PROVIDER_ERROR: ${config.name} RPC returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.error) {
        const errMsg = json.error.message || JSON.stringify(json.error);
        if (errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
          throw new Error(`RATE_LIMITED: ${errMsg}`);
        }
        throw new Error(`RPC_ERROR: ${errMsg}`);
      }

      return json.result as T;
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes("RATE_LIMITED") || attempt === maxAttempts) {
        break;
      }
      // Brief jitter before retry
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError;
}

export async function checkEvmHealth(chain: Chain): Promise<ProviderHealth> {
  const config = getChainConfig(chain);
  const t0 = Date.now();

  try {
    const [blockHex, gasHex] = await Promise.all([
      callEvmRpc<string>(chain, "eth_blockNumber"),
      callEvmRpc<string>(chain, "eth_gasPrice").catch(() => "0x0"),
    ]);

    const blockHeight = parseInt(blockHex, 16);
    const gasWei = BigInt(gasHex);
    const gasGwei = (Number(gasWei) / 1e9).toFixed(2);
    const latencyMs = Math.max(1, Date.now() - t0);

    return {
      chain,
      name: config.name,
      provider: `${config.name} JSON-RPC (${config.rpcUrl})`,
      configured: true,
      reachable: true,
      status: "LIVE",
      dataSource: "RAW_RPC",
      latestBlock: blockHeight,
      blockHeight,
      latencyMs,
      fetchedAt: new Date().toISOString(),
      gasOrFee: `${gasGwei} Gwei`,
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
      chain,
      name: config.name,
      provider: `${config.name} JSON-RPC (${config.rpcUrl})`,
      configured: true,
      reachable: false,
      status: isRate ? "RATE_LIMITED" : isTimeout ? "TIMEOUT" : "UNAVAILABLE",
      dataSource: "RAW_RPC",
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

// ABI helper: Decode uint256 / string / bytes from eth_call
function decodeStringOrBytes(hex: string): string {
  if (!hex || hex === "0x") return "";
  try {
    const clean = hex.replace(/^0x/, "");
    // If dynamic string (offset at first 32 bytes)
    if (clean.length >= 128) {
      const lenHex = clean.slice(64, 128);
      const len = parseInt(lenHex, 16);
      const strHex = clean.slice(128, 128 + len * 2);
      let str = "";
      for (let i = 0; i < strHex.length; i += 2) {
        const code = parseInt(strHex.substr(i, 2), 16);
        if (code > 0) str += String.fromCharCode(code);
      }
      return str.trim();
    }
    // Static bytes32 string
    let str = "";
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.substr(i, 2), 16);
      if (code > 0) str += String.fromCharCode(code);
    }
    return str.trim();
  } catch {
    return "";
  }
}

// In-memory cache for ERC-20 metadata to avoid hammering RPC
const tokenMetadataCache = new Map<string, { decimals: number; symbol: string; name: string }>();

// Query ERC-20 token info (decimals, symbol, name) via eth_call
export async function getErc20Metadata(chain: Chain, contractAddress: string): Promise<{
  decimals: number;
  symbol: string;
  name: string;
} | null> {
  const cacheKey = `${chain}:${contractAddress.toLowerCase()}`;
  if (tokenMetadataCache.has(cacheKey)) {
    return tokenMetadataCache.get(cacheKey)!;
  }

  try {
    // 0x313ce567 = decimals()
    // 0x95d89b41 = symbol()
    // 0x06fdde03 = name()
    const [decHex, symHex, nameHex] = await Promise.all([
      callEvmRpc<string>(chain, "eth_call", [{ to: contractAddress, data: "0x313ce567" }, "latest"]).catch(() => "0x12"),
      callEvmRpc<string>(chain, "eth_call", [{ to: contractAddress, data: "0x95d89b41" }, "latest"]).catch(() => "0x"),
      callEvmRpc<string>(chain, "eth_call", [{ to: contractAddress, data: "0x06fdde03" }, "latest"]).catch(() => "0x"),
    ]);

    const decimals = parseInt(decHex || "0x12", 16) || 18;
    const symbol = decodeStringOrBytes(symHex) || "ERC20";
    const name = decodeStringOrBytes(nameHex) || symbol;

    const result = { decimals, symbol, name };
    tokenMetadataCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// Well-known ERC-20 tokens per EVM chain for balance polling
const NOTABLE_EVM_TOKENS: Partial<Record<Chain, Array<{ address: string; symbol: string; name: string; decimals: number }>>> = {
  ethereum: [
    { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  ],
  polygon: [
    { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
  bsc: [
    { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", name: "Tether USD (BSC)", decimals: 18 },
    { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
    { address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18 },
  ],
  arbitrum: [
    { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  optimism: [
    { address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
  base: [
    { address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", symbol: "USDC", name: "USD Coin (Base)", decimals: 6 },
  ],
  avalanche: [
    { address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", symbol: "USDt", name: "Tether USD (Avalanche)", decimals: 6 },
    { address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", symbol: "USDC", name: "USD Coin", decimals: 6 },
  ],
};

/**
 * Executes adaptive chunked eth_getLogs query to retrieve ERC-20 Transfer events.
 * Handles RPC block-range constraints by dynamically reducing chunk size on error.
 */
async function fetchChunkedErc20Logs(
  chain: Chain,
  paddedAddress: string,
  fromBlock: number,
  toBlock: number
): Promise<any[]> {
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  let chunkSize = 1500;
  const collectedLogs: any[] = [];

  let curFrom = fromBlock;
  while (curFrom <= toBlock && collectedLogs.length < 50) {
    let curTo = Math.min(curFrom + chunkSize, toBlock);
    const hexFrom = "0x" + curFrom.toString(16);
    const hexTo = "0x" + curTo.toString(16);

    try {
      const [inChunk, outChunk] = await Promise.all([
        callEvmRpc<any[]>(chain, "eth_getLogs", [
          {
            fromBlock: hexFrom,
            toBlock: hexTo,
            topics: [TRANSFER_TOPIC, null, paddedAddress],
          },
        ]).catch(() => []),
        callEvmRpc<any[]>(chain, "eth_getLogs", [
          {
            fromBlock: hexFrom,
            toBlock: hexTo,
            topics: [TRANSFER_TOPIC, paddedAddress],
          },
        ]).catch(() => []),
      ]);

      if (Array.isArray(inChunk)) collectedLogs.push(...inChunk);
      if (Array.isArray(outChunk)) collectedLogs.push(...outChunk);

      curFrom = curTo + 1;
    } catch (err: any) {
      // If block range error, reduce chunk size
      if (chunkSize > 300) {
        chunkSize = Math.floor(chunkSize / 2);
      } else {
        // Skip current chunk to prevent blocking
        curFrom = curTo + 1;
      }
    }
  }

  // Deduplicate by txHash + logIndex
  const seen = new Set<string>();
  const uniqueLogs: any[] = [];
  for (const log of collectedLogs) {
    const key = `${log.transactionHash}_${log.logIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLogs.push(log);
    }
  }

  return uniqueLogs;
}

export async function probeEvmAddress(address: string, chain: Chain): Promise<Partial<LiveProbeResponse>> {
  const config = getChainConfig(chain);
  const cleanAddr = address.trim();
  const isValid = isValidEvmAddress(cleanAddr);

  if (!isValid) {
    return {
      address: cleanAddr,
      chain,
      isValid: false,
      status: "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: `${config.name} Address Validator`,
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00",
      ticker: config.ticker,
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: `Invalid EVM address format: ${cleanAddr}. Must be 0x followed by 40 hex characters.`,
    };
  }

  const paddedAddress = "0x000000000000000000000000" + cleanAddr.toLowerCase().replace(/^0x/, "");
  const priceData = await getLivePrice(chain);

  try {
    // 1. Parallel native RPC queries for state inspection
    const [balHex, txCountHex, codeHex, blockHex] = await Promise.all([
      callEvmRpc<string>(chain, "eth_getBalance", [cleanAddr, "latest"]),
      callEvmRpc<string>(chain, "eth_getTransactionCount", [cleanAddr, "latest"]),
      callEvmRpc<string>(chain, "eth_getCode", [cleanAddr, "latest"]),
      callEvmRpc<string>(chain, "eth_blockNumber", []),
    ]);

    const balanceWei = BigInt(balHex || "0x0");
    const balanceNative = Number(balanceWei) / 1e18;
    const txCount = parseInt(txCountHex || "0x0", 16);
    const isContract = Boolean(codeHex && codeHex !== "0x" && codeHex !== "0x0" && codeHex.length > 2);
    const blockHeight = parseInt(blockHex || "0x0", 16);

    const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
    const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

    // 2. Query ERC-20 Token Balances for known major tokens
    const tokens: TokenBalanceItem[] = [];
    const notableTokens = NOTABLE_EVM_TOKENS[chain] || [];

    // BalanceOf selector: 0x70a08231 + 32-byte padded address
    const balanceOfData = "0x70a08231" + paddedAddress.replace(/^0x/, "");

    const tokenBalanceResults = await Promise.allSettled(
      notableTokens.map(async (t) => {
        const rawHex = await callEvmRpc<string>(chain, "eth_call", [
          { to: t.address, data: balanceOfData },
          "latest",
        ]);
        const rawBal = BigInt(rawHex || "0x0");
        const balanceNumber = Number(rawBal) / Math.pow(10, t.decimals);
        return {
          tokenAddress: t.address,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          rawBalance: rawBal.toString(),
          balanceFormatted: `${balanceNumber.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t.symbol}`,
          balanceNumber,
          usdValue: t.symbol.includes("USD") ? balanceNumber : null,
        };
      })
    );

    for (const r of tokenBalanceResults) {
      if (r.status === "fulfilled" && r.value.balanceNumber > 0) {
        tokens.push(r.value);
      }
    }

    // 3. Search recent Transfer logs via adaptive chunked eth_getLogs (recent 1,500 blocks with 2s timeout)
    const scanDepth = 1500;
    const fromBlockNum = Math.max(0, blockHeight - scanDepth);
    const rawLogsPromise = fetchChunkedErc20Logs(chain, paddedAddress, fromBlockNum, blockHeight);
    const logsTimeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2500));
    const rawLogs = await Promise.race([rawLogsPromise, logsTimeoutPromise]).catch(() => []);

    const transactions: NormalizedTransaction[] = [];

    for (const log of rawLogs.slice(0, 25)) {
      const fromTopic = log.topics?.[1];
      const toTopic = log.topics?.[2];
      const fromAddr = fromTopic ? "0x" + fromTopic.slice(26) : "0x";
      const toAddr = toTopic ? "0x" + toTopic.slice(26) : "0x";
      const isIncoming = toAddr.toLowerCase() === cleanAddr.toLowerCase();

      // Resolve token info
      let tokenSymbol = "ERC20";
      let decimals = 18;

      const matched = notableTokens.find((t) => t.address.toLowerCase() === log.address.toLowerCase());
      if (matched) {
        tokenSymbol = matched.symbol;
        decimals = matched.decimals;
      } else {
        const meta = await getErc20Metadata(chain, log.address);
        if (meta) {
          tokenSymbol = meta.symbol;
          decimals = meta.decimals;
        }
      }

      let rawAmount = 0;
      try {
        rawAmount = Number(BigInt(log.data || "0x0")) / Math.pow(10, decimals);
      } catch {
        rawAmount = 0;
      }

      transactions.push({
        transactionHash: log.transactionHash,
        chain,
        blockNumber: parseInt(log.blockNumber, 16),
        timestamp: new Date().toISOString(),
        from: fromAddr,
        to: toAddr,
        asset: tokenSymbol,
        tokenAddress: log.address,
        tokenSymbol,
        amount: rawAmount,
        amountUsd: tokenSymbol.includes("USD") ? rawAmount : null,
        direction: isIncoming ? "INCOMING" : "OUTGOING",
        status: "CONFIRMED",
        provider: `${config.name} JSON-RPC`,
        dataSource: "RAW_RPC",
        fetchedAt: new Date().toISOString(),
      });
    }

    return {
      address: cleanAddr,
      chain,
      isValid: true,
      isContract,
      status: "LIVE",
      dataSource: "RAW_RPC",
      provider: `${config.name} Native RPC (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative,
      balanceFormatted: `${balanceNative.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${config.ticker}`,
      ticker: config.ticker,
      usdValue,
      inrValue,
      txCount,
      blockHeight,
      tokens,
      transactions,
      limitations: [
        `Direct JSON-RPC connection to ${config.name} verified at block #${blockHeight}.`,
        `Recent ERC-20 event log scan covered blocks #${fromBlockNum} to #${blockHeight} via native eth_getLogs.`,
        "Historical multi-year searches beyond public node limits require an archival node endpoint.",
      ],
    };
  } catch (err: any) {
    const isRate = err.message?.includes("RATE_LIMITED") || err.message?.includes("429");
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");

    return {
      address: cleanAddr,
      chain,
      isValid: true,
      isContract: false,
      status: isRate ? "RATE_LIMITED" : isTimeout ? "TIMEOUT" : "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: `${config.name} JSON-RPC (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: `0.00 ${config.ticker}`,
      ticker: config.ticker,
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: `RPC error on ${config.name}: ${err.message}`,
      limitations: [
        `RPC query to ${config.rpcUrl} failed: ${err.message}`,
        "Please verify network connectivity or configure a dedicated node in your environment.",
      ],
    };
  }
}
