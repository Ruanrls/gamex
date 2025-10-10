import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Wallet } from "./wallet";
import connection from "./connection";

import { CollectionV1, create, createCollection, fetchAsset, fetchCollection } from "@metaplex-foundation/mpl-core";
import {
    createSignerFromKeypair,
  generateSigner,
  publicKey,
} from "@metaplex-foundation/umi";

export type CollectionMetadata = {
  name: string;
  uri: string;
};

export class NftCollection {
  private constructor(public collection: CollectionV1, public metadata: CollectionMetadata) {}

  static async create(wallet: Wallet, metadata: CollectionMetadata) {
    console.debug("[NftCollection:create] creating a new nft for ", wallet.address, " metadata: ", metadata);
    const umi = createUmi(connection.rpcEndpoint);


    const signer = wallet.toSigner();
    const metaplexSigner = createSignerFromKeypair(umi, {
        publicKey: publicKey(signer.publicKey),
        secretKey: signer.secretKey
    })
    
    const collectionKeypair = generateSigner(umi);
    console.debug("[NftCollection:create] collection keypair generated ", collectionKeypair.publicKey);
    await createCollection(umi, {
        collection: collectionKeypair,
        name: metadata.name,
        uri: metadata.uri,
        payer: metaplexSigner
    }).sendAndConfirm(umi);

    console.debug("[NftCollection:create] fetching collection ", collectionKeypair.publicKey)
    const collection = await fetchCollection(umi, collectionKeypair.publicKey);
    console.debug("[NftCollection:create] collection created and minted ", collection)

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

    await create(umi, {
      asset: assetKeypair,
      collection: this.collection,
      name: this.metadata.name,
      uri: this.metadata.uri,
      payer: metaplexSigner
    }).sendAndConfirm(umi) 

    const nft = await fetchAsset(umi, assetKeypair.publicKey);
    return nft;
  }
}
