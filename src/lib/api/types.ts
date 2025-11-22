/**
 * API request and response types for the GameX backend API
 */

export interface GameExecutable {
  platform: string; // target triple (e.g., "x86_64-pc-windows-msvc")
  url: string; // IPFS URL or gateway URL
}

/**
 * Request payload for creating a new game in the database
 */
export interface CreateGameRequest {
  collection_address: string;
  candy_machine_address: string;
  name: string;
  description: string;
  image_url: string;
  categories: string[];
  executables: GameExecutable[];
  creator: string;
  metadata_uri: string;
  price_lamports: number;
}

/**
 * Response from the backend after creating a game
 */
export interface CreateGameResponse {
  collection_address: string;
  candy_machine_address: string;
  name: string;
  description: string;
  image_url: string;
  categories: string[];
  executables: GameExecutable[];
  creator: string;
  metadata_uri: string;
  price_lamports: number;
  created_at: string;
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
}

/**
 * Filter parameters for searching games
 */
export interface GameFilterParams {
  name?: string;
  categories?: string[];
  minPrice?: number; // in SOL
  maxPrice?: number; // in SOL
}
