import { publicKey } from "@metaplex-foundation/umi";
import { Wallet } from "../wallet";
import { GameMetadataVO } from "../domain/value-objects/game-metadata.vo";
import { CandyMachineConfigVO } from "../domain/value-objects/candy-machine-config.vo";
import { CollectionRepository } from "../domain/repositories/collection.repository";
import { CandyMachineRepository } from "../domain/repositories/candy-machine.repository";
import { CollectionEntity } from "../domain/entities/collection.entity";
import { CandyMachineEntity } from "../domain/entities/candy-machine.entity";

export interface GamePublishingResult {
  collection: CollectionEntity;
  candyMachine: CandyMachineEntity;
}

// Use very large number for effectively unlimited minting
const UNLIMITED_ITEMS = 1_000_000_000_000n; // 1 trillion

export class GamePublishingService {
  private collectionRepository: CollectionRepository;
  private candyMachineRepository: CandyMachineRepository;

  constructor() {
    this.collectionRepository = new CollectionRepository();
    this.candyMachineRepository = new CandyMachineRepository();
  }

  private async generateMetadataHash(metadata: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(metadata);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
  }

  async publishGame(
    wallet: Wallet,
    metadata: GameMetadataVO,
    metadataUri: string,
    priceLamports?: bigint
  ): Promise<GamePublishingResult> {
    console.debug(
      "[GamePublishingService:publishGame] Starting game publishing process",
      { price: priceLamports ? `${priceLamports} lamports` : "free" }
    );

    // Step 1: Create the collection
    console.debug("[GamePublishingService:publishGame] Creating collection...");
    const collection = await this.collectionRepository.create(
      wallet,
      metadata,
      metadataUri
    );

    console.debug(
      "[GamePublishingService:publishGame] Collection created: ",
      collection.publicKey
    );

    // Step 2: Generate hash for hidden settings
    const metadataJson = JSON.stringify(metadata.toJSON());
    const metadataHash = await this.generateMetadataHash(metadataJson);

    console.debug(
      "[GamePublishingService:publishGame] Generated metadata hash for hidden settings"
    );

    console.log(
      "🚀 ~ GamePublishingS ervice ~ publishGame ~ priceLamports && priceLamports > 0n:",
      priceLamports && priceLamports > 0n
    );
    // Step 3: Create candy machine config with hidden settings
    const candyMachineConfig = CandyMachineConfigVO.create({
      itemsAvailable: UNLIMITED_ITEMS,
      authority: publicKey(wallet.address),
      collection: collection.publicKey,
      hiddenSettings: {
        name: metadata.name,
        uri: metadataUri,
        hash: metadataHash,
      },
      // Add guards for price if specified (funds go to creator's wallet)
      guards:
        priceLamports && priceLamports > 0n
          ? {
              solPayment: {
                lamports: priceLamports,
                destination: publicKey(wallet.address),
              },
            }
          : undefined,
    });

    // Step 4: Create the candy machine (ready to mint immediately!)
    console.debug(
      "[GamePublishingService:publishGame] Creating candy machine with hidden settings..."
    );
    const candyMachine = await this.candyMachineRepository.create(
      wallet,
      candyMachineConfig
    );

    console.debug(
      "[GamePublishingService:publishGame] Candy machine created and ready for unlimited minting: ",
      candyMachine.publicKey
    );

    return {
      collection,
      candyMachine,
    };
  }
}
