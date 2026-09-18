import type { Chain } from "../src/lib/types";

export interface CryptoPrice {
  usd: number;
  inr: number;
  usd24hChange?: number;
}

let priceCache: Record<string, { price: CryptoPrice; fetchedAt: number }> = {};
const CACHE_TTL_MS = 60_000; // 1 minute

const COINGECKO_MAP: Record<Chain, string> = {
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  polygon: "matic-network",
  bsc: "binancecoin",
  arbitrum: "ethereum",
  optimism: "ethereum",
  base: "ethereum",
  avalanche: "avalanche-2",
  solana: "solana",
  tron: "tron",
};

export async function getLivePrice(chain: Chain): Promise<CryptoPrice | null> {
  const coinId = COINGECKO_MAP[chain];
  if (!coinId) return null;

  const now = Date.now();
  const cached = priceCache[coinId];
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,inr&include_24hr_change=true`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      }
    );

    if (!res.ok) {
      return cached ? cached.price : null;
    }

    const data = await res.json();
    const item = data[coinId];
    if (item && typeof item.usd === "number") {
      const price: CryptoPrice = {
        usd: item.usd,
        inr: item.inr || item.usd * 86.5,
        usd24hChange: typeof item.usd_24h_change === "number" ? item.usd_24h_change : undefined,
      };
      priceCache[coinId] = { price, fetchedAt: now };
      return price;
    }
  } catch {
    // If rate limited or down, return cached if exists, else null (never invent)
    if (cached) return cached.price;
  }

  return null;
}

export async function getAllLivePrices(): Promise<Record<string, CryptoPrice | null>> {
  const ids = Array.from(new Set(Object.values(COINGECKO_MAP))).join(",");
  const now = Date.now();

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,inr&include_24hr_change=true`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const results: Record<string, CryptoPrice | null> = {};
      for (const [chain, coinId] of Object.entries(COINGECKO_MAP)) {
        const item = data[coinId];
        if (item && typeof item.usd === "number") {
          const price: CryptoPrice = {
            usd: item.usd,
            inr: item.inr || item.usd * 86.5,
            usd24hChange: typeof item.usd_24h_change === "number" ? item.usd_24h_change : undefined,
          };
          priceCache[coinId] = { price, fetchedAt: now };
          results[chain] = price;
        } else {
          results[chain] = priceCache[coinId]?.price || null;
        }
      }
      return results;
    }
  } catch {
    // Fall back to cached if present
  }

  const results: Record<string, CryptoPrice | null> = {};
  for (const [chain, coinId] of Object.entries(COINGECKO_MAP)) {
    results[chain] = priceCache[coinId]?.price || null;
  }
  return results;
}
