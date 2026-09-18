import { useState, useEffect, useCallback } from "react";
import type { Chain } from "./types";
import {
  fetchLiveAllChainProviders,
  fetchLiveMarketPrices,
  probeLiveAddress,
  type LiveProviderTelemetry,
  type LiveMarketPrices,
  type LiveAddressProbeResult,
} from "./multichain-live";

export function useMultiChain() {
  const [providers, setProviders] = useState<Record<Chain, LiveProviderTelemetry> | null>(null);
  const [prices, setPrices] = useState<LiveMarketPrices | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const [provs, marketPrices] = await Promise.all([
        fetchLiveAllChainProviders(),
        fetchLiveMarketPrices(),
      ]);
      setProviders(provs);
      setPrices(marketPrices);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch multi-chain telemetry");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const probeAddress = useCallback(
    async (rawAddress: string, chainHint?: Chain, caseId?: string): Promise<LiveAddressProbeResult> => {
      setIsProbing(true);
      try {
        return await probeLiveAddress(rawAddress, chainHint, caseId);
      } finally {
        setIsProbing(false);
      }
    },
    []
  );

  useEffect(() => {
    refreshProviders();
    const timer = setInterval(refreshProviders, 35000);
    return () => clearInterval(timer);
  }, [refreshProviders]);

  return {
    providers,
    prices,
    isLoading,
    isProbing,
    error,
    refreshProviders,
    probeAddress,
  };
}
