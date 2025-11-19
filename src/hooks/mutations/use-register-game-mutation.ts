import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gameApiService } from "@/lib/api/game-api.service";
import type { CreateGameRequest, CreateGameResponse } from "@/lib/api/types";

/**
 * Mutation hook for registering a game in the marketplace
 * Invalidates all marketplace-related queries on success
 */
export function useRegisterGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      game: CreateGameRequest
    ): Promise<CreateGameResponse> => {
      console.debug("[useRegisterGameMutation] Registering game:", game.name);

      const result = await gameApiService.createGame(game);

      console.debug(
        "[useRegisterGameMutation] Game registered successfully:",
        result.collection_address
      );

      return result;
    },
    onSuccess: () => {
      // Invalidate all marketplace-related queries to show the newly registered game
      // Using partial key matching to catch all marketplace queries
      queryClient.invalidateQueries({ queryKey: ["marketplace-games"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-search"] });

      console.debug(
        "[useRegisterGameMutation] All marketplace queries invalidated after registration"
      );
    },
    onError: (error) => {
      console.error("[useRegisterGameMutation] Registration failed:", error);
    },
  });
}
