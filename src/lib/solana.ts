import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { appDataDir } from '@tauri-apps/api/path'
import { join } from '@tauri-apps/api/path'
import { exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs'

export type SolanaNetwork = 'devnet' | 'localhost'

export class SolanaWalletService {
  private static instance: SolanaWalletService
  private keypair: Keypair | null = null
  private connection: Connection | null = null
  private network: SolanaNetwork = 'devnet'

  private constructor() {}

  static getInstance(): SolanaWalletService {
    if (!SolanaWalletService.instance) {
      SolanaWalletService.instance = new SolanaWalletService()
    }
    return SolanaWalletService.instance
  }

  /**
   * Initialize wallet and connection
   */
  async initialize(network: SolanaNetwork = 'devnet'): Promise<void> {
    this.network = network

    // Load or create keypair
    await this.loadOrCreateKeypair()

    // Create connection
    const endpoint = network === 'devnet'
      ? clusterApiUrl('devnet')
      : 'http://127.0.0.1:8899'

    this.connection = new Connection(endpoint, 'confirmed')

    console.log(`[Solana] Connected to ${network}`)
    console.log(`[Solana] Wallet address: ${this.keypair?.publicKey.toBase58()}`)
  }

  /**
   * Load keypair from file or create new one
   */
  private async loadOrCreateKeypair(): Promise<void> {
    try {
      const appData = await appDataDir()
      const walletDir = await join(appData, 'wallet')
      const keypairPath = await join(walletDir, 'keypair.json')

      // Check if keypair file exists
      if (await exists(keypairPath)) {
        console.log('[Solana] Loading existing keypair...')
        const keypairJson = await readTextFile(keypairPath)
        const secretKey = Uint8Array.from(JSON.parse(keypairJson))
        this.keypair = Keypair.fromSecretKey(secretKey)
      } else {
        console.log('[Solana] Creating new keypair...')
        this.keypair = Keypair.generate()

        // Create wallet directory if it doesn't exist
        if (!(await exists(walletDir))) {
          await mkdir(walletDir)
        }

        // Save keypair to file
        const secretKeyArray = Array.from(this.keypair.secretKey)
        await writeTextFile(keypairPath, JSON.stringify(secretKeyArray))

        console.log('[Solana] Keypair saved to:', keypairPath)
      }
    } catch (error) {
      console.error('[Solana] Failed to load/create keypair:', error)
      throw error
    }
  }

  /**
   * Get the current wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.keypair?.publicKey || null
  }

  /**
   * Get the keypair (for signing transactions)
   */
  getKeypair(): Keypair | null {
    return this.keypair
  }

  /**
   * Get the Solana connection
   */
  getConnection(): Connection | null {
    return this.connection
  }

  /**
   * Get current network
   */
  getNetwork(): SolanaNetwork {
    return this.network
  }

  /**
   * Get wallet balance in SOL
   */
  async getBalance(): Promise<number> {
    if (!this.connection || !this.keypair) {
      throw new Error('Wallet not initialized')
    }

    const balance = await this.connection.getBalance(this.keypair.publicKey)
    return balance / 1e9 // Convert lamports to SOL
  }

  /**
   * Get Solana Explorer URL for address/transaction
   */
  getExplorerUrl(addressOrSignature: string, type: 'address' | 'tx' = 'address'): string {
    const baseUrl = this.network === 'devnet'
      ? 'https://explorer.solana.com'
      : 'http://localhost:3000'

    const cluster = this.network === 'devnet' ? '?cluster=devnet' : '?cluster=custom'

    return `${baseUrl}/${type}/${addressOrSignature}${cluster}`
  }
}

// Export singleton instance
export const solanaWallet = SolanaWalletService.getInstance()
