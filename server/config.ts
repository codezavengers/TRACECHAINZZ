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
  bitcoin: "", // Direct Bitcoin Core JSON-RPC (configured via BITCOIN_RPC_URL)
  solana: "https://api.mainnet-beta.solana.com",
  tron: "https://api.trongrid.io/jsonrpc",
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

export const FORBIDDEN_EXPLORER_DOMAINS = [
  "mempool.space",
  "blockstream.info",
  "blockchain.info",
  "blockchair.com",
  "etherscan.io",
  "bscscan.com",
  "polygonscan.com",
  "arbiscan.io",
  "optimistic.etherscan.io",
  "basescan.org",
  "snowtrace.io",
  "tronscan.org",
  "solscan.io",
];

export interface ChainStartupStatus {
  chain: Chain;
  name: string;
  configured: boolean;
  sourceDomain: string;
  capabilities: string;
  status: "LIVE_CONFIGURED" | "CONFIGURATION_REQUIRED" | "FORBIDDEN_DOMAIN";
  rpcUrlMasked: string;
}

export interface StartupConfigReport {
  timestamp: string;
  totalChains: number;
  configuredCount: number;
  overallStatus: "OPTIMAL" | "PARTIAL" | "MINIMAL";
  chains: Record<Chain, ChainStartupStatus>;
}

let cachedStartupReport: StartupConfigReport | null = null;

export function validateStartupConfig(): StartupConfigReport {
  const allChains: Chain[] = [
    "ethereum",
    "polygon",
    "bsc",
    "arbitrum",
    "optimism",
    "base",
    "avalanche",
    "bitcoin",
    "solana",
    "tron",
  ];

  const reportChains: Record<Chain, ChainStartupStatus> = {} as any;
  let configuredCount = 0;

  for (const c of allChains) {
    const config = getChainConfig(c);
    const rawUrl = config.rpcUrl;

    // Check for forbidden explorer domains
    const isForbidden = FORBIDDEN_EXPLORER_DOMAINS.some((domain) =>
      rawUrl.toLowerCase().includes(domain)
    );

    if (isForbidden) {
      process.stderr.write(
        `\n[FATAL CONFIGURATION ERROR] Chain ${c.toUpperCase()} RPC URL points to forbidden explorer domain: ${rawUrl}. Direct-node architecture requires standard JSON-RPC endpoints, not block explorers.\n\n`
      );
    }

    let sourceDomain = "none";
    let rpcUrlMasked = "Not configured";

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        sourceDomain = parsed.hostname;
        rpcUrlMasked = `${parsed.protocol}//${parsed.hostname}${parsed.pathname ? parsed.pathname.slice(0, 15) : ""}`;
      } catch {
        sourceDomain = "raw-endpoint";
        rpcUrlMasked = rawUrl.slice(0, 30);
      }
    }

    let capabilities = "nativeBalance, tokenTransfers, historicalLogs";
    if (c === "bitcoin") {
      capabilities = "utxo, nativeBalance (with txindex/scantxoutset)";
    } else if (c === "solana") {
      capabilities = "nativeBalance, splTokens, signatureHistory";
    } else if (c === "tron") {
      capabilities = "nativeBalance, trc20, contractEvents";
    }

    let status: ChainStartupStatus["status"] = "LIVE_CONFIGURED";
    if (isForbidden) {
      status = "FORBIDDEN_DOMAIN";
    } else if (!rawUrl || (c === "bitcoin" && (!config.user || !config.password))) {
      status = "CONFIGURATION_REQUIRED";
    } else {
      configuredCount++;
    }

    reportChains[c] = {
      chain: c,
      name: config.name,
      configured: status === "LIVE_CONFIGURED",
      sourceDomain,
      capabilities,
      status,
      rpcUrlMasked,
    };
  }

  // Print formatted per-chain table to stderr
  const pad = (str: string, len: number) => str.padEnd(len).slice(0, len);
  const border = `+${"-".repeat(14)}+${"-".repeat(15)}+${"-".repeat(34)}+${"-".repeat(46)}+${"-".repeat(26)}+`;
  const header = `| ${pad("Chain", 12)} | ${pad("Configured?", 13)} | ${pad("Source Domain", 32)} | ${pad("Capabilities", 44)} | ${pad("Status", 24)} |`;

  const lines = [
    "",
    "=================================================================================================================================",
    "                                      TRACECHAIN FORENSIC NODE STARTUP CONFIGURATION VALIDATOR                                  ",
    "=================================================================================================================================",
    border,
    header,
    border,
  ];

  for (const c of allChains) {
    const item = reportChains[c];
    lines.push(
      `| ${pad(item.name, 12)} | ${pad(item.configured ? "YES" : "NO", 13)} | ${pad(item.sourceDomain, 32)} | ${pad(item.capabilities, 44)} | ${pad(item.status, 24)} |`
    );
  }

  lines.push(border);
  lines.push(
    `Total Chains: ${allChains.length} | Configured & Authenticated: ${configuredCount}/${allChains.length} | Native Direct-Node Mandate: ENFORCED`
  );
  lines.push(
    "=================================================================================================================================\n"
  );

  process.stderr.write(lines.join("\n"));

  const overallStatus: StartupConfigReport["overallStatus"] =
    configuredCount >= 9 ? "OPTIMAL" : configuredCount >= 5 ? "PARTIAL" : "MINIMAL";

  cachedStartupReport = {
    timestamp: new Date().toISOString(),
    totalChains: allChains.length,
    configuredCount,
    overallStatus,
    chains: reportChains,
  };

  return cachedStartupReport;
}

export function getStartupConfigHealth(): StartupConfigReport {
  if (!cachedStartupReport) {
    return validateStartupConfig();
  }
  return cachedStartupReport;
}

export function getChainConfig(chain: Chain): ChainConfig {
  const env = process.env;

  // Function to reject block explorer URLs that are not direct JSON-RPC nodes
  const sanitizeRpcUrl = (url?: string): string => {
    if (!url) return "";
    const clean = url.trim();
    const isExplorer = FORBIDDEN_EXPLORER_DOMAINS.some((domain) => clean.includes(domain));
    if (isExplorer) {
      process.stderr.write(
        `[CONFIG WARN] Rejected forbidden explorer URL: ${clean}. Explorer URLs cannot serve as authoritative node endpoints.\n`
      );
      return "";
    }
    return clean;
  };

  switch (chain) {
    case "bitcoin": {
      const rawUrl = sanitizeRpcUrl(env.BITCOIN_RPC_URL);
      return {
        chain,
        name: CHAIN_NAMES.bitcoin,
        ticker: "BTC",
        rpcUrl: rawUrl,
        user: env.BITCOIN_RPC_USER?.trim(),
        password: env.BITCOIN_RPC_PASSWORD?.trim(),
        isCustomRpc: Boolean(rawUrl),
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
      let url = (env.TRON_RPC_URL || "").trim();
      if (url && url.endsWith("trongrid.io")) {
        url = `${url}/jsonrpc`;
      }
      const apiKey = env.TRACECHAIN_TRON_API_KEY?.trim();
      return {
        chain,
        name: CHAIN_NAMES.tron,
        ticker: "TRX",
        rpcUrl: url || DEFAULT_RPC.tron,
        apiKey: apiKey || undefined,
        isCustomRpc: Boolean(url),
      };
    }

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
