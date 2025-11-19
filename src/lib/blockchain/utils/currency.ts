/**
 * Currency conversion utilities for Solana SOL and lamports
 *
 * 1 SOL = 1,000,000,000 lamports
 */

export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Converts SOL to lamports
 * @param sol - Amount in SOL (can include decimals)
 * @returns Amount in lamports as bigint
 * @example solToLamports(1.5) => 1500000000n
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

/**
 * Converts lamports to SOL
 * @param lamports - Amount in lamports
 * @returns Amount in SOL as decimal number
 * @example lamportsToSol(1500000000n) => 1.5
 */
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Formats lamports as a human-readable SOL string
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string with SOL suffix
 * @example formatSol(1500000000n) => "1.50 SOL"
 */
export function formatSol(lamports: bigint | number, decimals: number = 2): string {
  const sol = lamportsToSol(lamports);
  return `${sol.toFixed(decimals)} SOL`;
}

/**
 * Parses a SOL string to lamports
 * @param solString - String representation of SOL amount
 * @returns Amount in lamports as bigint
 * @example parseSolToLamports("1.5") => 1500000000n
 */
export function parseSolToLamports(solString: string): bigint {
  const sol = parseFloat(solString);
  if (isNaN(sol)) {
    throw new Error('Invalid SOL amount');
  }
  return solToLamports(sol);
}
