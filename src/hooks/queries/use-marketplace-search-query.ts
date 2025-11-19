import { useQuery } from "@tanstack/react-query";
import { gameApiService } from "@/lib/api/game-api.service";
import { CollectionRepository } from "@/lib/blockchain/domain/repositories/collection.repository";
import { isSolanaAddress } from "@/lib/utils/solana-validation";
import type { CreateGameResponse } from "@/lib/api/types";

export type UseMarketplaceSearchQueryOptions = {
  query: string;
  enabled?: boolean;
};

/**
 * Query hook for searching marketplace games
 *
 * Search strategies:
 * - If query is a Solana address (collection address):
 *   1. Queries blockchain for fresh collection data
 *   2. Queries backend for games with matching collection_address
 *   3. Returns combined results with blockchain data taking precedence
 *
 * - If query is a game name:
 *   1. Queries backend API using searchGames endpoint
 *   2. Returns matching games by name
 */
export function useMarketplaceSearchQuery({
  query,
  enabled = true,
}: UseMarketplaceSearchQueryOptions) {
  const trimmedQuery = query?.trim() || "";
  const isAddress = isSolanaAddress(trimmedQuery);

  return useQuery({
    queryKey: ["marketplace-search", trimmedQuery, isAddress],
    queryFn: async (): Promise<CreateGameResponse[]> => {
      if (!trimmedQuery) {
        return [];
      }

      console.debug(
        "[useMarketplaceSearchQuery] Searching for:",
        trimmedQuery,
        "isAddress:",
        isAddress
      );

      // Strategy 1: Collection Address Search
      if (isAddress) {
        try {
          // Query blockchain for fresh collection data
          const collectionRepo = new CollectionRepository();
          const collection = await collectionRepo.findByPublicKey(trimmedQuery);

          console.debug(
            "[useMarketplaceSearchQuery] Collection found on blockchain:",
            collection.name
          );

          // Query backend for games with this collection address
          // The backend search might not support collection_address directly,
          // so we get all games and filter client-side
          const allGames = await gameApiService.getAllGames();
          const gamesWithCollection = allGames.filter(
            (game) =>
              game.collection_address.toLowerCase() ===
              trimmedQuery.toLowerCase()
          );

          console.debug(
            "[useMarketplaceSearchQuery] Games found with collection:",
            gamesWithCollection.length
          );

          // Enrich backend data with fresh blockchain metadata if needed
          // For now, return backend data as it has all necessary fields
          return gamesWithCollection;
        } catch (error) {
          console.error(
            "[useMarketplaceSearchQuery] Error fetching collection:",
            error
          );
          // If blockchain query fails, try backend search as fallback
          const games = await gameApiService.searchGames(trimmedQuery);
          return games;
        }
      }

      // Strategy 2: Game Name Search
      console.debug(
        "[useMarketplaceSearchQuery] Searching by name:",
        trimmedQuery
      );
      const games = await gameApiService.searchGames(trimmedQuery);

      console.debug(
        "[useMarketplaceSearchQuery] Games found:",
        games.length
      );

      return games;
    },
    enabled: enabled && trimmedQuery.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter than all games query since search results may change
    gcTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnMount: true, // Always fetch fresh search results on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch after network reconnection
  });
}
