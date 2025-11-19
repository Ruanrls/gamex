import { mintV1 } from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
  some,
} from "@metaplex-foundation/umi";
import { AssetV1 } from "@metaplex-foundation/mpl-core";
import { Wallet } from "../wallet";
import { CandyMachineRepository } from "../domain/repositories/candy-machine.repository";
import { CandyMachineEntity } from "../domain/entities/candy-machine.entity";
import { createConfiguredUmi } from "../umi-instance";

export interface MintResult {
  asset: AssetV1;
  candyMachine: CandyMachineEntity;
}

export class GameMintingService {
  private candyMachineRepository: CandyMachineRepository;

  constructor() {
    this.candyMachineRepository = new CandyMachineRepository();
  }

  async mintFromCandyMachine(
    candyMachinePublicKey: string,
    buyer: Wallet
  ): Promise<MintResult> {
    console.debug(
      "[GameMintingService:mintFromCandyMachine] Starting minting process for candy machine: ",
      candyMachinePublicKey
    );

    // Fetch candy machine to get collection info
    const candyMachine = await this.candyMachineRepository.findByPublicKey(
      candyMachinePublicKey
    );

    if (!candyMachine.canMint()) {
      throw new Error("Candy machine has no items available to mint");
    }

    console.debug(
      "[GameMintingService:mintFromCandyMachine] Candy machine has ",
      candyMachine.getItemsLoaded(),
      " items loaded"
    );

    const umi = createConfiguredUmi();

    const signer = buyer.toSigner();
    const metaplexSigner = createSignerFromKeypair(umi, {
      publicKey: publicKey(signer.publicKey),
      secretKey: signer.secretKey,
    });

    umi.use(signerIdentity(metaplexSigner));

    // Generate asset keypair
    const assetKeypair = generateSigner(umi);

    console.debug(
      "[GameMintingService:mintFromCandyMachine] Minting asset with keypair: ",
      assetKeypair.publicKey
    );

    // Prepare mintArgs if guards are present
    // Note: SolPaymentMintArgs only requires destination (lamports is omitted)
    const mintArgs = candyMachine.solPaymentGuard
      ? {
          solPayment: some({
            destination: candyMachine.solPaymentGuard.destination,
          }),
        }
      : undefined;

    console.debug(
      "[GameMintingService:mintFromCandyMachine] Mint args: ",
      mintArgs
    );

    // Mint from candy machine
    await mintV1(umi, {
      candyMachine: publicKey(candyMachinePublicKey),
      asset: assetKeypair,
      collection: candyMachine.collection,
      mintArgs,
    }).sendAndConfirm(umi);

    console.debug(
      "[GameMintingService:mintFromCandyMachine] Asset minted successfully"
    );

    // Fetch the minted asset
    const { fetchAsset } = await import("@metaplex-foundation/mpl-core");
    const asset = await fetchAsset(umi, assetKeypair.publicKey);

    return {
      asset,
      candyMachine,
    };
  }

  async getCandyMachineInfo(
    candyMachinePublicKey: string
  ): Promise<CandyMachineEntity> {
    return this.candyMachineRepository.findByPublicKey(candyMachinePublicKey);
  }
}
