/**
 * Supported target triples for game binaries
 * Following Rust/Tauri target triple convention
 */

export type TargetTriple =
  | 'x86_64-pc-windows-msvc'
  | 'i686-pc-windows-msvc'
  | 'x86_64-apple-darwin'
  | 'aarch64-apple-darwin'
  | 'x86_64-unknown-linux-gnu'
  | 'i686-unknown-linux-gnu';

export type PlatformFamily = 'windows' | 'macos' | 'linux';

export interface TargetTripleInfo {
  label: string;
  platform: PlatformFamily;
  arch: string;
  icon: string;
}

export const TARGET_TRIPLES: Record<TargetTriple, TargetTripleInfo> = {
  'x86_64-pc-windows-msvc': {
    label: 'Windows (64-bit)',
    platform: 'windows',
    arch: 'x86_64',
    icon: '🪟',
  },
  'i686-pc-windows-msvc': {
    label: 'Windows (32-bit)',
    platform: 'windows',
    arch: 'i686',
    icon: '🪟',
  },
  'x86_64-apple-darwin': {
    label: 'macOS (Intel)',
    platform: 'macos',
    arch: 'x86_64',
    icon: '🍎',
  },
  'aarch64-apple-darwin': {
    label: 'macOS (Apple Silicon)',
    platform: 'macos',
    arch: 'aarch64',
    icon: '🍎',
  },
  'x86_64-unknown-linux-gnu': {
    label: 'Linux (64-bit)',
    platform: 'linux',
    arch: 'x86_64',
    icon: '🐧',
  },
  'i686-unknown-linux-gnu': {
    label: 'Linux (32-bit)',
    platform: 'linux',
    arch: 'i686',
    icon: '🐧',
  },
};

/**
 * Get file extension for a target triple
 */
export function getExecutableExtension(triple: TargetTriple): string {
  const info = TARGET_TRIPLES[triple];
  return info.platform === 'windows' ? '.exe' : '';
}

/**
 * Get executable filename for a target triple
 */
export function getExecutableFilename(triple: TargetTriple): string {
  return `game-${triple}${getExecutableExtension(triple)}`;
}

/**
 * Get all target triples as array
 */
export function getAllTargetTriples(): TargetTriple[] {
  return Object.keys(TARGET_TRIPLES) as TargetTriple[];
}

/**
 * Get platform families from a list of target triples
 */
export function getPlatformFamilies(triples: string[] | undefined | null): PlatformFamily[] {
  // Handle undefined/null/empty cases
  if (!triples || !Array.isArray(triples) || triples.length === 0) {
    return [];
  }

  const families = new Set<PlatformFamily>();

  triples.forEach(triple => {
    const info = TARGET_TRIPLES[triple as TargetTriple];
    if (info) {
      families.add(info.platform);
    }
  });

  return Array.from(families);
}

/**
 * Validate if a string is a supported target triple
 */
export function isValidTargetTriple(triple: string): triple is TargetTriple {
  return triple in TARGET_TRIPLES;
}
