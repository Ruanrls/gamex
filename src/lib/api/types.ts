/**
 * API request and response types for the GameX backend API
 */

/**
 * Request payload for creating a new game in the database
 */
export interface CreateGameRequest {
  collection_address: string;
  candy_machine_address: string;
  name: string;
  description: string;
  image_url: string;
  executable_url: string;
  creator: string;
  metadata_uri: string;
  price_lamports: number;
}

/**
 * Response from the backend after creating a game
 */
export interface CreateGameResponse {
  _id: string;
  collection_address: string;
  candy_machine_address: string;
  name: string;
  description: string;
  image_url: string;
  executable_url: string;
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
