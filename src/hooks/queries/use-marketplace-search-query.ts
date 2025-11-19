import { useQuery } from "@tanstack/react-query";
import { gameApiService } from "@/lib/api/game-api.service";
import { CollectionRepository } from "@/lib/blockchain/domain/repositories/collection.repository";
import { isSolanaAddress } from "@/lib/utils/solana-validation";
import type { CreateGameResponse } from "@/lib/api/types";
import { isOption, isSome, some } from "@metaplex-foundation/umi";

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

      // Strategy 1: Candy Machine Address Search
      if (isAddress) {
        try {
          // Query blockchain for fresh collection data
          const collectionRepo = new CollectionRepository();
          const { metadata, collection, candyMachine, guard } =
            await collectionRepo.findByCandyMachineAddress(trimmedQuery);

          console.debug(
            "[useMarketplaceSearchQuery] Collection found on blockchain:",
            collection.name
          );

          const solPaymentGuard = isSome(guard.guards.solPayment)
            ? Number(guard.guards.solPayment.value.lamports.basisPoints)
            : 0;

          console.log(
            "[useMarketplaceSearchQuery] Sol payment guard:",
            solPaymentGuard
          );
          console.log(
            "[useMarketplaceSearchQuery] Sol payment guard:",
            isOption(guard.guards.solFixedFee)
          );
          console.log(
            "[useMarketplaceSearchQuery] Sol payment guard:",
            isSome(guard.guards.solFixedFee)
          );
          console.log(
            "[useMarketplaceSearchQuery] Sol payment guard:",
            guard.guards
          );

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
              executable_url: metadata.executable,
              creator: candyMachine.authority.toString(),
            },
          ];
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

      console.debug("[useMarketplaceSearchQuery] Games found:", games.length);

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
