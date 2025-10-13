import { publicKey } from "@metaplex-foundation/umi";
import { fetchAsset, AssetV1 } from "@metaplex-foundation/mpl-core";
import { createConfiguredUmi } from "../umi-instance";

export class AssetOwnershipService {
  /**
   * Verifies if a wallet address owns a specific asset
   * @param assetPublicKey The public key of the asset to check
   * @param walletPublicKey The public key of the wallet to verify ownership
   * @returns true if the wallet owns the asset, false otherwise
   */
  async verifyOwnership(
    assetPublicKey: string,
    walletPublicKey: string
  ): Promise<boolean> {
    try {
      const umi = createConfiguredUmi();

      // Fetch the asset from the blockchain
      const asset = await fetchAsset(umi, publicKey(assetPublicKey));

      // Check if the asset's owner matches the wallet
      const isOwner = asset.owner.toString() === walletPublicKey;

      console.debug(
        `[AssetOwnershipService:verifyOwnership] Asset ${assetPublicKey} ownership check:`,
        {
          assetOwner: asset.owner.toString(),
          walletAddress: walletPublicKey,
          isOwner,
        }
      );

      return isOwner;
    } catch (error) {
      console.error(
        `[AssetOwnershipService:verifyOwnership] Error verifying ownership:`,
        error
      );
      throw new Error(`Failed to verify asset ownership: ${error}`);
    }
  }

  /**
   * Fetches an asset and returns its details
   * @param assetPublicKey The public key of the asset
   * @returns The asset details
   */
  async getAsset(assetPublicKey: string): Promise<AssetV1> {
    try {
      const umi = createConfiguredUmi();
      return await fetchAsset(umi, publicKey(assetPublicKey));
    } catch (error) {
      console.error(`[AssetOwnershipService:getAsset] Error fetching asset:`, error);
      throw new Error(`Failed to fetch asset: ${error}`);
    }
  }
}