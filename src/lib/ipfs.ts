import { Command } from '@tauri-apps/plugin-shell'
import { appDataDir } from '@tauri-apps/api/path'
import { join } from '@tauri-apps/api/path'

export type IPFSUploadResult = {
  cid: string
  size: number
  name: string
}

export class IPFSService {
  private static instance: IPFSService
  private daemonProcess: ReturnType<typeof Command.sidecar> | null = null
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
   * Start IPFS daemon
   * @param offline - Override offline mode for this daemon instance
   */
  async startDaemon(offline?: boolean): Promise<void> {
    if (this.daemonProcess) {
      console.log('IPFS daemon already running')
      return
    }

    try {
      console.log('[IPFS] Getting environment variables...')
      const env = await this.getEnv()
      console.log('[IPFS] IPFS_PATH:', env.IPFS_PATH)

      const useOffline = offline !== undefined ? offline : this.offlineMode

      const args = ['daemon']
      if (useOffline) {
        args.push('--offline')
        console.log('[IPFS] Starting IPFS daemon in OFFLINE mode (no network connectivity)')
      } else {
        console.log('[IPFS] Starting IPFS daemon in ONLINE mode')
      }

      console.log('[IPFS] Command args:', args)
      console.log('[IPFS] Environment:', env)

      // Create command with environment in options
      const command = Command.sidecar('binaries/ipfs', args, {
        env
      })

      // Store reference
      this.daemonProcess = command

      // Spawn the daemon in background
      console.log('[IPFS] Spawning daemon process...')
      const child = await command.spawn()

      console.log('[IPFS] Daemon started with PID:', child.pid)

      // Wait a bit for daemon to start
      console.log('[IPFS] Waiting 3 seconds for daemon initialization...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      console.log('[IPFS] Daemon should be ready now')
    } catch (error) {
      console.error('[IPFS] Failed to start IPFS daemon:', error)
      throw error
    }
  }

  /**
   * Upload a file to IPFS using HTTP API
   * @param file - Browser File object
   * @returns CID of the uploaded file
   */
  async addFile(file: File): Promise<IPFSUploadResult> {
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
        cid: result.Hash,
        name: result.Name || file.name,
        size: parseInt(result.Size) || file.size
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
  async addJSON(data: any): Promise<IPFSUploadResult> {
    try {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const file = new File([blob], `metadata-${Date.now()}.json`, { type: 'application/json' })

      // Upload to IPFS using HTTP API
      const result = await this.addFile(file)

      return result
    } catch (error) {
      console.error('Failed to add JSON to IPFS:', error)
      throw error
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   * @param cid - Content identifier
   * @param gateway - IPFS gateway URL (default: ipfs.io)
   */
  getGatewayUrl(cid: string, gateway: string = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`
  }
}

// Export singleton instance
export const ipfs = IPFSService.getInstance()
