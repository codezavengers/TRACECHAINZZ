import { useState, useEffect, useCallback } from "react";
import { fetchLiveBitcoinNetwork, type LiveBitcoinNetworkData } from "./bitcoin-live";

export function useLiveBitcoin() {
  const [data, setData] = useState<LiveBitcoinNetworkData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const btc = await fetchLiveBitcoinNetwork(true);
      setData(btc);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch Bitcoin network data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
