import { PublicKey } from "@metaplex-foundation/umi";

export interface HiddenSettings {
  name: string;
  uri: string;
  hash: Uint8Array;
}

export interface SolPaymentGuard {
  lamports: bigint;
  destination: PublicKey;
}

export interface Guards {
  solPayment?: SolPaymentGuard;
}

export interface CandyMachineConfigData {
  itemsAvailable: bigint;
  authority: PublicKey;
  collection: PublicKey;
  hiddenSettings: HiddenSettings;
  guards?: Guards;
}

export class CandyMachineConfigVO {
  private constructor(
    public readonly itemsAvailable: bigint,
    public readonly authority: PublicKey,
    public readonly collection: PublicKey,
    public readonly hiddenSettings: HiddenSettings,
    public readonly guards?: Guards
  ) {}

  static create(data: CandyMachineConfigData): CandyMachineConfigVO {
    // No limit validation - hidden settings support unlimited minting
    if (data.itemsAvailable <= 0n) {
      throw new Error("Items available must be greater than 0");
    }

    if (!data.hiddenSettings.name || !data.hiddenSettings.uri) {
      throw new Error("Hidden settings name and uri are required");
    }

    // Validate guards if provided
    if (data.guards?.solPayment) {
      if (data.guards.solPayment.lamports < 0n) {
        throw new Error("Price must be greater than or equal to 0");
      }
    }

    return new CandyMachineConfigVO(
      data.itemsAvailable,
      data.authority,
      data.collection,
      data.hiddenSettings,
      data.guards
    );
  }
}
