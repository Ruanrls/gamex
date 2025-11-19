import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipfs } from "@/lib/file-storage/ipfs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs";

export type DownloadGameVariables = {
  candyMachineAddress: string;
  executableUrl: string;
  assetPublicKey: string;
  walletAddress: string;
  onProgress?: (loaded: number, total: number) => void;
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
 * Mutation hook for downloading a game
 * Invalidates library games query to update installation status
 */
export function useDownloadGameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candyMachineAddress,
      executableUrl,
      assetPublicKey,
      onProgress,
    }: DownloadGameVariables): Promise<void> => {
      console.debug("[useDownloadGameMutation] Downloading game:", candyMachineAddress);

      // Setup directories
      const appData = await appDataDir();
      const gamesDir = await join(appData, "games");
      const gameDir = await join(gamesDir, candyMachineAddress);

      if (!(await exists(gamesDir))) {
        await mkdir(gamesDir);
      }
      if (!(await exists(gameDir))) {
        await mkdir(gameDir);
      }

      // Download executable from IPFS
      const executableCid = extractCidFromUrl(executableUrl);
      const executablePath = await join(gameDir, "game.exe");

      console.debug("[useDownloadGameMutation] Downloading executable from IPFS:", executableCid);

      const blob = await ipfs.downloadFile(executableCid, (loaded, total) => {
        console.log(`Download progress: ${loaded}/${total}`);
        onProgress?.(loaded, total);
      });

      // Convert blob to Uint8Array and save
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeFile(executablePath, uint8Array);

      // Save metadata with asset public key
      const metadataPath = await join(gameDir, "metadata.json");
      const metadataText = JSON.stringify({ assetPublicKey }, null, 2);
      await writeFile(metadataPath, new TextEncoder().encode(metadataText));

      console.debug("[useDownloadGameMutation] Game downloaded successfully");
    },
    onSuccess: (_data, variables) => {
      // Invalidate library games to update isInstalled status
      // refetchType: 'active' ensures immediate refetch if the query is currently active
      queryClient.invalidateQueries({
        queryKey: ["library-games", variables.walletAddress],
        refetchType: 'active'
      });

      console.debug("[useDownloadGameMutation] Library games invalidated after download");
    },
    onError: (error) => {
      console.error("[useDownloadGameMutation] Download failed:", error);
    },
  });
}
