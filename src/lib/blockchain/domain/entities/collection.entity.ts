import { CollectionV1 } from "@metaplex-foundation/mpl-core";
import { PublicKey } from "@metaplex-foundation/umi";
import { GameMetadataVO } from "../value-objects/game-metadata.vo";

export class CollectionEntity {
  private constructor(
    public readonly publicKey: PublicKey,
    public readonly name: string,
    public readonly uri: string,
    public readonly metadata: GameMetadataVO
  ) {}

  static fromAccount(
    account: CollectionV1,
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
