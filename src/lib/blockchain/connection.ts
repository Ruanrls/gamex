import { env } from "@/config/env";
import { Connection } from "@solana/web3.js";
import { fetch } from '@tauri-apps/plugin-http'

const connection = new Connection(env.solanaCluster, {
    fetch
});

export default connection;