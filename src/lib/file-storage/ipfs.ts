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

      const url = "http://localhost:5001/api/v0/add";

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
   * Upload a file to IPFS using CLI (for large files like game executables)
   * This method streams from disk and doesn't load the entire file into memory
   * @param filePath - Absolute path to the file on disk
   * @param fileName - Name of the file (for result metadata)
   * @param fileSize - Size of the file in bytes (for result metadata)
   * @param onProgress - Optional progress callback (loaded, total)
   * @returns CID of the uploaded file
   */
  async uploadFileViaCLI(
    filePath: string,
    fileName: string,
    fileSize: number,
    onProgress?: (loaded: number, total: number) => void
  ) {
    try {
      const fileSizeGB = fileSize / (1024 * 1024 * 1024);
      console.log(
        `[IPFSService] Starting CLI upload for ${fileName} (${fileSizeGB.toFixed(
          2
        )}GB)`
      );
      console.log(`[IPFSService] File path: ${filePath}`);

      // Get environment variables for IPFS
      const env = await this.getEnv();

      // Run IPFS add command with progress flag
      // --progress: Show progress updates
      // --cid-version=1: Use CIDv1 (better for web gateways)
      // --chunker=size-262144: Use 256KB chunks for better streaming
      const command = Command.sidecar(
        "binaries/ipfs",
        ["add", "--progress", "--cid-version=1", filePath],
        { env }
      );

      const output = await command.execute();

      if (output.code !== 0) {
        throw new Error(
          `IPFS CLI error (exit code ${output.code}): ${output.stderr}`
        );
      }

      console.log("[IPFSService] IPFS add output:", output.stdout);

      // Parse the output to extract CID
      // IPFS CLI outputs: "added <CID> <filename>"
      // With --progress, there are progress lines too, but final line has the CID
      const lines = output.stdout.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/added\s+(\S+)\s+(.+)/);

      if (!match) {
        throw new Error(
          `Failed to parse CID from IPFS output: ${output.stdout}`
        );
      }

      const cid = match[1];

      console.log(`[IPFSService] Upload complete. CID: ${cid}`);

      if (onProgress) {
        onProgress(fileSize, fileSize);
      }

      return {
        id: cid,
        name: fileName,
        sizeInBytes: fileSize,
      };
    } catch (error) {
      console.error("[IPFSService] CLI upload failed:", error);
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
   * Extract CID from an IPFS gateway URL or ipfs:// URI
   * @param url - Gateway URL or IPFS URI
   * @returns CID string or null if not found
   */
  extractCidFromUrl(url: string): string | null {
    if (!url) return null;

    // Handle ipfs:// protocol
    if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "");
    }

    // Handle gateway URLs (http://gateway/ipfs/CID or https://gateway/ipfs/CID)
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Fetch metadata JSON from IPFS by CID
   * @param cid - Content identifier for the metadata JSON
   * @param timeoutMs - Optional timeout in milliseconds (default: 30000ms / 30s)
   * @returns Parsed metadata object
   */
  async fetchMetadata(cid: string, timeoutMs: number = 30000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `http://localhost:5001/api/v0/cat?arg=${cid}`;

      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch metadata: ${response.status} ${response.statusText}`
        );
      }

      const text = await response.text();
      return JSON.parse(text);
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(
          `Metadata fetch timeout after ${timeoutMs}ms. The provider may not be responding or the content is unavailable.`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch metadata from IPFS with pre-flight availability check
   * Prevents infinite loading when metadata has no providers
   * @param uri - IPFS URI (can be gateway URL or ipfs:// protocol)
   * @param availabilityTimeoutMs - Timeout for availability check (default: 10000ms / 10s)
   * @returns Parsed metadata object
   * @throws Error if metadata is not available or fetch fails
   */
  async fetchMetadataWithAvailabilityCheck(
    uri: string,
    availabilityTimeoutMs: number = 10000
  ): Promise<any> {
    console.debug(
      `[IPFSService] Fetching metadata with availability check: ${uri}`
    );

    // Extract CID from URI
    const cid = this.extractCidFromUrl(uri);
    if (!cid) {
      // If we can't extract CID, try direct HTTP fetch (might be non-IPFS URL)
      console.warn(
        `[IPFSService] Could not extract CID from URI, attempting direct fetch: ${uri}`
      );
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch metadata: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    }

    // Check if content is available on the network
    console.debug(
      `[IPFSService] Checking availability for metadata CID: ${cid}`
    );
    const isAvailable = await this.checkContentAvailability(
      cid,
      availabilityTimeoutMs
    );

    if (!isAvailable) {
      throw new Error(
        `Metadata not available on IPFS network. No peers found hosting this metadata (CID: ${cid}). The content may have been removed or is temporarily unavailable.`
      );
    }

    console.debug(`[IPFSService] Metadata is available, fetching...`);

    // Fetch metadata using the existing method
    return await this.fetchMetadata(cid);
  }

  /**
   * Check if content is available on the IPFS network
   * Uses the routing API to find if any peers have the content
   * Parses NDJSON response looking for Type 4 (Provider) records
   * Note: Type 1 (PeerResponse) records contain DHT routing info, NOT actual providers
   * @param cid - Content identifier to check
   * @param timeoutMs - Timeout in milliseconds (default: 10000ms / 10s)
   * @returns true if content has providers, false otherwise
   */
  async checkContentAvailability(
    cid: string,
    timeoutMs: number = 10000
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Use routing findprovs to check if any peers have this content
      const url = `http://localhost:5001/api/v0/routing/findprovs?arg=${cid}&num-providers=1`;
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(
          `[IPFSService] Provider check failed: ${response.status} ${response.statusText}`
        );
        return false;
      }

      // Parse NDJSON response (newline-delimited JSON)
      // QueryEventType values: 0=SendingQuery, 1=PeerResponse, 4=Provider, 7=DialingPeer
      // IMPORTANT: Only Type 4 indicates actual providers were found
      // Type 1 Responses array contains peers to query next (DHT routing), NOT providers
      const text = await response.text();

      if (!text.trim()) {
        return false;
      }

      // Split by newlines and parse each JSON object
      const lines = text.trim().split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const record = JSON.parse(line);

          // Type 4 = Provider record (actual provider found)
          // This is the ONLY reliable indicator that content is available
          if (record.Type === 4) {
            console.debug(
              `[IPFSService] Found provider for CID ${cid}:`,
              record.ID || "(empty ID)"
            );
            return true;
          }
        } catch (parseError) {
          console.warn(
            "[IPFSService] Failed to parse provider record:",
            line,
            parseError
          );
          // Continue checking other lines
        }
      }

      // No Type 4 provider records found
      console.debug(`[IPFSService] No providers found for CID ${cid}`);
      return false;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn(
          `[IPFSService] Provider check timed out after ${timeoutMs}ms`
        );
        return false;
      }
      console.warn("[IPFSService] Provider check failed:", error);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Download a file from IPFS using streaming (memory efficient for large files)
   * @param cid - Content identifier for the file
   * @param onChunk - Callback called for each chunk received (chunk, loaded, total)
   * @param timeoutMs - Optional timeout in milliseconds (default: no timeout)
   * @returns Total bytes downloaded
   */
  async downloadFileStreaming(
    cid: string,
    onChunk: (
      chunk: Uint8Array,
      loaded: number,
      total: number
    ) => Promise<void>,
    timeoutMs?: number
  ) {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    // Only set timeout if explicitly provided
    if (timeoutMs) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    try {
      const url = `http://localhost:5001/api/v0/cat?arg=${cid}`;
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
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
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(
          `Download timeout after ${timeoutMs}ms. The file may not be available on the network or the connection is too slow.`
        );
      }
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Download a file with pre-flight availability check
   * Checks if content is available before attempting download
   * @param cid - Content identifier for the file
   * @param onChunk - Callback called for each chunk received
   * @param availabilityTimeoutMs - Timeout for availability check (default: 10000ms / 10s)
   * @returns Total bytes downloaded
   */
  async downloadWithAvailabilityCheck(
    cid: string,
    onChunk: (
      chunk: Uint8Array,
      loaded: number,
      total: number
    ) => Promise<void>,
    availabilityTimeoutMs: number = 10000
  ): Promise<void> {
    console.debug(
      `[IPFSService] Checking availability for CID: ${cid} (timeout: ${availabilityTimeoutMs}ms)`
    );

    // Check if content is available on the network
    const isAvailable = await this.checkContentAvailability(
      cid,
      availabilityTimeoutMs
    );

    if (!isAvailable) {
      throw new Error(
        `Content not available on IPFS network. No peers found hosting this file (CID: ${cid}). The content may have been removed or is temporarily unavailable.`
      );
    }

    console.debug(
      `[IPFSService] Content is available, starting download (no timeout - will download until complete)`
    );

    // Content is available, proceed with download (no timeout)
    await this.downloadFileStreaming(cid, onChunk);
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

  /**
   * Pin multiple files to the local IPFS node
   * @param cids - Array of content identifiers to pin
   * @returns Array of results indicating success/failure for each CID
   */
  async pinMultipleFiles(cids: string[]): Promise<void> {
    const results = await Promise.allSettled(
      cids.map((cid) => this.pinFile(cid))
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(
        `[IPFSService] ${failed.length}/${cids.length} files failed to pin`,
        failed
      );
      // Don't throw - partial pinning is acceptable
    }
  }

  /**
   * Unpin multiple files from the local IPFS node
   * @param cids - Array of content identifiers to unpin
   */
  async unpinMultipleFiles(cids: string[]): Promise<void> {
    await Promise.allSettled(cids.map((cid) => this.unpinFile(cid)));
    // unpinFile already handles errors gracefully, so we don't need additional error handling
  }
}

// Export singleton instance
export const ipfs = IPFSService.getInstance();
