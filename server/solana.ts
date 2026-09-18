import { getChainConfig } from "./config";
import type {
  NormalizedTransaction,
  ProviderHealth,
  TokenBalanceItem,
  LiveProbeResponse,
} from "./types";
import { getLivePrice } from "./price";

export function isValidSolanaAddress(address: string): boolean {
  // Base58 format 32 to 44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
}

async function callSolanaRpc<T>(method: string, params: any[] = []): Promise<T> {
  const config = getChainConfig("solana");
  const res = await fetch(config.rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("RATE_LIMITED: Solana RPC HTTP 429.");
    }
    throw new Error(`PROVIDER_ERROR: Solana RPC returned HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC_ERROR: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result as T;
}

export async function checkSolanaHealth(): Promise<ProviderHealth> {
  const config = getChainConfig("solana");
  const t0 = Date.now();

  try {
    const [slot, blockHeight] = await Promise.all([
      callSolanaRpc<number>("getSlot"),
      callSolanaRpc<number>("getBlockHeight").catch(() => 0),
    ]);

    const latencyMs = Math.max(1, Date.now() - t0);

    return {
      chain: "solana",
      name: config.name,
      provider: `Solana Native JSON-RPC (${config.rpcUrl})`,
      configured: true,
      reachable: true,
      status: "LIVE",
      dataSource: "RAW_RPC",
      slot,
      blockHeight,
      latestBlock: blockHeight || slot,
      latencyMs,
      fetchedAt: new Date().toISOString(),
      gasOrFee: "5000 lamports (0.000005 SOL)",
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
      chain: "solana",
      name: config.name,
      provider: `Solana JSON-RPC (${config.rpcUrl})`,
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

export async function probeSolanaAddress(address: string): Promise<Partial<LiveProbeResponse>> {
  const config = getChainConfig("solana");
  const isValid = isValidSolanaAddress(address);

  if (!isValid) {
    return {
      address,
      chain: "solana",
      isValid: false,
      status: "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: "Solana Base58 Validator",
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00 SOL",
      ticker: "SOL",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: "Invalid Solana address format. Must be a valid Base58 public key (32-44 characters).",
    };
  }

  const priceData = await getLivePrice("solana");

  try {
    // 1. Parallel native queries: Balance, Account Info, Signatures
    const [balRes, accInfoRes, sigsRes] = await Promise.all([
      callSolanaRpc<any>("getBalance", [address]),
      callSolanaRpc<any>("getAccountInfo", [address, { encoding: "jsonParsed" }]).catch(() => null),
      callSolanaRpc<any[]>("getSignaturesForAddress", [address, { limit: 15 }]).catch(() => []),
    ]);

    const lamports = balRes?.value ?? 0;
    const balanceNative = lamports / 1e9;
    const isContract = Boolean(accInfoRes?.value?.executable);

    const usdValue = priceData?.usd ? balanceNative * priceData.usd : null;
    const inrValue = priceData?.inr ? balanceNative * priceData.inr : null;

    // 2. Parse signatures into normalized transactions
    const rawSigs = Array.isArray(sigsRes) ? sigsRes : [];
    const transactions: NormalizedTransaction[] = rawSigs.map((sig) => {
      const isFailed = Boolean(sig.err);
      return {
        transactionHash: sig.signature,
        chain: "solana",
        blockNumber: sig.slot,
        timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : undefined,
        from: address,
        to: "Solana Program / Cluster",
        asset: "SOL",
        amount: 0, // Unparsed raw signature
        direction: "OUTGOING",
        status: isFailed ? "FAILED" : "CONFIRMED",
        confirmations: sig.confirmationStatus === "finalized" ? 32 : 1,
        provider: "Solana Native RPC",
        dataSource: "RAW_RPC",
        fetchedAt: new Date().toISOString(),
      };
    });

    // 3. Query SPL token accounts for this wallet
    const tokens: TokenBalanceItem[] = [];
    try {
      const tokenAccs = await callSolanaRpc<any>("getTokenAccountsByOwner", [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]);

      if (tokenAccs?.value && Array.isArray(tokenAccs.value)) {
        for (const item of tokenAccs.value.slice(0, 10)) {
          const parsedInfo = item.account?.data?.parsed?.info;
          if (parsedInfo) {
            const tokenAmount = parsedInfo.tokenAmount;
            const uiAmount = tokenAmount?.uiAmount || 0;
            if (uiAmount > 0) {
              const mint = parsedInfo.mint || "SPL Token";
              tokens.push({
                tokenAddress: mint,
                symbol: mint.slice(0, 4).toUpperCase(),
                name: `SPL Token (${mint.slice(0, 8)}...)`,
                decimals: tokenAmount.decimals || 6,
                rawBalance: tokenAmount.amount || "0",
                balanceFormatted: `${uiAmount.toLocaleString()} Units`,
                balanceNumber: uiAmount,
                usdValue: null,
              });
            }
          }
        }
      }
    } catch {
      // Optional SPL read
    }

    return {
      address,
      chain: "solana",
      isValid: true,
      isContract,
      status: "LIVE",
      dataSource: "RAW_RPC",
      provider: `Solana Native JSON-RPC (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative,
      balanceFormatted: `${balanceNative.toLocaleString(undefined, { maximumFractionDigits: 6 })} SOL`,
      ticker: "SOL",
      usdValue,
      inrValue,
      txCount: rawSigs.length,
      tokens,
      transactions,
      limitations: [
        "Signatures retrieved directly from Solana Mainnet-Beta validator cluster (no Solscan or third-party indexer used).",
      ],
    };
  } catch (err: any) {
    const isRate = err.message?.includes("RATE_LIMITED") || err.message?.includes("429");
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");

    return {
      address,
      chain: "solana",
      isValid: true,
      isContract: false,
      status: isRate ? "RATE_LIMITED" : isTimeout ? "TIMEOUT" : "UNAVAILABLE",
      dataSource: "RAW_RPC",
      provider: `Solana Native JSON-RPC (${config.rpcUrl})`,
      queriedAt: new Date().toISOString(),
      balanceNative: 0,
      balanceFormatted: "0.00 SOL",
      ticker: "SOL",
      usdValue: null,
      inrValue: null,
      txCount: 0,
      tokens: [],
      transactions: [],
      error: `Solana RPC error: ${err.message}`,
    };
  }
}
