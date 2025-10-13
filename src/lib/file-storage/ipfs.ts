import { Command } from '@tauri-apps/plugin-shell'
import { appDataDir } from '@tauri-apps/api/path'
import { join } from '@tauri-apps/api/path'
import { fetch } from '@tauri-apps/plugin-http'
import { FileStorage } from './interfaces'

export type IPFSUploadResult = {
  cid: string
  size: number
  name: string
}

export class IPFSService implements FileStorage {
  private static instance: IPFSService
  private ipfsPath: string | null = null
  private offlineMode: boolean = false

  private constructor() {}

  /**
   * Get the IPFS repository path (inside app data directory)
   */
  private async getIpfsPath(): Promise<string> {
    if (!this.ipfsPath) {
      const appData = await appDataDir()
      this.ipfsPath = await join(appData, '.ipfs')
    }
    return this.ipfsPath
  }

  /**
   * Get environment variables for IPFS commands
   */
  private async getEnv(): Promise<Record<string, string>> {
    const ipfsPath = await this.getIpfsPath()
    return { IPFS_PATH: ipfsPath }
  }

  static getInstance(): IPFSService {
    if (!IPFSService.instance) {
      IPFSService.instance = new IPFSService()
    }
    return IPFSService.instance
  }

  /**
   * Enable or disable offline mode
   * @param offline - true to run offline (no network), false for normal mode
   */
  setOfflineMode(offline: boolean): void {
    this.offlineMode = offline
  }
  /**
   * Initialize IPFS repository (run once on first use)
   */
  async init(): Promise<void> {
    try {
      const env = await this.getEnv()
      const ipfsPath = await this.getIpfsPath()

      console.log('Initializing IPFS at:', ipfsPath)

      const command = Command.sidecar('binaries/ipfs', ['init'], { env })
      const output = await command.execute()
      console.log('IPFS init:', output.stdout)
    } catch (error) {
      console.log('IPFS already initialized or error:', error)
    }
  }

  /**
   * Upload a file to IPFS using HTTP API
   * @param file - Browser File object
   * @returns CID of the uploaded file
   */
  async uploadFile(file: File) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Add offline parameter if needed
      const url = this.offlineMode
        ? 'http://localhost:5001/api/v0/add?offline=true'
        : 'http://localhost:5001/api/v0/add'

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`IPFS API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      return {
        id: result.Hash,
        name: result.Name || file.name,
        sizeInBytes: parseInt(result.Size) || file.size
      }
    } catch (error) {
      console.error('Failed to add file to IPFS:', error)
      throw error
    }
  }

  /**
   * Upload JSON data to IPFS
   * @param data - JavaScript object to upload
   * @returns CID of the uploaded JSON
   */
  async uploadJson(data: any) {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const file = new File([blob], `metadata-${Date.now()}.json`, { type: 'application/json' })

      // Upload to IPFS using HTTP API
      const result = await this.uploadFile(file)

      return result
  }

  /**
   * Get IPFS gateway URL for a CID
   * @param cid - Content identifier
   * @param gateway - IPFS gateway URL
   */
  getGatewayUrl(cid: string, gateway: string = 'http://127.0.0.1:8080'): string {
    return `${gateway}/ipfs/${cid}`
  }

  /**
   * Fetch metadata JSON from IPFS by CID
   * @param cid - Content identifier for the metadata JSON
   * @returns Parsed metadata object
   */
  async fetchMetadata(cid: string): Promise<any> {
      const url = `http://localhost:5001/api/v0/cat?arg=${cid}`

      const response = await fetch(url, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()
      return JSON.parse(text)
  }

  /**
   * Download a file from IPFS and return as Blob
   * @param cid - Content identifier for the file
   * @param onProgress - Optional callback for download progress
   * @returns Downloaded file as Blob
   */
  async downloadFile(cid: string, onProgress?: (loaded: number, total: number) => void): Promise<Blob> {
      const url = `http://localhost:5001/api/v0/cat?arg=${cid}`

      const response = await fetch(url, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        loaded += value.length

        if (onProgress) {
          onProgress(loaded, total)
        }
      }

      // Combine chunks into single blob
      return new Blob(chunks as unknown as ArrayBuffer[])
  }
}

// Export singleton instance
export const ipfs = IPFSService.getInstance()
