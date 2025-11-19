import { PublicKey } from "@metaplex-foundation/umi";
import {
  CandyMachine as CandyMachineAccount,
  CandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";

export interface SolPaymentGuardData {
  destination: PublicKey;
}

export class CandyMachineEntity {
  private constructor(
    public readonly publicKey: PublicKey,
    public readonly collection: PublicKey,
    public readonly authority: PublicKey,
    public readonly itemsAvailable: bigint,
    public readonly itemsLoaded: bigint,
    public readonly solPaymentGuard?: SolPaymentGuardData
  ) {}

  static fromAccount(
    account: CandyMachineAccount,
    candyGuard?: CandyGuard | null
  ): CandyMachineEntity {
    console.debug(
      "[CandyMachineEntity:fromAccount] Processing candy machine account"
    );

    let solPaymentGuard: SolPaymentGuardData | undefined;

    // Extract guards from the separate CandyGuard account
    if (candyGuard?.guards?.solPayment) {
      const solPayment = candyGuard.guards.solPayment;
      console.debug(
        "[CandyMachineEntity:fromAccount] solPayment guard found: ",
        solPayment
      );

      // Handle Option<T> types - check for __option === 'Some'
      if (solPayment.__option === "Some" && solPayment.value) {
        console.debug(
          "[CandyMachineEntity:fromAccount] Extracting solPayment destination: ",
          solPayment.value.destination
        );
        // SolPaymentMintArgs only needs destination (lamports is omitted)
        solPaymentGuard = {
          destination: solPayment.value.destination,
        };
      }
    } else {
      console.debug(
        "[CandyMachineEntity:fromAccount] No solPayment guard configured"
      );
    }

    return new CandyMachineEntity(
      account.publicKey,
      account.collectionMint,
      account.authority,
      account.data.itemsAvailable,
      BigInt(account.itemsLoaded),
      solPaymentGuard
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
