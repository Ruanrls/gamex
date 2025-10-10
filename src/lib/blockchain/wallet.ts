import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";

type WalletProps = {
  secretKey: Uint8Array<ArrayBufferLike>;
  address: string;
};

export class Wallet {
  private _secretKey: Uint8Array;
  public address: string;

  private constructor(props: WalletProps) {
    this._secretKey = props.secretKey;
    this.address = props.address;
  }

  static generate() {
    const keypair = Keypair.generate();
    return new Wallet({
      address: keypair.publicKey.toString(),
      secretKey: keypair.secretKey,
    });
  }

  static fromSecretKey(secretKey: Uint8Array) {
    const keypair = Keypair.fromSecretKey(secretKey);
    return new Wallet({
      address: keypair.secretKey.toString(),
      secretKey,
    });
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
}
