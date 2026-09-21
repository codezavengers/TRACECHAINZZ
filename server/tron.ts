import crypto from "crypto";
import { getChainConfig } from "./config";
import type {
  NormalizedTransaction,
  ProviderHealth,
  TokenBalanceItem,
  LiveProbeResponse,
} from "./types";
import { getLivePrice } from "./price";

// Base58Check alphabet
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(string: string): Buffer {
  let bytes = [0];
  for (let i = 0; i < string.length; i++) {
    const c = string[i];
    const value = ALPHABET.indexOf(c);
    if (value === -1) throw new Error("Non-base58 character");
    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
    bytes[0] += value;
    let carry = 0;
    for (let j = 0; j < bytes.length; ++j) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 255;
    }
    while (carry > 0) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  for (let i = 0; i < string.length && string[i] === "1"; i++) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

function encodeBase58(buffer: Buffer): string {
  const digits: number[] = [];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; ++j) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) str += "1";
  for (let i = digits.length - 1; i >= 0; i--) str += ALPHABET[digits[i]];
  return str;
}

export function isValidTronAddress(address: string): boolean {
  const clean = address.trim();
  // Standard TRON Base58Check address (starts with 'T', 34 chars)
  if (/^T[A-Za-z1-9]{33}$/.test(clean)) {
    try {
      const buf = decodeBase58(clean);
      if (buf.length !== 25) return false;
      if (buf[0] !== 0x41) return false; // TRON mainnet prefix
      const data = buf.slice(0, 21);
      const checksum = buf.slice(21);
      const h1 = crypto.createHash("sha256").update(data).digest();
      const h2 = crypto.createHash("sha256").update(h1).digest();
      return h2.slice(0, 4).equals(checksum);
    } catch {
      return false;
    }
  }

  // Also support 40 or 42 hex address (0x... or 41...)
  if (/^(0x)?[0-9a-fA-F]{40}$/.test(clean) || /^(0x)?41[0-9a-fA-F]{40}$/.test(clean)) {
    return true;
  }

  return false;
}

export function tronBase58ToHex(base58: string): string {
  const clean = base58.trim();
  if (/^(0x)?[0-9a-fA-F]{40}$/.test(clean)) {
    return "0x" + clean.replace(/^0x/, "").toLowerCase();
  }
  if (/^(0x)?41[0-9a-fA-F]{40}$/.test(clean)) {
    return "0x" + clean.replace(/^(0x)?41/, "").toLowerCase();
  }
  const buf = decodeBase58(clean);
  if (buf.length !== 25) throw new Error("Invalid TRON address length");
  return "0x" + buf.slice(1, 21).toString("hex").toLowerCase();
}

export function hexToTronBase58(hex: string): string {
  const clean = hex.replace(/^0x/, "").toLowerCase();
  const raw20 = clean.length === 42 && clean.startsWith("41") ? clean.slice(2) : clean;
  if (raw20.length !== 40) return hex;
  const prefixAndAddr = Buffer.concat([Buffer.from([0x41]), Buffer.from(raw20, "hex")]);
  const h1 = crypto.createHash("sha256").update(prefixAndAddr).digest();
  const h2 = crypto.createHash("sha256").update(h1).digest();
  const full = Buffer.concat([prefixAndAddr, h2.slice(0, 4)]);
  return encodeBase58(full);
}

let tronReqCounter = 1;

/**
 * Direct JSON-RPC caller to TRON node (https://api.trongrid.io/jsonrpc).
 * Does NOT require TRACECHAIN_TRON_API_KEY for native JSON-RPC execution.
 * TRACECHAIN_TRON_API_KEY is completely optional.
 */
export async function callTronRpc<T>(method: string, params: any[] = []): Promise<T> {
  const config = getChainConfig("tron");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Optional API key support if configured in the environment
  if (config.apiKey) {
    headers["TRON-PRO-API-KEY"] = config.apiKey;
  }

  let lastError: any = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(config.rpcUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++tronReqCounter,
          method,
          params,
        }),
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(`RATE_LIMITED: TRON RPC returned HTTP 429`);
        }
        throw new Error(`PROVIDER_ERROR: TRON RPC returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.error) {
        const msg = json.error.message || JSON.stringify(json.error);
        if (msg.includes("rate limit") || msg.includes("too many requests")) {
          throw new Error(`RATE_LIMITED: ${msg}`);
        }
        throw new Error(`RPC_ERROR: ${msg}`);
      }

      return json.result as T;
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes("RATE_LIMITED") || attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError;
}

export async function checkTronHealth(): Promise<ProviderHealth> {
  const config = getChainConfig("tron");
  const t0 = Date.now();

  try {
    const blockHex = await callTronRpc<string>("eth_blockNumber");
    const blockHeight = parseInt(blockHex, 16);
    const latencyMs = Math.max(1, Date.now() - t0);

    return {
      chain: "tron",
      name: config.name,
      provider: `TRON Native API (${config.rpcUrl})`,
      configured: true,
      reachable: true,
      status: "LIVE",
      dataSource: "LIVE_NATIVE_API",
      latestBlock: blockHeight,
      blockHeight,
      latencyMs,
      fetchedAt: new Date().toISOString(),
      gasOrFee: "Energy / Sun",
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
      provider: `TRON Native API (${config.rpcUrl})`,
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
      error: `TRON node unreachable: ${err.message}`,
    };
  }
}

// Major TRC-20 contracts on TRON mainnet
const NOTABLE_TRC20_TOKENS = [
  {
    base58: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    hex: "0xa614f803b6fd780986a42c78ec9c7f77e6ded13c",
    symbol: "USDT",
    name: "Tether USD (TRC-20)",
    decimals: 6,
  },
  {
    base58: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
    hex: "0x3484b3164923e49bf977efd5fb305c4ea092a839",
    symbol: "USDC",
    name: "USD Coin (TRC-20)",
    decimals: 6,
  },
  {
    base58: "TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn",
    hex: "0x1e360f0bc98e984f47eec65942460835f8d68962",
    symbol: "USDD",
    name: "Decentralized USD (TRC-20)",
    decimals: 18,
  },
];

export async function probeTronAddress(address: string): Promise<Partial<LiveProbeResponse>> {
  const config = getChainConfig("tron");
  const clean = address.trim();
  const isValid = isValidTronAddress(clean);

  if (!isValid) {
    return {
      address: clean,
      chain: "tron",
      isValid: false,
      isContract: false,
      status: "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: "TRON Base58Check Syntactic Validator",
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00 TRX",
      ticker: "TRX",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: "Invalid TRON address format. Expected a 34-character Base58Check string starting with 'T' or a 40-character hex address.",
    };
  }

  const hexAddr = tronBase58ToHex(clean);
  const base58Addr = hexToTronBase58(hexAddr);
  const paddedHexAddr = "0x000000000000000000000000" + hexAddr.replace(/^0x/, "");
  const priceData = await getLivePrice("tron");

  try {
    // 1. Parallel native queries to the direct JSON-RPC node
    const [balHex, codeHex, blockHex] = await Promise.all([
      callTronRpc<string>("eth_getBalance", [hexAddr, "latest"]),
      callTronRpc<string>("eth_getCode", [hexAddr, "latest"]).catch(() => "0x"),
      callTronRpc<string>("eth_blockNumber", []),
    ]);

    const balanceSun = BigInt(balHex || "0x0");
    const balanceNative = Number(balanceSun) / 1e6; // 1 TRX = 1,000,000 SUN
    const isContract = Boolean(codeHex && codeHex !== "0x" && codeHex !== "0x0" && codeHex.length > 2);
    const blockHeight = parseInt(blockHex || "0x0", 16);

    const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
    const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

    // 2. Authoritative on-chain TRC-20 balance checks via direct eth_call (balanceOf)
    const tokens: TokenBalanceItem[] = [];
    const balanceOfCallData = "0x70a08231" + paddedHexAddr.replace(/^0x/, "");

    const tokenBalanceResults = await Promise.allSettled(
      NOTABLE_TRC20_TOKENS.map(async (tok) => {
        const rawHex = await callTronRpc<string>("eth_call", [
          { to: tok.hex, data: balanceOfCallData },
          "latest",
        ]);
        const rawBal = BigInt(rawHex || "0x0");
        const balanceNumber = Number(rawBal) / Math.pow(10, tok.decimals);
        return {
          tokenAddress: tok.base58,
          symbol: tok.symbol,
          name: tok.name,
          decimals: tok.decimals,
          rawBalance: rawBal.toString(),
          balanceFormatted: `${balanceNumber.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tok.symbol}`,
          balanceNumber,
          usdValue: tok.symbol.includes("USD") ? balanceNumber : null,
        };
      })
    );

    for (const res of tokenBalanceResults) {
      if (res.status === "fulfilled" && res.value.balanceNumber > 0) {
        tokens.push(res.value);
      }
    }

    // 3. Scan recent on-chain TRC-20 Transfer logs via native eth_getLogs (recent 1,500 blocks)
    // Direct JSON-RPC event logs are the authoritative on-chain data source; TronGrid V1 indexed history is not used.
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const scanDepth = 1500;
    const fromBlockNum = Math.max(0, blockHeight - scanDepth);
    const hexFrom = "0x" + fromBlockNum.toString(16);
    const hexTo = "0x" + blockHeight.toString(16);

    const [inLogs, outLogs] = await Promise.all([
      callTronRpc<any[]>("eth_getLogs", [
        {
          fromBlock: hexFrom,
          toBlock: hexTo,
          topics: [TRANSFER_TOPIC, null, paddedHexAddr],
        },
      ]).catch(() => []),
      callTronRpc<any[]>("eth_getLogs", [
        {
          fromBlock: hexFrom,
          toBlock: hexTo,
          topics: [TRANSFER_TOPIC, paddedHexAddr],
        },
      ]).catch(() => []),
    ]);

    const combinedLogs = [...(Array.isArray(inLogs) ? inLogs : []), ...(Array.isArray(outLogs) ? outLogs : [])];

    // Deduplicate logs by transactionHash + logIndex
    const seen = new Set<string>();
    const uniqueLogs: any[] = [];
    for (const log of combinedLogs) {
      const key = `${log.transactionHash}_${log.logIndex || 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLogs.push(log);
      }
    }

    const transactions: NormalizedTransaction[] = [];

    for (const log of uniqueLogs.slice(0, 25)) {
      const fromTopic = log.topics?.[1];
      const toTopic = log.topics?.[2];
      const fromHex = fromTopic ? "0x" + fromTopic.slice(26) : "0x";
      const toHex = toTopic ? "0x" + toTopic.slice(26) : "0x";

      const fromBase58 = hexToTronBase58(fromHex);
      const toBase58 = hexToTronBase58(toHex);
      const isIncoming = toHex.toLowerCase() === hexAddr.toLowerCase();

      // Find token definition
      const matchedToken = NOTABLE_TRC20_TOKENS.find(
        (t) => t.hex.toLowerCase() === log.address?.toLowerCase()
      );
      const tokenSymbol = matchedToken ? matchedToken.symbol : "TRC-20";
      const tokenDecimals = matchedToken ? matchedToken.decimals : 6;

      let amount = 0;
      try {
        amount = Number(BigInt(log.data || "0x0")) / Math.pow(10, tokenDecimals);
      } catch {
        amount = 0;
      }

      let txTime = new Date().toISOString();
      if (log.blockTimestamp) {
        const sec = parseInt(log.blockTimestamp, 16);
        if (sec > 0) txTime = new Date(sec * 1000).toISOString();
      }

      transactions.push({
        transactionHash: log.transactionHash,
        chain: "tron",
        blockNumber: parseInt(log.blockNumber, 16),
        timestamp: txTime,
        from: fromBase58,
        to: toBase58,
        asset: tokenSymbol,
        tokenAddress: matchedToken?.base58 || log.address,
        tokenSymbol,
        amount,
        amountUsd: tokenSymbol.includes("USD") ? amount : null,
        direction: isIncoming ? "INCOMING" : "OUTGOING",
        status: "CONFIRMED",
        provider: `TRON Native API (${config.rpcUrl})`,
        dataSource: "LIVE_NATIVE_API",
        fetchedAt: new Date().toISOString(),
      });
    }

    return {
      address: base58Addr,
      chain: "tron",
      isValid: true,
      isContract,
      status: "LIVE",
      dataSource: "LIVE_NATIVE_API",
      provider: `TRON Native API (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative,
      balanceFormatted: `${balanceNative.toLocaleString(undefined, { maximumFractionDigits: 6 })} TRX`,
      ticker: "TRX",
      usdValue,
      inrValue,
      txCount: transactions.length,
      blockHeight,
      tokens,
      transactions,
      limitations: [
        `Direct native API connection to TRON verified at block #${blockHeight}.`,
        `On-chain TRC-20 balance checks and recent event log scans executed via native eth_call / eth_getLogs.`,
        "Direct-Node Architecture Mandate: Third-party explorer APIs are excluded from authoritative forensic evidence.",
      ],
    };
  } catch (err: any) {
    const isRate = err.message?.includes("RATE_LIMITED") || err.message?.includes("429");
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");

    return {
      address: base58Addr,
      chain: "tron",
      isValid: true,
      isContract: false,
      status: isRate ? "RATE_LIMITED" : isTimeout ? "TIMEOUT" : "UNAVAILABLE",
      dataSource: "LIVE_NATIVE_API",
      provider: `TRON Native API (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00 TRX",
      ticker: "TRX",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: `TRON JSON-RPC node query error: ${err.message}`,
    };
  }
}
