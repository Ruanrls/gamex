import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipfs } from "@/lib/file-storage/ipfs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { create, mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { detectTargetTriple, getExecutableFilename } from "@/lib/platform";
import { GameExecutable } from "@/lib/blockchain/domain/value-objects/game-metadata.vo";

export type DownloadGameVariables = {
  candyMachineAddress: string;
  executables: GameExecutable[];
  assetPublicKey: string;
  walletAddress: string;
  metadataUri: string;
  imageUrl: string;
  onProgress?: (loaded: number, total: number) => void;
};


/**
 * Mutation hook for downloading a game
 * Invalidates library games query to update installation status
 */
export function useDownloadGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candyMachineAddress,
      executables,
      assetPublicKey,
      metadataUri,
      imageUrl,
      onProgress,
    }: DownloadGameVariables): Promise<void> => {
      console.debug(
        "[useDownloadGameMutation] Downloading game:",
        candyMachineAddress
      );

      // Detect current platform
      const currentTriple = await detectTargetTriple();
      console.debug(
        "[useDownloadGameMutation] Detected target triple:",
        currentTriple
      );

      // Find executable for current platform
      const executable = executables.find(
        (exec) => exec.platform === currentTriple
      );
      if (!executable) {
        const availablePlatforms = executables
          .map((e) => e.platform)
          .join(", ");
        throw new Error(
          `This game is not available for your platform (${currentTriple}). Available platforms: ${availablePlatforms}`
        );
      }

      // Setup directories
      const appData = await appDataDir();
      const gamesDir = await join(appData, "games");
      const gameDir = await join(gamesDir, candyMachineAddress);

      // Download executable from IPFS with platform-specific filename
      const executableCid = ipfs.extractCidFromUrl(executable.url);
      if (!executableCid) {
        throw new Error(`Invalid executable URL: ${executable.url}`);
      }

      const executableFilename = getExecutableFilename(currentTriple);
      const executablePath = await join(gameDir, executableFilename);

      console.debug(
        "[useDownloadGameMutation] Downloading executable from IPFS:",
        {
          cid: executableCid,
          filename: executableFilename,
          targetTriple: currentTriple,
        }
      );

      await mkdir(gameDir, { recursive: true });

      // Use streaming download with availability check to avoid indefinite hanging
      const fileHandle = await create(executablePath);

      try {
        await ipfs.downloadWithAvailabilityCheck(
          executableCid,
          async (chunk, loaded, total) => {
            // Write each chunk directly to disk
            await fileHandle.write(chunk);

            // Report progress
            console.log(`Download progress: ${loaded}/${total}`);
            onProgress?.(loaded, total);
          }
        );
      } finally {
        // Always close the file handle
        await fileHandle.close();
      }

      // Pin executable, metadata, and image to local IPFS node to become a complete seeder
      console.debug(
        "[useDownloadGameMutation] Pinning game files to local IPFS node"
      );
      try {
        const metadataCid = ipfs.extractCidFromUrl(metadataUri);
        const imageCid = ipfs.extractCidFromUrl(imageUrl);

        const cidsToPin = [executableCid];
        if (metadataCid) cidsToPin.push(metadataCid);
        if (imageCid) cidsToPin.push(imageCid);

        console.debug(
          `[useDownloadGameMutation] Pinning ${cidsToPin.length} files:`,
          { executable: executableCid, metadata: metadataCid, image: imageCid }
        );

        await ipfs.pinMultipleFiles(cidsToPin);
        console.debug(
          "[useDownloadGameMutation] Files pinned successfully, node is now a complete seeder"
        );
      } catch (error) {
        console.warn(
          "[useDownloadGameMutation] Failed to pin some files, but download succeeded:",
          error
        );
        // Don't throw - pinning failure shouldn't block the download
      }

      // Save metadata with asset public key and target triple
      const metadataPath = await join(gameDir, "metadata.json");
      const metadataText = JSON.stringify(
        { assetPublicKey, targetTriple: currentTriple },
        null,
        2
      );
      await writeFile(metadataPath, new TextEncoder().encode(metadataText));

      console.debug("[useDownloadGameMutation] Game downloaded successfully");
    },
    onSuccess: (_data, variables) => {
      // Invalidate library games to update isInstalled status
      // refetchType: 'active' ensures immediate refetch if the query is currently active
      queryClient.invalidateQueries({
        queryKey: ["library-games", variables.walletAddress],
        refetchType: "active",
      });

      console.debug(
        "[useDownloadGameMutation] Library games invalidated after download"
      );
    },
    onError: (error) => {
      console.error("[useDownloadGameMutation] Download failed:", error);
    },
  });
}
