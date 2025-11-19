import { CandyMachineRepository } from "../blockchain/domain/repositories/candy-machine.repository";
import { CollectionRepository } from "../blockchain/domain/repositories/collection.repository";
import { GameMintingService } from "../blockchain/services/game-minting.service";
import { GameMetadata } from "../blockchain/domain/value-objects/game-metadata.vo";
import { Wallet } from "../blockchain/wallet";

export type MarketplaceGame = {
  candyMachineAddress: string;
  collectionAddress: string;
  metadata: GameMetadata;
  price: number;
  itemsAvailable: number;
  canPurchase: boolean;
};

export type PurchaseResult = {
  assetPublicKey: string;
  transactionSignature?: string;
};

export class GameMarketplaceService {
  private candyMachineRepository: CandyMachineRepository;
  private collectionRepository: CollectionRepository;
  private gameMintingService: GameMintingService;

  constructor() {
    this.candyMachineRepository = new CandyMachineRepository();
    this.collectionRepository = new CollectionRepository();
    this.gameMintingService = new GameMintingService();
  }

  /**
   * Fetches game information by candy machine address
   * @param candyMachineAddress The candy machine address of the game
   * @returns Marketplace game with metadata and pricing info
   */
  async getGameByAddress(candyMachineAddress: string): Promise<MarketplaceGame | null> {
    try {
      console.debug(
        `[GameMarketplaceService:getGameByAddress] Fetching game for candy machine:`,
        candyMachineAddress
      );

      // Fetch candy machine
      const candyMachine = await this.candyMachineRepository.findByPublicKey(
        candyMachineAddress
      );

      console.debug(
        `[GameMarketplaceService:getGameByAddress] Candy machine found:`,
        candyMachine.publicKey
      );

      // Get collection address from candy machine
      const collectionAddress = candyMachine.collection.toString();

      console.debug(
        `[GameMarketplaceService:getGameByAddress] Fetching collection:`,
        collectionAddress
      );

      // Fetch collection metadata
      const collection = await this.collectionRepository.findByPublicKey(
        collectionAddress
      );

      console.debug(
        `[GameMarketplaceService:getGameByAddress] Collection metadata fetched for game: ${collection.metadata.name}`
      );

      // For MVP, price is fixed (can be enhanced later to read from candy machine config)
      // Using a default price of 299.90 BRL as shown in the design
      const price = 299.9;

      return {
        candyMachineAddress: candyMachine.publicKey.toString(),
        collectionAddress: collectionAddress,
        metadata: collection.metadata.toJSON(),
        price: price,
        itemsAvailable: candyMachine.getItemsAvailable(),
        canPurchase: candyMachine.canMint(),
      };
    } catch (error) {
      console.error(
        `[GameMarketplaceService:getGameByAddress] Error fetching game:`,
        error
      );
      return null;
    }
  }

  /**
   * Purchases a game by minting from the candy machine
   * @param candyMachineAddress The candy machine address to mint from
   * @param wallet The buyer's wallet
   * @returns Purchase result with asset public key
   */
  async purchaseGame(
    candyMachineAddress: string,
    wallet: Wallet
  ): Promise<PurchaseResult> {
    try {
      console.debug(
        `[GameMarketplaceService:purchaseGame] Purchasing game from candy machine:`,
        candyMachineAddress
      );

      const result = await this.gameMintingService.mintFromCandyMachine(
        candyMachineAddress,
        wallet
      );

      console.debug(
        `[GameMarketplaceService:purchaseGame] Game purchased successfully. Asset:`,
        result.asset.publicKey
      );

      return {
        assetPublicKey: result.asset.publicKey.toString(),
      };
    } catch (error) {
      console.error(
        `[GameMarketplaceService:purchaseGame] Error purchasing game:`,
        error
      );
      throw new Error(`Falha ao comprar o jogo: ${error}`);
    }
  }
}
