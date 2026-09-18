import type { Chain } from "@/lib/types"

// Central, server-only configuration for live providers. URLs/credentials are
// read from environment variables and NEVER shipped to the client or
// embedded in code.
//
// DIRECT-NODE ARCHITECTURE for every chain — no third-party explorer or
// indexer is used in the LIVE investigation path:
//   - Every EVM chain (Ethereum, Polygon, BSC, Arbitrum, Optimism, Base,
//     Avalanche) talks to a JSON-RPC node directly (eth_getBalance,
//     eth_getTransactionByHash, eth_getLogs). A public, keyless RPC endpoint
//     is used by default; an operator-supplied *_RPC_URL overrides it with a
//     private/archive node.
//   - Bitcoin talks to a Bitcoin Core JSON-RPC node directly (getrawtransaction,
//     getblock, getblockchaininfo). Configured via BITCOIN_RPC_URL and optional
//     BITCOIN_RPC_USER / BITCOIN_RPC_PASSWORD credentials.
//   - Solana talks to the public, keyless mainnet-beta JSON-RPC (or an
//     operator override) — this IS the network's own native RPC.
//   - TRON talks to TronGrid's REST API, which is TRON's own official public
//     node infrastructure.
//
// A raw EVM/Bitcoin/Solana node can always answer single-item lookups, but it CANNOT
// answer "list every historical transaction for this address" without node-side
// indexing. Those adapters report that limitation honestly (UNSUPPORTED_WITH_CURRENT_RPC)
// rather than fabricating a transaction list or silently falling back to an explorer.

export const EVM_CHAIN_ID: Partial<Record<Chain, number>> = {
  ethereum: 1,
  polygon: 137,
  bsc: 56,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
}

export const NATIVE_ASSET: Record<Chain, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  polygon: "MATIC",
  bsc: "BNB",
  arbitrum: "ETH",
  optimism: "ETH",
  base: "ETH",
  avalanche: "AVAX",
  solana: "SOL",
  tron: "TRX",
}

// Primary (documented) env var names for each chain's RPC endpoint, plus the
// legacy TRACECHAIN_* names accepted as a fallback for backward compatibility.
const RPC_ENV_VARS: Partial<Record<Chain, { primary: string; legacy: string }>> = {
  ethereum: { primary: "ETHEREUM_RPC_URL", legacy: "TRACECHAIN_ETH_API_URL" },
  polygon: { primary: "POLYGON_RPC_URL", legacy: "TRACECHAIN_POLYGON_API_URL" },
  bsc: { primary: "BSC_RPC_URL", legacy: "TRACECHAIN_BSC_API_URL" },
  arbitrum: { primary: "ARBITRUM_RPC_URL", legacy: "TRACECHAIN_ARBITRUM_API_URL" },
  optimism: { primary: "OPTIMISM_RPC_URL", legacy: "TRACECHAIN_OPTIMISM_API_URL" },
  base: { primary: "BASE_RPC_URL", legacy: "TRACECHAIN_BASE_API_URL" },
  avalanche: { primary: "AVALANCHE_RPC_URL", legacy: "TRACECHAIN_AVALANCHE_API_URL" },
  bitcoin: { primary: "BITCOIN_RPC_URL", legacy: "TRACECHAIN_BTC_API_URL" },
  solana: { primary: "SOLANA_RPC_URL", legacy: "TRACECHAIN_SOLANA_RPC_URL" },
  tron: { primary: "TRON_RPC_URL", legacy: "TRACECHAIN_TRON_API_URL" },
}

// Env var names surfaced (names only, never values) on the Integrations page.
export const ENV_VARS: Record<Chain, { url: string; key: string }> = {
  ethereum: { url: "ETHEREUM_RPC_URL", key: "" },
  polygon: { url: "POLYGON_RPC_URL", key: "" },
  bsc: { url: "BSC_RPC_URL", key: "" },
  arbitrum: { url: "ARBITRUM_RPC_URL", key: "" },
  optimism: { url: "OPTIMISM_RPC_URL", key: "" },
  base: { url: "BASE_RPC_URL", key: "" },
  avalanche: { url: "AVALANCHE_RPC_URL", key: "" },
  bitcoin: { url: "BITCOIN_RPC_URL", key: "BITCOIN_RPC_PASSWORD" },
  solana: { url: "SOLANA_RPC_URL", key: "" },
  tron: { url: "TRON_RPC_URL", key: "TRACECHAIN_TRON_API_KEY" },
}

const TRONGRID_BASE = "https://api.trongrid.io"
const SOLANA_PUBLIC_RPC = "https://api.mainnet-beta.solana.com"

// Public, keyless JSON-RPC endpoints used for direct-node reads on every EVM
// chain. Overridable per chain via *_RPC_URL for a private/archive node.
const PUBLIC_RPC: Partial<Record<Chain, string>> = {
  ethereum: "https://ethereum-rpc.publicnode.com",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  arbitrum: "https://arbitrum-one-rpc.publicnode.com",
  optimism: "https://optimism-rpc.publicnode.com",
  base: "https://base-rpc.publicnode.com",
  avalanche: "https://avalanche-c-chain-rpc.publicnode.com",
}

export type IndexerFlavor = never

export interface ChainConfig {
  chain: Chain
  // Resolved base URL for this chain's live adapter (RPC node / native API).
  baseUrl: string
  // Server-side credential (optional TRON key or Bitcoin RPC password).
  apiKey: string
  // For EVM: the numeric chain id, used for basic sanity checks.
  chainId?: number
  // Whether a live read is possible for this chain right now.
  configured: boolean
  // "rpc" -> direct JSON-RPC node, "native-api" -> official network API
  // (Solana/TRON), "none" -> no live source configured.
  kind: "rpc" | "native-api" | "none"
  // Public, keyless JSON-RPC endpoint (EVM chains only).
  rpcUrl?: string
  // Whether this chain's dedicated override env var(s) are set — used only
  // for the Integrations page's "is this specific variable set" display.
  envUrlSet: boolean
  envKeySet: boolean
}

function env(name: string): string {
  return (process.env[name] ?? "").trim()
}

function resolveRpcUrl(chain: Chain): { url: string; envSet: boolean } {
  const names = RPC_ENV_VARS[chain]
  if (!names) return { url: "", envSet: false }
  const primary = env(names.primary)
  if (primary) return { url: primary, envSet: true }
  const legacy = env(names.legacy)
  if (legacy) return { url: legacy, envSet: true }
  return { url: "", envSet: false }
}

export function getChainConfig(chain: Chain): ChainConfig {
  if (chain === "bitcoin") {
    const { url: overrideUrl, envSet } = resolveRpcUrl(chain)
    const password = env("BITCOIN_RPC_PASSWORD")
    const configured = Boolean(overrideUrl)
    return {
      chain,
      baseUrl: overrideUrl,
      apiKey: password,
      configured,
      kind: configured ? "rpc" : "none",
      rpcUrl: overrideUrl,
      envUrlSet: envSet,
      envKeySet: Boolean(password),
    }
  }

  const chainId = EVM_CHAIN_ID[chain]
  if (chainId) {
    const { url: overrideUrl, envSet } = resolveRpcUrl(chain)
    const rpcUrl = overrideUrl || PUBLIC_RPC[chain]
    return {
      chain,
      baseUrl: rpcUrl ?? "",
      apiKey: "",
      chainId,
      configured: Boolean(rpcUrl),
      kind: rpcUrl ? "rpc" : "none",
      rpcUrl,
      envUrlSet: envSet,
      envKeySet: false,
    }
  }

  if (chain === "solana") {
    const { url: overrideUrl, envSet } = resolveRpcUrl(chain)
    return {
      chain,
      baseUrl: overrideUrl || SOLANA_PUBLIC_RPC,
      apiKey: "",
      configured: true,
      kind: "native-api",
      envUrlSet: envSet,
      envKeySet: false,
    }
  }

  if (chain === "tron") {
    // TronGrid's public REST API is TRON's own official node infrastructure
    // and is free and keyless (rate-limited but functional). A dedicated key
    // is an optional upgrade for a higher rate limit, never a requirement to
    // go live.
    const { url: overrideUrl, envSet } = resolveRpcUrl(chain)
    const legacyKey = env("TRACECHAIN_TRON_API_KEY")
    return {
      chain,
      baseUrl: overrideUrl || TRONGRID_BASE,
      apiKey: legacyKey,
      configured: true,
      kind: "native-api",
      envUrlSet: envSet,
      envKeySet: Boolean(legacyKey),
    }
  }

  return {
    chain,
    baseUrl: "",
    apiKey: "",
    configured: false,
    kind: "none",
    envUrlSet: false,
    envKeySet: false,
  }
}

export function isLiveCapable(chain: Chain): boolean {
  return getChainConfig(chain).configured
}
