import { PublicKey } from "@metaplex-foundation/umi";
import { CandyMachine as CandyMachineAccount } from "@metaplex-foundation/mpl-core-candy-machine";

export class CandyMachineEntity {
  private constructor(
    public readonly publicKey: PublicKey,
    public readonly collection: PublicKey,
    public readonly authority: PublicKey,
    public readonly itemsAvailable: bigint,
    public readonly itemsLoaded: bigint
  ) {}

  static fromAccount(account: CandyMachineAccount): CandyMachineEntity {
    return new CandyMachineEntity(
      account.publicKey,
      account.collectionMint,
      account.authority,
      account.data.itemsAvailable,
      BigInt(account.itemsLoaded)
    );
  }

  canMint(): boolean {
    // For candy machines with hidden settings, itemsLoaded is always 0
    // We check itemsAvailable instead since items are virtually available
    return this.itemsAvailable > 0n;
  }

  getItemsLoaded(): number {
    return Number(this.itemsLoaded);
  }

  getItemsAvailable(): number {
    return Number(this.itemsAvailable);
  }
}
