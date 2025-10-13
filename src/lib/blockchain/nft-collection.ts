import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Wallet } from "./wallet";
import connection from "./connection";
import { fetch } from "@tauri-apps/plugin-http";

import { CollectionV1, create, createCollection, fetchAsset, fetchCollection } from "@metaplex-foundation/mpl-core";
import {
    createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";

export type CollectionMetadata = {
  name: string;
  description: string;
  image: string;
  executable: string;
};

export class NftCollection {
  private constructor(public collection: CollectionV1, public metadata: CollectionMetadata) {}

  static async create(wallet: Wallet, metadata: CollectionMetadata, metadataUri: string) {
    console.debug("[NftCollection:create] creating a new nft for ", wallet.address, " metadata: ", metadata, " uri: ", metadataUri);
    const umi = createUmi(connection.rpcEndpoint);

    const signer = wallet.toSigner();
    const metaplexSigner = createSignerFromKeypair(umi, {
        publicKey: publicKey(signer.publicKey),
        secretKey: signer.secretKey
    })

    umi.use(signerIdentity(metaplexSigner));

    const collectionKeypair = generateSigner(umi);
    console.debug("[NftCollection:create] collection keypair generated ", collectionKeypair.publicKey);
    await createCollection(umi, {
        collection: collectionKeypair,
        name: metadata.name,
        uri: metadataUri,
        payer: metaplexSigner
    }).sendAndConfirm(umi);

    console.debug("[NftCollection:create] fetching collection ", collectionKeypair.publicKey)
    const collection = await fetchCollection(umi, collectionKeypair.publicKey);
    console.debug("[NftCollection:create] collection created and minted ", collection)

    return new NftCollection(collection, metadata);
  }

  static async fetchByPublicKey(collectionPublicKey: string) {
    console.debug("[NftCollection:fetchByPublicKey] fetching collection by public key: ", collectionPublicKey);
    const umi = createUmi(connection.rpcEndpoint);

    const collection = await fetchCollection(umi, publicKey(collectionPublicKey));
    console.debug("[NftCollection:fetchByPublicKey] collection fetched: ", collection);

    // Fetch metadata from URI
    const response = await fetch(collection.uri);
    const metadata = await response.json() as CollectionMetadata;
    console.debug("[NftCollection:fetchByPublicKey] metadata fetched: ", metadata);

    return new NftCollection(collection, metadata);
  }

  async mintNft(buyer: Wallet) {
    const umi = createUmi(connection.rpcEndpoint);
    const assetKeypair = generateSigner(umi)

    const signer = buyer.toSigner();
    const metaplexSigner = createSignerFromKeypair(umi, {
        publicKey: publicKey(signer.publicKey),
        secretKey: signer.secretKey
    })

    umi.use(signerIdentity(metaplexSigner));

    await create(umi, {
      asset: assetKeypair,
      collection: this.collection,
      name: this.metadata.name,
      uri: this.collection.uri,
      payer: metaplexSigner
    }).sendAndConfirm(umi) 

    const nft = await fetchAsset(umi, assetKeypair.publicKey);
    return nft;
  }
}
