import { useQuery } from "@tanstack/react-query";
import { connectionManager } from "@/lib/blockchain/connection";
import { PublicKey } from "@solana/web3.js";

export type UseBalanceQueryOptions = {
  walletAddress?: string;
};

/**
 * Query hook for fetching wallet balance
 * Automatically refetches on window focus
 * 30s stale time for balance caching
 */
export function useBalanceQuery({ walletAddress }: UseBalanceQueryOptions) {
  return useQuery({
    queryKey: ["balance", walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      console.debug("[useBalanceQuery] Fetching balance for:", walletAddress);

      const balance = await connectionManager.getConnection().getBalance(new PublicKey(walletAddress));

      console.debug("[useBalanceQuery] Balance fetched:", balance);

      return balance;
    },
    enabled: !!walletAddress,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: true,
  });
}
