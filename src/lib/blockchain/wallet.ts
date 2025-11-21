import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { KeypairStorageService } from "./services/keypair-storage.service";

type WalletProps = {
  secretKey: Uint8Array<ArrayBufferLike>;
  address: string;
};

export class Wallet {
  private _secretKey: Uint8Array;
  public address: string;
  private static storageService = new KeypairStorageService();

  private constructor(props: WalletProps) {
    this._secretKey = props.secretKey;
    this.address = props.address;
  }

  static async generate() {
    const keypair = Keypair.generate();
    const wallet = new Wallet({
      address: keypair.publicKey.toString(),
      secretKey: keypair.secretKey,
    });

    // Save keypair to persistent storage
    await Wallet.storageService.saveKeypair(keypair.secretKey);

    return wallet;
  }

  static fromSecretKey(secretKey: Uint8Array) {
    const keypair = Keypair.fromSecretKey(secretKey);
    return new Wallet({
      address: keypair.publicKey.toString(),
      secretKey,
    });
  }

  /**
   * Creates a wallet from a base58-encoded private key and saves it to storage
   * @param privateKeyBase58 The private key in base58 format
   * @returns A new Wallet instance
   */
  static async fromBase58(privateKeyBase58: string): Promise<Wallet> {
    try {
      // Decode base58 private key to Uint8Array
      const secretKey = bs58.decode(privateKeyBase58);

      // Validate it's a proper Solana keypair (64 bytes)
      if (secretKey.length !== 64) {
        throw new Error(`Invalid private key length. Expected 64 bytes, got ${secretKey.length}`);
      }

      const wallet = Wallet.fromSecretKey(secretKey);

      // Save keypair to persistent storage
      await Wallet.storageService.saveKeypair(secretKey);

      return wallet;
    } catch (error) {
      console.error("[Wallet:fromBase58] Error importing private key:", error);
      throw new Error(`Failed to import private key: ${error}`);
    }
  }

  /**
   * Loads a wallet from persistent storage if available
   * @returns A Wallet instance if keypair exists, null otherwise
   */
  static async loadFromStorage(): Promise<Wallet | null> {
    try {
      const secretKey = await Wallet.storageService.loadKeypair();

      if (!secretKey) {
        return null;
      }

      return Wallet.fromSecretKey(secretKey);
    } catch (error) {
      console.error("[Wallet:loadFromStorage] Error loading wallet from storage:", error);
      return null;
    }
  }

  /**
   * Checks if a keypair exists in storage
   * @returns true if a keypair is stored, false otherwise
   */
  static async hasStoredKeypair(): Promise<boolean> {
    return await Wallet.storageService.keypairExists();
  }

  signTransaction(transaction: VersionedTransaction) {
    transaction.sign([
      new Keypair({
        publicKey: new PublicKey(this.address).toBytes(),
        secretKey: this._secretKey,
      }),
    ]);

    return transaction;
  }

  toSigner() {
    return new Keypair({
        publicKey: new PublicKey(this.address).toBytes(),
        secretKey: this._secretKey
    })
  }

  getPrivateKey(): string {
    return bs58.encode(this._secretKey);
  }
}
