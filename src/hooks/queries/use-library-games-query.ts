import { useQuery } from "@tanstack/react-query";
import { GameLibraryService, LibraryGame } from "@/lib/marketplace/game-library.service";

export type UseLibraryGamesQueryOptions = {
  walletAddress?: string;
};

/**
 * Query hook for fetching user's library games
 * Automatically refetches on mount and window focus for fresh data
 */
export function useLibraryGamesQuery({ walletAddress }: UseLibraryGamesQueryOptions) {
  return useQuery({
    queryKey: ["library-games", walletAddress],
    queryFn: async (): Promise<LibraryGame[]> => {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      console.debug("[useLibraryGamesQuery] Fetching library games for:", walletAddress);

      const libraryService = new GameLibraryService();
      const games = await libraryService.getLibraryGames(walletAddress);

      console.debug("[useLibraryGamesQuery] Games fetched:", games.length);

      return games;
    },
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to the app
  });
}
