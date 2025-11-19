import { useQuery } from "@tanstack/react-query";
import { gameApiService } from "@/lib/api/game-api.service";
import type { CreateGameResponse } from "@/lib/api/types";

/**
 * Query hook for fetching all marketplace games
 * Fetches games from the backend API with smart refetch strategy
 */
export function useAllMarketplaceGamesQuery() {
  return useQuery({
    queryKey: ["marketplace-games", "all"],
    queryFn: async (): Promise<CreateGameResponse[]> => {
      console.debug("[useAllMarketplaceGamesQuery] Fetching all marketplace games");

      const games = await gameApiService.getAllGames();

      console.debug("[useAllMarketplaceGamesQuery] Games fetched:", games.length);

      return games;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchOnMount: true, // Always fetch fresh data on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch after network reconnection
  });
}
