import { env } from "@/config/env";
import { Connection } from "@solana/web3.js";
import { fetch } from '@tauri-apps/plugin-http'

class ConnectionManager {
    private connection: Connection;
    private currentEndpoint: string;

    constructor(endpoint: string) {
        this.currentEndpoint = endpoint;
        this.connection = new Connection(endpoint, { fetch });
    }

    getConnection(): Connection {
        return this.connection;
    }

    updateEndpoint(endpoint: string): void {
        if (endpoint !== this.currentEndpoint) {
            console.debug(`[ConnectionManager] Updating endpoint from ${this.currentEndpoint} to ${endpoint}`);
            this.currentEndpoint = endpoint;
            this.connection = new Connection(endpoint, { fetch });
        }
    }

    get rpcEndpoint(): string {
        return this.connection.rpcEndpoint;
    }
}

const connectionManager = new ConnectionManager(env.solanaCluster);

// Export the connection for backward compatibility
export default connectionManager.getConnection();

// Export the manager for updating the connection
export { connectionManager };