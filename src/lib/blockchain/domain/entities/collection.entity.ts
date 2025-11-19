import { PublicKey } from "@metaplex-foundation/umi";
import { GameMetadataVO } from "../value-objects/game-metadata.vo";

type CollectionData = {
  publicKey: PublicKey;
  name: string;
  uri: string;
};

export class CollectionEntity {
  private constructor(
    public readonly publicKey: PublicKey,
    public readonly name: string,
    public readonly uri: string,
    public readonly metadata: GameMetadataVO
  ) {}

  static fromAccount(
    account: CollectionData,
    metadata: GameMetadataVO
  ): CollectionEntity {
    return new CollectionEntity(
      account.publicKey,
      account.name,
      account.uri,
      metadata
    );
  }
}
