import { PublicKey } from "@metaplex-foundation/umi";

export interface HiddenSettings {
  name: string;
  uri: string;
  hash: Uint8Array;
}

export interface CandyMachineConfigData {
  itemsAvailable: bigint;
  authority: PublicKey;
  collection: PublicKey;
  hiddenSettings: HiddenSettings;
}

export class CandyMachineConfigVO {
  private constructor(
    public readonly itemsAvailable: bigint,
    public readonly authority: PublicKey,
    public readonly collection: PublicKey,
    public readonly hiddenSettings: HiddenSettings
  ) {}

  static create(data: CandyMachineConfigData): CandyMachineConfigVO {
    // No limit validation - hidden settings support unlimited minting
    if (data.itemsAvailable <= 0n) {
      throw new Error("Items available must be greater than 0");
    }

    if (!data.hiddenSettings.name || !data.hiddenSettings.uri) {
      throw new Error("Hidden settings name and uri are required");
    }

    return new CandyMachineConfigVO(
      data.itemsAvailable,
      data.authority,
      data.collection,
      data.hiddenSettings
    );
  }
}
