import {
  create,
  fetchCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
  some,
  none,
} from "@metaplex-foundation/umi";
import { Wallet } from "../../wallet";
import { CandyMachineEntity } from "../entities/candy-machine.entity";
import { CandyMachineConfigVO } from "../value-objects/candy-machine-config.vo";
import { createConfiguredUmi } from "../../umi-instance";

export interface ICandyMachineRepository {
  create(wallet: Wallet, config: CandyMachineConfigVO): Promise<CandyMachineEntity>;
  findByPublicKey(publicKey: string): Promise<CandyMachineEntity>;
}

export class CandyMachineRepository implements ICandyMachineRepository {
  async create(
    wallet: Wallet,
    config: CandyMachineConfigVO
  ): Promise<CandyMachineEntity> {
    console.debug(
      "[CandyMachineRepository:create] creating candy machine for ",
      wallet.address,
      " config: ",
      config
    );

    const umi = createConfiguredUmi();

    const signer = wallet.toSigner();
    const metaplexSigner = createSignerFromKeypair(umi, {
      publicKey: publicKey(signer.publicKey),
      secretKey: signer.secretKey,
    });

    umi.use(signerIdentity(metaplexSigner));

    const candyMachineKeypair = generateSigner(umi);
    console.debug(
      "[CandyMachineRepository:create] candy machine keypair generated ",
      candyMachineKeypair.publicKey
    );

    const createInstruction = await create(umi, {
      candyMachine: candyMachineKeypair,
      collection: config.collection,
      collectionUpdateAuthority: metaplexSigner,
      itemsAvailable: config.itemsAvailable,
      authority: config.authority,
      // Use hidden settings for unlimited minting
      hiddenSettings: some({
        name: config.hiddenSettings.name,
        uri: config.hiddenSettings.uri,
        hash: config.hiddenSettings.hash,
      }),
      configLineSettings: none(),
    });

    await createInstruction.sendAndConfirm(umi);

    console.debug(
      "[CandyMachineRepository:create] fetching candy machine ",
      candyMachineKeypair.publicKey
    );

    const candyMachine = await fetchCandyMachine(umi, candyMachineKeypair.publicKey);
    console.debug(
      "[CandyMachineRepository:create] candy machine created ",
      candyMachine
    );

    return CandyMachineEntity.fromAccount(candyMachine);
  }

  async findByPublicKey(candyMachinePublicKey: string): Promise<CandyMachineEntity> {
    console.debug(
      "[CandyMachineRepository:findByPublicKey] fetching candy machine: ",
      candyMachinePublicKey
    );

    const umi = createConfiguredUmi();
    const candyMachine = await fetchCandyMachine(
      umi,
      publicKey(candyMachinePublicKey)
    );

    console.debug(
      "[CandyMachineRepository:findByPublicKey] candy machine fetched: ",
      candyMachine
    );

    return CandyMachineEntity.fromAccount(candyMachine);
  }
}
