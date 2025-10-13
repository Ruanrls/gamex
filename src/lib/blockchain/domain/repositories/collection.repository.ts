import { createCollection, fetchCollection } from "@metaplex-foundation/mpl-core";
import {
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { Wallet } from "../../wallet";
import { CollectionEntity } from "../entities/collection.entity";
import { GameMetadataVO } from "../value-objects/game-metadata.vo";
import { fetch } from "@tauri-apps/plugin-http";
import { createConfiguredUmi } from "../../umi-instance";

export interface ICollectionRepository {
  create(wallet: Wallet, metadata: GameMetadataVO, metadataUri: string): Promise<CollectionEntity>;
  findByPublicKey(publicKey: string): Promise<CollectionEntity>;
}

export class CollectionRepository implements ICollectionRepository {
  async create(
    wallet: Wallet,
    metadata: GameMetadataVO,
    metadataUri: string
  ): Promise<CollectionEntity> {
    console.debug(
      "[CollectionRepository:create] creating collection for ",
      wallet.address,
      " metadata: ",
      metadata,
      " uri: ",
      metadataUri
    );

    const umi = createConfiguredUmi();

    const signer = wallet.toSigner();
    const metaplexSigner = createSignerFromKeypair(umi, {
      publicKey: publicKey(signer.publicKey),
      secretKey: signer.secretKey,
    });

    umi.use(signerIdentity(metaplexSigner));

    const collectionKeypair = generateSigner(umi);
    console.debug(
      "[CollectionRepository:create] collection keypair generated ",
      collectionKeypair.publicKey
    );

    await createCollection(umi, {
      collection: collectionKeypair,
      name: metadata.name,
      uri: metadataUri,
      payer: metaplexSigner,
    }).sendAndConfirm(umi);

    console.debug(
      "[CollectionRepository:create] fetching collection ",
      collectionKeypair.publicKey
    );

    const collection = await fetchCollection(umi, collectionKeypair.publicKey);
    console.debug(
      "[CollectionRepository:create] collection created ",
      collection
    );

    return CollectionEntity.fromAccount(collection, metadata);
  }

  async findByPublicKey(collectionPublicKey: string): Promise<CollectionEntity> {
    console.debug(
      "[CollectionRepository:findByPublicKey] fetching collection: ",
      collectionPublicKey
    );

    const umi = createConfiguredUmi();
    const collection = await fetchCollection(umi, publicKey(collectionPublicKey));

    console.debug(
      "[CollectionRepository:findByPublicKey] collection fetched: ",
      collection
    );

    // Fetch metadata from URI
    const response = await fetch(collection.uri);
    const metadataJson = await response.json();
    const metadata = GameMetadataVO.create(metadataJson);

    console.debug(
      "[CollectionRepository:findByPublicKey] metadata fetched: ",
      metadata
    );

    return CollectionEntity.fromAccount(collection, metadata);
  }
}
