import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipfs } from "@/lib/file-storage/ipfs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { remove } from "@tauri-apps/plugin-fs";

export type UninstallGameVariables = {
  candyMachineAddress: string;
  executableUrl: string;
  metadataUri: string;
  imageUrl: string;
  walletAddress: string;
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
      metadataUri,
      imageUrl,
    }: UninstallGameVariables): Promise<void> => {
      console.log("=== MUTATION STARTED ===");
      console.log("[useUninstallGameMutation] Uninstalling game:", candyMachineAddress);
      console.log("[useUninstallGameMutation] Executable URL:", executableUrl);

      // Extract CIDs from URLs for unpinning
      const executableCid = ipfs.extractCidFromUrl(executableUrl);
      const metadataCid = ipfs.extractCidFromUrl(metadataUri);
      const imageCid = ipfs.extractCidFromUrl(imageUrl);

      console.log("[useUninstallGameMutation] CIDs to unpin:", {
        executable: executableCid,
        metadata: metadataCid,
        image: imageCid,
      });

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

      // Unpin files from local IPFS node (executable, metadata, and image)
      console.log("[useUninstallGameMutation] Unpinning files from local IPFS node");
      try {
        const cidsToUnpin: string[] = [];
        if (executableCid) cidsToUnpin.push(executableCid);
        if (metadataCid) cidsToUnpin.push(metadataCid);
        if (imageCid) cidsToUnpin.push(imageCid);

        if (cidsToUnpin.length > 0) {
          console.log(`[useUninstallGameMutation] Unpinning ${cidsToUnpin.length} files`);
          await ipfs.unpinMultipleFiles(cidsToUnpin);
          console.log("[useUninstallGameMutation] Files unpinned successfully");
        } else {
          console.warn("[useUninstallGameMutation] No valid CIDs found for unpinning");
        }
      } catch (error) {
        console.warn("[useUninstallGameMutation] Failed to unpin some files, but uninstall succeeded:", error);
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
