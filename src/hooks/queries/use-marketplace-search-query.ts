import { useQuery } from "@tanstack/react-query";
import { gameApiService } from "@/lib/api/game-api.service";
import { CollectionRepository } from "@/lib/blockchain/domain/repositories/collection.repository";
import { isSolanaAddress } from "@/lib/utils/solana-validation";
import type { CreateGameResponse, GameFilterParams } from "@/lib/api/types";
import { isSome } from "@metaplex-foundation/umi";

export type UseMarketplaceSearchQueryOptions = {
  query: string;
  filters?: GameFilterParams;
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
  filters,
  enabled = true,
}: UseMarketplaceSearchQueryOptions) {
  const trimmedQuery = query?.trim() || "";
  const isAddress = isSolanaAddress(trimmedQuery);

  return useQuery({
    queryKey: ["marketplace-search", trimmedQuery, isAddress, filters],
    queryFn: async (): Promise<CreateGameResponse[]> => {
      // If no query and no filters, return empty
      if (!trimmedQuery && !filters) {
        return [];
      }

      // Strategy 1: Candy Machine Address Search (only if query is an address)
      if (isAddress && trimmedQuery) {
        try {
          // Query blockchain for fresh collection data
          const collectionRepo = new CollectionRepository();
          const { metadata, collection, candyMachine, guard } =
            await collectionRepo.findByCandyMachineAddress(trimmedQuery);

          const solPaymentGuard = isSome(guard.guards.solPayment)
            ? Number(guard.guards.solPayment.value.lamports.basisPoints)
            : 0;

          return [
            {
              candy_machine_address: trimmedQuery,
              name: metadata.name,
              description: metadata.description,
              price_lamports: solPaymentGuard,
              image_url: metadata.image,
              collection_address: collection.publicKey.toString(),
              metadata_uri: collection.uri,
              created_at: new Date().toISOString(), // Creation date unknown from blockchain query
              categories: metadata.categories,
              executables: metadata.executables,
              creator: candyMachine.authority.toString(),
            },
          ];
        } catch (error) {
          // If blockchain query fails, try backend search as fallback
          const games = await gameApiService.searchGames(trimmedQuery, filters);
          return games;
        }
      }

      // Strategy 2: Game Name Search
      const games = await gameApiService.searchGames(trimmedQuery, filters);
      return games;
    },
    enabled: enabled && (trimmedQuery.length > 0 || !!filters),
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter than all games query since search results may change
    gcTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnMount: true, // Always fetch fresh search results on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch after network reconnection
  });
}
