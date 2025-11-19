import { useQuery } from "@tanstack/react-query";
import { GameMarketplaceService, MarketplaceGame } from "@/lib/marketplace/game-marketplace.service";

export type UseMarketplaceGameQueryOptions = {
  candyMachineAddress?: string;
};

/**
 * Query hook for fetching game information from marketplace
 * 10min stale time for marketplace game caching
 */
export function useMarketplaceGameQuery({ candyMachineAddress }: UseMarketplaceGameQueryOptions) {
  return useQuery({
    queryKey: ["marketplace-game", candyMachineAddress],
    queryFn: async (): Promise<MarketplaceGame | null> => {
      if (!candyMachineAddress) {
        throw new Error("Candy machine address is required");
      }

      console.debug("[useMarketplaceGameQuery] Fetching game for:", candyMachineAddress);

      const marketplaceService = new GameMarketplaceService();
      const game = await marketplaceService.getGameByAddress(candyMachineAddress);

      console.debug("[useMarketplaceGameQuery] Game fetched:", game?.metadata.name || "not found");

      return game;
    },
    enabled: !!candyMachineAddress && candyMachineAddress.trim().length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes cache
    retry: 1, // Only retry once for marketplace queries
  });
}
