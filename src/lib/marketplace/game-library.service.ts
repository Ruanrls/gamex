import { AssetOwnershipService } from "../blockchain/services/asset-ownership.service";
import { CollectionRepository } from "../blockchain/domain/repositories/collection.repository";
import { GameMetadata } from "../blockchain/domain/value-objects/game-metadata.vo";
import { appDataDir, join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/plugin-fs";
import { collectionAddress } from "@metaplex-foundation/mpl-core";
import { detectTargetTriple, getExecutableFilename } from "../platform";

export type LibraryGame = {
  assetPublicKey: string;
  candyMachinePublicKey: string;
  metadata: GameMetadata;
  isInstalled: boolean;
  collectionPublicKey: string;
};

export class GameLibraryService {
  private assetOwnershipService: AssetOwnershipService;
  private collectionRepository: CollectionRepository;

  constructor() {
    this.assetOwnershipService = new AssetOwnershipService();
    this.collectionRepository = new CollectionRepository();
  }

  /**
   * Fetches all games owned by the user and enriches them with metadata and installation status
   * @param walletAddress The public key of the user's wallet
   * @returns Array of library games with metadata and installation status
   */
  async getLibraryGames(walletAddress: string): Promise<LibraryGame[]> {
    try {
      console.debug(
        `[GameLibraryService:getLibraryGames] Fetching library for wallet:`,
        walletAddress
      );

      // Fetch all game assets owned by the user
      const ownedAssets = await this.assetOwnershipService.getUserOwnedGames(
        walletAddress
      );

      console.debug(
        `[GameLibraryService:getLibraryGames] Found ${ownedAssets.length} owned assets`
      );

      // Enrich each asset with collection metadata and installation status
      const libraryGames = await Promise.all(
        ownedAssets.map(async (asset) => {
          try {
            // Get collection public key from asset using the helper function
            const collectionPublicKeyObj = collectionAddress(asset);

            if (!collectionPublicKeyObj) {
              console.debug(
                `[GameLibraryService:getLibraryGames] Asset ${asset.publicKey} has no collection, skipping`
              );
              return null;
            }

            const collectionPublicKey = collectionPublicKeyObj.toString();

            console.debug(
              `[GameLibraryService:getLibraryGames] Fetching collection for asset ${asset.publicKey}:`,
              collectionPublicKey
            );

            // Fetch collection metadata
            const collection = await this.collectionRepository.findByPublicKey(
              collectionPublicKey
            );

            // Check if game is installed locally
            // Games are stored as: appDataDir/games/{collectionPublicKey}/game.exe
            const isInstalled = await this.checkGameInstallation(
              collectionPublicKey
            );

            console.debug(
              `[GameLibraryService:getLibraryGames] Game ${collection.metadata.name} - Installed: ${isInstalled}`
            );

            return {
              assetPublicKey: asset.publicKey.toString(),
              candyMachinePublicKey: collectionPublicKey,
              metadata: collection.metadata.toJSON(),
              isInstalled,
              collectionPublicKey,
            } as LibraryGame;
          } catch (error) {
            console.error(
              `[GameLibraryService:getLibraryGames] Error processing asset ${asset.publicKey}:`,
              error
            );
            // Skip assets that fail to process (might not be game assets)
            return null;
          }
        })
      );

      // Filter out null values (failed assets)
      const validGames = libraryGames.filter(
        (game): game is LibraryGame => game !== null
      );

      console.debug(
        `[GameLibraryService:getLibraryGames] Returning ${validGames.length} valid games`
      );

      return validGames;
    } catch (error) {
      console.error(
        `[GameLibraryService:getLibraryGames] Error fetching library:`,
        error
      );
      throw new Error(`Failed to fetch game library: ${error}`);
    }
  }

  /**
   * Checks if a game is installed locally for the current platform
   * @param candyMachinePublicKey The candy machine public key (used as folder name)
   * @returns true if the game executable exists for current platform, false otherwise
   */
  private async checkGameInstallation(
    candyMachinePublicKey: string
  ): Promise<boolean> {
    try {
      // Detect current platform
      const currentTriple = await detectTargetTriple();
      const executableFilename = getExecutableFilename(currentTriple);

      const appData = await appDataDir();
      const gamesDir = await join(appData, "games");
      const gameDir = await join(gamesDir, candyMachinePublicKey);
      const executablePath = await join(gameDir, executableFilename);

      console.debug(
        `[GameLibraryService:checkGameInstallation] Checking for ${executableFilename} at ${executablePath}`
      );

      return await exists(executablePath);
    } catch (error) {
      console.debug(
        `[GameLibraryService:checkGameInstallation] Error checking installation:`,
        error
      );
      return false;
    }
  }
}
