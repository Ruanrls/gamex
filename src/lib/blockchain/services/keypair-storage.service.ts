import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, writeFile, readTextFile, remove } from "@tauri-apps/plugin-fs";

/**
 * Service for managing persistent keypair storage in the application data directory
 * Stores keypair at /wallet/keypair.json relative to app data directory
 */
export class KeypairStorageService {
  private static readonly WALLET_DIR = "wallet";
  private static readonly KEYPAIR_FILENAME = "keypair.json";

  /**
   * Gets the full path to the keypair file
   * @returns Full path to keypair.json
   */
  private async getKeypairPath(): Promise<string> {
    const appData = await appDataDir();
    const walletDir = await join(appData, KeypairStorageService.WALLET_DIR);
    return await join(walletDir, KeypairStorageService.KEYPAIR_FILENAME);
  }

  /**
   * Ensures the wallet directory exists
   */
  private async ensureWalletDirectory(): Promise<void> {
    const appData = await appDataDir();
    const walletDir = await join(appData, KeypairStorageService.WALLET_DIR);

    const dirExists = await exists(walletDir);
    if (!dirExists) {
      await mkdir(walletDir, { recursive: true });
      console.debug("[KeypairStorageService] Created wallet directory:", walletDir);
    }
  }

  /**
   * Saves a keypair to persistent storage
   * @param secretKey The secret key as Uint8Array (64 bytes - Solana keypair format)
   */
  async saveKeypair(secretKey: Uint8Array): Promise<void> {
    try {
      await this.ensureWalletDirectory();
      const keypairPath = await this.getKeypairPath();

      // Convert Uint8Array to array of numbers (standard Solana format)
      const keypairArray = Array.from(secretKey);
      const keypairJson = JSON.stringify(keypairArray);

      await writeFile(keypairPath, new TextEncoder().encode(keypairJson));

      console.debug("[KeypairStorageService] Keypair saved successfully to:", keypairPath);
    } catch (error) {
      console.error("[KeypairStorageService] Error saving keypair:", error);
      throw new Error(`Failed to save keypair: ${error}`);
    }
  }

  /**
   * Loads the keypair from persistent storage
   * @returns The secret key as Uint8Array, or null if no keypair exists
   */
  async loadKeypair(): Promise<Uint8Array | null> {
    try {
      const keypairPath = await this.getKeypairPath();

      if (!(await exists(keypairPath))) {
        console.debug("[KeypairStorageService] No keypair file found");
        return null;
      }

      const keypairJson = await readTextFile(keypairPath);
      const keypairArray = JSON.parse(keypairJson) as number[];

      // Validate keypair format (should be 64 bytes for Solana)
      if (!Array.isArray(keypairArray) || keypairArray.length !== 64) {
        console.error(
          "[KeypairStorageService] Invalid keypair format. Expected 64 bytes, got:",
          keypairArray.length
        );
        throw new Error("Invalid keypair format");
      }

      console.debug("[KeypairStorageService] Keypair loaded successfully");
      return new Uint8Array(keypairArray);
    } catch (error) {
      console.error("[KeypairStorageService] Error loading keypair:", error);
      throw new Error(`Failed to load keypair: ${error}`);
    }
  }

  /**
   * Checks if a keypair exists in storage
   * @returns true if keypair file exists, false otherwise
   */
  async keypairExists(): Promise<boolean> {
    try {
      const keypairPath = await this.getKeypairPath();
      return await exists(keypairPath);
    } catch (error) {
      console.debug("[KeypairStorageService] Error checking keypair existence:", error);
      return false;
    }
  }

  /**
   * Deletes the stored keypair (used on logout)
   */
  async deleteKeypair(): Promise<void> {
    try {
      const keypairPath = await this.getKeypairPath();

      if (await exists(keypairPath)) {
        await remove(keypairPath);
        console.debug("[KeypairStorageService] Keypair deleted successfully");
      } else {
        console.debug("[KeypairStorageService] No keypair to delete");
      }
    } catch (error) {
      console.error("[KeypairStorageService] Error deleting keypair:", error);
      throw new Error(`Failed to delete keypair: ${error}`);
    }
  }
}
