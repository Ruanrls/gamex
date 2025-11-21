import type { CreateGameRequest, CreateGameResponse, ApiErrorResponse } from './types';

/**
 * Service for interacting with the GameX backend API
 */
export class GameApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Creates a new game record in the database
   *
   * @param gameData - The game data to store
   * @returns The created game record with database ID
   * @throws Error if the API request fails
   */
  async createGame(gameData: CreateGameRequest): Promise<CreateGameResponse> {
    try {
      console.log('[API] Creating game with data:', gameData);
      console.log('[API] Price lamports being sent:', gameData.price_lamports);

      const response = await fetch(`${this.baseUrl}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });

      console.log('[API] Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Failed to create game: ${response.status} ${response.statusText}`;

        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If parsing error response fails, use the default message
        }

        throw new Error(errorMessage);
      }

      const createdGame: CreateGameResponse = await response.json();
      console.log('[API] Game created successfully:', createdGame);
      console.log('[API] Price lamports in response:', createdGame.price_lamports);
      return createdGame;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error('API request failed: Unknown error');
    }
  }

  /**
   * Gets all games from the database
   *
   * @returns Array of all games
   */
  async getAllGames(): Promise<CreateGameResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/games`);

      if (!response.ok) {
        throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
      }

      const games: CreateGameResponse[] = await response.json();
      return games;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error('API request failed: Unknown error');
    }
  }

  /**
   * Searches games by name
   *
   * @param query - Search query string
   * @returns Array of matching games
   */
  async searchGames(query: string): Promise<CreateGameResponse[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/games/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to search games: ${response.status} ${response.statusText}`);
      }

      const games: CreateGameResponse[] = await response.json();
      return games;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error('API request failed: Unknown error');
    }
  }
}

class GameApiServiceManager {
  private service: GameApiService;
  private currentUrl: string;

  constructor(url: string) {
    this.currentUrl = url;
    this.service = new GameApiService(url);
  }

  getService(): GameApiService {
    return this.service;
  }

  updateUrl(url: string): void {
    if (url !== this.currentUrl) {
      console.debug(`[GameApiServiceManager] Updating API URL from ${this.currentUrl} to ${url}`);
      this.currentUrl = url;
      this.service = new GameApiService(url);
    }
  }
}

// Export a singleton instance with configuration from environment
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000';
const gameApiServiceManager = new GameApiServiceManager(apiUrl);

// Export the service for backward compatibility
export const gameApiService = gameApiServiceManager.getService();

// Export the manager for updating the service
export { gameApiServiceManager };
