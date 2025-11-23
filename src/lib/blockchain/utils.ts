import { PublicKey } from "@solana/web3.js";
import { connectionManager } from "./connection";

type RequestAirdropParams = {
    publicKey: string | PublicKey;
    amount: number;
}

export async function requestAirdrop(params: RequestAirdropParams) {
    const connection = connectionManager.getConnection();
    const signature = await connection.requestAirdrop(
        new PublicKey(params.publicKey),
        params.amount * 1e9 // Convert SOL to lamports
      )

      const recentBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
          blockhash: recentBlockhash.blockhash,
          signature,
      })
}