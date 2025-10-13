import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import connection from "./connection";

/**
 * Create a configured Umi instance with all required programs registered
 */
export function createConfiguredUmi() {
  const umi = createUmi(connection.rpcEndpoint);

  // Register Metaplex programs
  umi.use(mplCore());
  umi.use(mplCandyMachine());

  return umi;
}
