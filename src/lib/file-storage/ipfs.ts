import { Command } from "@tauri-apps/plugin-shell";
import { appDataDir } from "@tauri-apps/api/path";
import { join } from "@tauri-apps/api/path";
import { fetch } from "@tauri-apps/plugin-http";
import { FileStorage } from "./interfaces";

export type IPFSUploadResult = {
  cid: string;
  size: number;
  name: string;
};

export class IPFSService implements FileStorage {
  private static instance: IPFSService;
  private ipfsPath: string | null = null;
  private offlineMode: boolean = false;

  private constructor() {}

  /**
   * Get the IPFS repository path (inside app data directory)
   */
  private async getIpfsPath(): Promise<string> {
    if (!this.ipfsPath) {
      const appData = await appDataDir();
      this.ipfsPath = await join(appData, ".ipfs");
    }
    return this.ipfsPath;
  }

  /**
   * Get environment variables for IPFS commands
   */
  private async getEnv(): Promise<Record<string, string>> {
    const ipfsPath = await this.getIpfsPath();
    return { IPFS_PATH: ipfsPath };
  }

  static getInstance(): IPFSService {
    if (!IPFSService.instance) {
      IPFSService.instance = new IPFSService();
    }
    return IPFSService.instance;
  }

  /**
   * Enable or disable offline mode
   * @param offline - true to run offline (no network), false for normal mode
   */
  setOfflineMode(offline: boolean): void {
    this.offlineMode = offline;
  }
  /**
   * Initialize IPFS repository (run once on first use)
   */
  async init(): Promise<void> {
    try {
      const env = await this.getEnv();
      const ipfsPath = await this.getIpfsPath();

      console.log("Initializing IPFS at:", ipfsPath);

      const command = Command.sidecar("binaries/ipfs", ["init"], { env });
      const output = await command.execute();
      console.log("IPFS init:", output.stdout);
    } catch (error) {
      console.log("IPFS already initialized or error:", error);
    }
  }

  /**
   * Upload a file to IPFS using HTTP API
   * @param file - Browser File object
   * @returns CID of the uploaded file
   */
  async uploadFile(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Add offline parameter if needed
      const url = this.offlineMode
        ? "http://localhost:5001/api/v0/add?offline=true"
        : "http://localhost:5001/api/v0/add";

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `IPFS API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      return {
        id: result.Hash,
        name: result.Name || file.name,
        sizeInBytes: parseInt(result.Size) || file.size,
      };
    } catch (error) {
      console.error("Failed to add file to IPFS:", error);
      throw error;
    }
  }

  /**
   * Upload JSON data to IPFS
   * @param data - JavaScript object to upload
   * @returns CID of the uploaded JSON
   */
  async uploadJson(data: any) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const file = new File([blob], `metadata-${Date.now()}.json`, {
      type: "application/json",
    });

    // Upload to IPFS using HTTP API
    const result = await this.uploadFile(file);

    return result;
  }

  /**
   * Get IPFS gateway URL for a CID
   * @param cid - Content identifier
   * @param gateway - IPFS gateway URL
   */
  getGatewayUrl(
    cid: string,
    gateway: string = "http://127.0.0.1:8080"
  ): string {
    return `${gateway}/ipfs/${cid}`;
  }

  /**
   * Fetch metadata JSON from IPFS by CID
   * @param cid - Content identifier for the metadata JSON
   * @returns Parsed metadata object
   */
  async fetchMetadata(cid: string): Promise<any> {
    const url = `http://localhost:5001/api/v0/cat?arg=${cid}`;

    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch metadata: ${response.status} ${response.statusText}`
      );
    }

    const text = await response.text();
    return JSON.parse(text);
  }

  /**
   * Download a file from IPFS using streaming (memory efficient for large files)
   * @param cid - Content identifier for the file
   * @param onChunk - Callback called for each chunk received (chunk, loaded, total)
   * @returns Total bytes downloaded
   */
  async downloadFileStreaming(
    cid: string,
    onChunk: (chunk: Uint8Array, loaded: number, total: number) => Promise<void>
  ) {
    const url = `http://localhost:5001/api/v0/cat?arg=${cid}`;
    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`
      );
    }

    const contentLength = response.headers.get("content-length") ?? "0";
    const total = parseInt(contentLength);

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    let downloaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      downloaded += value.length;

      await onChunk(value, downloaded, total);
    }
  }

  /**
   * Pin a file to the local IPFS node
   * This ensures the file remains available and the node becomes a seeder
   * @param cid - Content identifier for the file to pin
   */
  async pinFile(cid: string): Promise<void> {
    const url = `http://localhost:5001/api/v0/pin/add?arg=${cid}`;

    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to pin file: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("File pinned successfully:", result);
  }

  /**
   * Unpin a file from the local IPFS node
   * This removes the file from permanent storage and stops seeding it
   * @param cid - Content identifier for the file to unpin
   */
  async unpinFile(cid: string): Promise<void> {
    try {
      const url = `http://localhost:5001/api/v0/pin/rm?arg=${cid}`;

      const response = await fetch(url, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to unpin file: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("File unpinned successfully:", result);
    } catch (error) {
      // Log but don't throw - unpinning failure shouldn't block uninstall
      console.warn("Failed to unpin file from IPFS:", error);
    }
  }
}

// Export singleton instance
export const ipfs = IPFSService.getInstance();
