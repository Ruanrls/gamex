import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { connectionManager } from "./connection";

/**
 * Create a configured Umi instance with all required programs registered
 */
export function createConfiguredUmi() {
  const endpoint = connectionManager.rpcEndpoint;
  console.debug("[createConfiguredUmi] Using RPC endpoint:", endpoint);

  const umi = createUmi(endpoint, {
    commitment: "confirmed",
  });

  // Register Metaplex programs
  umi.use(mplCore());
  umi.use(mplCandyMachine());

  return umi;
}
