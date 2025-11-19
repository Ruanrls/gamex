import { PublicKey } from "@solana/web3.js";

/**
 * Validates if a string is a valid Solana public key address
 *
 * @param input - The string to validate
 * @returns true if the input is a valid Solana address, false otherwise
 *
 * @example
 * ```typescript
 * isSolanaAddress("11111111111111111111111111111111") // true
 * isSolanaAddress("minecraft") // false
 * isSolanaAddress("invalid-address") // false
 * ```
 */
export function isSolanaAddress(input: string): boolean {
  if (!input || input.trim().length === 0) {
    return false;
  }

  try {
    new PublicKey(input.trim());
    return true;
  } catch {
    return false;
  }
}
