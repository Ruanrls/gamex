import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipfs } from "@/lib/file-storage/ipfs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { remove } from "@tauri-apps/plugin-fs";

export type UninstallGameVariables = {
  candyMachineAddress: string;
  executableUrl: string;
  walletAddress: string;
};

const extractCidFromUrl = (input: string): string => {
  const patterns = [
    /ipfs\/([a-zA-Z0-9]+)/,
    /^(Qm[a-zA-Z0-9]{44}|bafybei[a-z2-7]{52}|bafy[a-z2-7]+)$/,
    /([a-zA-Z0-9]+)\.ipfs/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return input.trim();
};

/**
 * Mutation hook for uninstalling a game
 * Deletes game files and unpins from IPFS, then invalidates library games query
 */
export function useUninstallGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candyMachineAddress,
      executableUrl,
    }: UninstallGameVariables): Promise<void> => {
      console.log("=== MUTATION STARTED ===");
      console.log("[useUninstallGameMutation] Uninstalling game:", candyMachineAddress);
      console.log("[useUninstallGameMutation] Executable URL:", executableUrl);

      // Extract CID from executable URL for unpinning
      const executableCid = extractCidFromUrl(executableUrl);
      console.log("[useUninstallGameMutation] Executable CID:", executableCid);

      // Delete game directory using filesystem API
      try {
        const appData = await appDataDir();
        console.log("[useUninstallGameMutation] App data dir:", appData);

        const gameDir = await join(appData, "games", candyMachineAddress);
        console.log("[useUninstallGameMutation] Game directory to delete:", gameDir);

        await remove(gameDir, { recursive: true });
        console.log("[useUninstallGameMutation] Game files deleted successfully");
      } catch (error) {
        console.error("[useUninstallGameMutation] Failed to delete game:", error);
        throw new Error(`Failed to delete game files: ${error}`);
      }

      // Unpin file from local IPFS node
      console.log("[useUninstallGameMutation] Unpinning file from local IPFS node:", executableCid);
      try {
        await ipfs.unpinFile(executableCid);
        console.log("[useUninstallGameMutation] File unpinned successfully");
      } catch (error) {
        console.warn("[useUninstallGameMutation] Failed to unpin file, but uninstall succeeded:", error);
        // Don't throw - unpinning failure shouldn't block the uninstall
      }

      console.log("=== MUTATION COMPLETED SUCCESSFULLY ===");
    },
    onSuccess: (_data, variables) => {
      // Invalidate library games to update isInstalled status
      // refetchType: 'active' ensures immediate refetch if the query is currently active
      queryClient.invalidateQueries({
        queryKey: ["library-games", variables.walletAddress],
        refetchType: "active",
      });

      console.debug(
        "[useUninstallGameMutation] Library games invalidated after uninstall"
      );
    },
    onError: (error) => {
      console.error("[useUninstallGameMutation] Uninstall failed:", error);
    },
  });
}
