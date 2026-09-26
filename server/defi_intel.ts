import type { Chain } from "../src/lib/types";

export interface KnownBridge {
  id: string;
  name: string;
  protocol: string;
  website: string;
  contracts: Record<string, string>; // chain -> router address
}

export interface KnownDex {
  id: string;
  name: string;
  protocol: string;
  chain: Chain;
  routerAddress: string;
}

export interface KnownMixer {
  id: string;
  name: string;
  chain: Chain;
  sanctioned: boolean;
  sanctionSource?: string;
  addresses: string[];
}

export const AUTHORITATIVE_BRIDGES: KnownBridge[] = [
  {
    id: "br-stargate",
    name: "Stargate Finance (LayerZero)",
    protocol: "Omnichain Router",
    website: "https://stargate.finance",
    contracts: {
      ethereum: "0x8731d54E9D02c286767d56ac03e8037C07e01e98".toLowerCase(),
      polygon: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd".toLowerCase(),
      arbitrum: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614".toLowerCase(),
      optimism: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b".toLowerCase(),
      avalanche: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd".toLowerCase(),
      bsc: "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8".toLowerCase(),
    },
  },
  {
    id: "br-hop",
    name: "Hop Protocol",
    protocol: "Hop Router",
    website: "https://hop.exchange",
    contracts: {
      ethereum: "0x3666f603Cc164936C1b87e207F36BEBa4AC5f18a".toLowerCase(),
      polygon: "0xb8901acB252883AE8162AB57472532452467022f".toLowerCase(),
      arbitrum: "0xb8901acB252883AE8162AB57472532452467022f".toLowerCase(),
      optimism: "0xb8901acB252883AE8162AB57472532452467022f".toLowerCase(),
    },
  },
  {
    id: "br-synapse",
    name: "Synapse Protocol",
    protocol: "Synapse Bridge",
    website: "https://synapseprotocol.com",
    contracts: {
      ethereum: "0x2796317b0fF85383955282e3ab94079250228534".toLowerCase(),
      bsc: "0xd123f70AE324d34a9E76b67a27bf77593bA17470".toLowerCase(),
      polygon: "0x8F5bbb2BB8c2Da94bf86433F18e2D2504a78864A".toLowerCase(),
      avalanche: "0xC05e61d0E7a63D27546389B7aD62FdFf5A91a95f".toLowerCase(),
    },
  },
  {
    id: "br-wormhole",
    name: "Portal Bridge (Wormhole)",
    protocol: "Wormhole Core",
    website: "https://portalbridge.com",
    contracts: {
      ethereum: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B".toLowerCase(),
      solana: "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth",
      polygon: "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE".toLowerCase(),
      bsc: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B".toLowerCase(),
    },
  },
];

export const AUTHORITATIVE_DEXES: KnownDex[] = [
  {
    id: "dex-uniswap-v2",
    name: "Uniswap V2 Router",
    protocol: "Uniswap",
    chain: "ethereum",
    routerAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D".toLowerCase(),
  },
  {
    id: "dex-uniswap-v3",
    name: "Uniswap V3 SwapRouter",
    protocol: "Uniswap",
    chain: "ethereum",
    routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564".toLowerCase(),
  },
  {
    id: "dex-uniswap-universal",
    name: "Uniswap Universal Router",
    protocol: "Uniswap",
    chain: "ethereum",
    routerAddress: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD".toLowerCase(),
  },
  {
    id: "dex-pancakeswap-v2",
    name: "PancakeSwap V2 Router",
    protocol: "PancakeSwap",
    chain: "bsc",
    routerAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E".toLowerCase(),
  },
  {
    id: "dex-pancakeswap-v3",
    name: "PancakeSwap V3 SwapRouter",
    protocol: "PancakeSwap",
    chain: "bsc",
    routerAddress: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4".toLowerCase(),
  },
  {
    id: "dex-quickswap",
    name: "QuickSwap Router",
    protocol: "QuickSwap",
    chain: "polygon",
    routerAddress: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff".toLowerCase(),
  },
  {
    id: "dex-sushiswap",
    name: "SushiSwap Router",
    protocol: "SushiSwap",
    chain: "ethereum",
    routerAddress: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F".toLowerCase(),
  },
  {
    id: "dex-curve",
    name: "Curve 3pool Router",
    protocol: "Curve",
    chain: "ethereum",
    routerAddress: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7".toLowerCase(),
  },
  {
    id: "dex-sunswap",
    name: "SunSwap V2 Router",
    protocol: "SunSwap",
    chain: "tron",
    routerAddress: "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax",
  },
  {
    id: "dex-raydium",
    name: "Raydium V4 Router",
    protocol: "Raydium",
    chain: "solana",
    routerAddress: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  },
];

export const AUTHORITATIVE_MIXERS: KnownMixer[] = [
  {
    id: "mx-tornado",
    name: "Tornado Cash (Sanctioned)",
    chain: "ethereum",
    sanctioned: true,
    sanctionSource: "OFAC SDN List (August 8, 2022)",
    addresses: [
      "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b".toLowerCase(),
      "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936".toLowerCase(),
      "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf".toLowerCase(),
      "0xa160cdab225685da1d56aa342ad8841c3b53f291".toLowerCase(),
    ],
  },
  {
    id: "mx-railgun",
    name: "Railgun Privacy System",
    chain: "ethereum",
    sanctioned: false,
    addresses: ["0xfa7093cdd9ee6932b4eb2c9e1cde7ce00b1fa4b9".toLowerCase()],
  },
];

export function detectBridgeInteraction(address: string, chain: Chain): { isBridge: boolean; bridgeName?: string } {
  const norm = address.toLowerCase();
  for (const b of AUTHORITATIVE_BRIDGES) {
    const contract = b.contracts[chain];
    if (contract && contract.toLowerCase() === norm) {
      return { isBridge: true, bridgeName: b.name };
    }
  }
  return { isBridge: false };
}

export function detectDexInteraction(address: string, chain: Chain): { isDex: boolean; dexName?: string } {
  const norm = address.toLowerCase();
  for (const d of AUTHORITATIVE_DEXES) {
    if (d.chain === chain && d.routerAddress.toLowerCase() === norm) {
      return { isDex: true, dexName: d.name };
    }
  }
  return { isDex: false };
}

export function detectMixerInteraction(address: string, chain: Chain): { isMixer: boolean; mixerName?: string; sanctioned?: boolean } {
  const norm = address.toLowerCase();
  for (const m of AUTHORITATIVE_MIXERS) {
    if (m.chain === chain && m.addresses.some((a) => a.toLowerCase() === norm)) {
      return { isMixer: true, mixerName: m.name, sanctioned: m.sanctioned };
    }
  }
  return { isMixer: false };
}
