import type { Chain } from "../src/lib/types";

export interface ChainConfig {
  chain: Chain;
  name: string;
  ticker: string;
  rpcUrl: string;
  user?: string;
  password?: string;
  apiKey?: string;
  isCustomRpc: boolean;
  chainId?: number;
}

// Fallback direct JSON-RPC nodes (keyless public nodes)
const DEFAULT_RPC: Record<Chain, string> = {
  ethereum: "https://ethereum-rpc.publicnode.com",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  bsc: "https://bsc-dataseed.binance.org",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  base: "https://mainnet.base.org",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  bitcoin: "", // Must be operator configured via BITCOIN_RPC_URL
  solana: "https://api.mainnet-beta.solana.com",
  tron: "https://api.trongrid.io",
};

export const EVM_CHAIN_IDS: Partial<Record<Chain, number>> = {
  ethereum: 1,
  polygon: 137,
  bsc: 56,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
};

export const CHAIN_TICKERS: Record<Chain, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  polygon: "POL",
  bsc: "BNB",
  arbitrum: "ETH",
  optimism: "ETH",
  base: "ETH",
  avalanche: "AVAX",
  solana: "SOL",
  tron: "TRX",
};

export const CHAIN_NAMES: Record<Chain, string> = {
  bitcoin: "Bitcoin Mainnet",
  ethereum: "Ethereum Mainnet",
  polygon: "Polygon PoS",
  bsc: "BNB Smart Chain",
  arbitrum: "Arbitrum One Nitro",
  optimism: "OP Mainnet",
  base: "Base Mainnet",
  avalanche: "Avalanche C-Chain",
  solana: "Solana Mainnet-Beta",
  tron: "TRON Mainnet",
};

export function getChainConfig(chain: Chain): ChainConfig {
  const env = process.env;

  switch (chain) {
    case "bitcoin": {
      const url = (env.BITCOIN_RPC_URL || env.TRACECHAIN_BTC_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.bitcoin,
        ticker: "BTC",
        rpcUrl: url,
        user: env.BITCOIN_RPC_USER?.trim(),
        password: env.BITCOIN_RPC_PASSWORD?.trim(),
        isCustomRpc: Boolean(url),
      };
    }

    case "ethereum": {
      const url = (env.ETHEREUM_RPC_URL || env.TRACECHAIN_ETH_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.ethereum,
        ticker: "ETH",
        rpcUrl: url || DEFAULT_RPC.ethereum,
        isCustomRpc: Boolean(url),
        chainId: 1,
      };
    }

    case "polygon": {
      const url = (env.POLYGON_RPC_URL || env.TRACECHAIN_POLYGON_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.polygon,
        ticker: "POL",
        rpcUrl: url || DEFAULT_RPC.polygon,
        isCustomRpc: Boolean(url),
        chainId: 137,
      };
    }

    case "bsc": {
      const url = (env.BSC_RPC_URL || env.TRACECHAIN_BSC_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.bsc,
        ticker: "BNB",
        rpcUrl: url || DEFAULT_RPC.bsc,
        isCustomRpc: Boolean(url),
        chainId: 56,
      };
    }

    case "arbitrum": {
      const url = (env.ARBITRUM_RPC_URL || env.TRACECHAIN_ARBITRUM_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.arbitrum,
        ticker: "ETH",
        rpcUrl: url || DEFAULT_RPC.arbitrum,
        isCustomRpc: Boolean(url),
        chainId: 42161,
      };
    }

    case "optimism": {
      const url = (env.OPTIMISM_RPC_URL || env.TRACECHAIN_OPTIMISM_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.optimism,
        ticker: "ETH",
        rpcUrl: url || DEFAULT_RPC.optimism,
        isCustomRpc: Boolean(url),
        chainId: 10,
      };
    }

    case "base": {
      const url = (env.BASE_RPC_URL || env.TRACECHAIN_BASE_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.base,
        ticker: "ETH",
        rpcUrl: url || DEFAULT_RPC.base,
        isCustomRpc: Boolean(url),
        chainId: 8453,
      };
    }

    case "avalanche": {
      const url = (env.AVALANCHE_RPC_URL || env.TRACECHAIN_AVALANCHE_API_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.avalanche,
        ticker: "AVAX",
        rpcUrl: url || DEFAULT_RPC.avalanche,
        isCustomRpc: Boolean(url),
        chainId: 43114,
      };
    }

    case "solana": {
      const url = (env.SOLANA_RPC_URL || env.TRACECHAIN_SOLANA_RPC_URL || "").trim();
      return {
        chain,
        name: CHAIN_NAMES.solana,
        ticker: "SOL",
        rpcUrl: url || DEFAULT_RPC.solana,
        isCustomRpc: Boolean(url),
      };
    }

    case "tron": {
      const url = (env.TRON_RPC_URL || env.TRACECHAIN_TRON_API_URL || "").trim();
      const apiKey = env.TRACECHAIN_TRON_API_KEY?.trim();
      return {
        chain,
        name: CHAIN_NAMES.tron,
        ticker: "TRX",
        rpcUrl: url || DEFAULT_RPC.tron,
        apiKey,
        isCustomRpc: Boolean(url),
      };
    }

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
