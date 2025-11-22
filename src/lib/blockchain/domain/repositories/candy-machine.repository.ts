import {
  create,
  fetchCandyMachine,
  findCandyGuardPda,
  fetchCandyGuard,
  safeFetchCandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
  some,
  none,
  lamports,
} from "@metaplex-foundation/umi";
import { Wallet } from "../../wallet";
import { CandyMachineEntity } from "../entities/candy-machine.entity";
import { CandyMachineConfigVO } from "../value-objects/candy-machine-config.vo";
import { createConfiguredUmi } from "../../umi-instance";

export interface ICandyMachineRepository {
  create(
    wallet: Wallet,
    config: CandyMachineConfigVO
  ): Promise<CandyMachineEntity>;
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
      hiddenSettings: some({
        name: config.hiddenSettings.name,
        uri: config.hiddenSettings.uri,
        hash: config.hiddenSettings.hash,
      }),
      configLineSettings: none(),
      // Add guards for price configuration
      guards: config.guards?.solPayment
        ? {
            solPayment: some({
              lamports: lamports(config.guards.solPayment.lamports),
              destination: config.guards.solPayment.destination,
            }),
          }
        : undefined,
    });

    await createInstruction.sendAndConfirm(umi);

    console.debug(
      "[CandyMachineRepository:create] fetching candy machine ",
      candyMachineKeypair.publicKey
    );

    const candyMachine = await fetchCandyMachine(
      umi,
      candyMachineKeypair.publicKey
    );
    console.debug("[CandyMachineRepository:create] candy machine created");

    // Fetch the candy guard to get the guards configuration
    const candyGuardPda = findCandyGuardPda(umi, {
      base: candyMachineKeypair.publicKey,
    });

    const candyGuard = await fetchCandyGuard(umi, candyGuardPda);
    console.debug(
      "[CandyMachineRepository:create] candy guard created with guards: ",
      candyGuard.guards
    );

    return CandyMachineEntity.fromAccount(candyMachine, candyGuard);
  }

  async findByPublicKey(
    candyMachinePublicKey: string
  ): Promise<CandyMachineEntity> {
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
      "[CandyMachineRepository:findByPublicKey] candy machine fetched"
    );

    // Fetch the associated candy guard (where guards are actually stored)
    const candyGuardPda = findCandyGuardPda(umi, {
      base: publicKey(candyMachinePublicKey),
    });

    console.debug(
      "[CandyMachineRepository:findByPublicKey] fetching candy guard: ",
      candyGuardPda
    );

    const candyGuard = await safeFetchCandyGuard(umi, candyGuardPda);

    if (candyGuard) {
      console.debug(
        "[CandyMachineRepository:findByPublicKey] candy guard fetched, guards: ",
        candyGuard.guards
      );
    } else {
      console.debug(
        "[CandyMachineRepository:findByPublicKey] no candy guard found (no guards configured)"
      );
    }

    return CandyMachineEntity.fromAccount(candyMachine, candyGuard);
  }
}
