import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GameMarketplaceService, PurchaseResult } from "@/lib/marketplace/game-marketplace.service";
import { Wallet } from "@/lib/blockchain/wallet";

export type PurchaseGameVariables = {
  candyMachineAddress: string;
  wallet: Wallet;
};

/**
 * Mutation hook for purchasing a game
 * Invalidates library games and balance queries on success
 */
export function usePurchaseGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candyMachineAddress, wallet }: PurchaseGameVariables): Promise<PurchaseResult> => {
      console.debug("[usePurchaseGameMutation] Purchasing game from:", candyMachineAddress);

      const marketplaceService = new GameMarketplaceService();
      const result = await marketplaceService.purchaseGame(candyMachineAddress, wallet);

      console.debug("[usePurchaseGameMutation] Purchase successful:", result.assetPublicKey);

      return result;
    },
    onSuccess: (_data, variables) => {
      // Invalidate library games to show the newly purchased game
      // refetchType: 'active' ensures immediate refetch if the query is currently active
      queryClient.invalidateQueries({
        queryKey: ["library-games", variables.wallet.address],
        refetchType: 'active'
      });

      // Invalidate balance to reflect the purchase cost
      queryClient.invalidateQueries({
        queryKey: ["balance", variables.wallet.address],
        refetchType: 'active'
      });

      console.debug("[usePurchaseGameMutation] Queries invalidated after purchase");
    },
    onError: (error) => {
      console.error("[usePurchaseGameMutation] Purchase failed:", error);
    },
  });
}
