import { arch, platform } from '@tauri-apps/plugin-os';
import type { TargetTriple } from './target-triples';
import { isValidTargetTriple } from './target-triples';

/**
 * Detects the current target triple based on OS and architecture
 */
export async function detectTargetTriple(): Promise<TargetTriple> {
  const currentPlatform = platform();
  const currentArch = arch();

  // Map platform + arch to target triple
  const triple = buildTargetTriple(currentPlatform, currentArch);

  if (!isValidTargetTriple(triple)) {
    throw new Error(
      `Unsupported platform combination: ${currentPlatform} ${currentArch}`
    );
  }

  return triple;
}

/**
 * Build target triple string from platform and architecture
 */
function buildTargetTriple(platform: string, arch: string): string {
  // Windows
  if (platform === 'windows') {
    if (arch === 'x86_64') return 'x86_64-pc-windows-msvc';
    if (arch === 'i686' || arch === 'x86') return 'i686-pc-windows-msvc';
  }

  // macOS
  if (platform === 'macos') {
    if (arch === 'x86_64') return 'x86_64-apple-darwin';
    if (arch === 'aarch64' || arch === 'arm64') return 'aarch64-apple-darwin';
  }

  // Linux
  if (platform === 'linux') {
    if (arch === 'x86_64') return 'x86_64-unknown-linux-gnu';
    if (arch === 'i686' || arch === 'x86') return 'i686-unknown-linux-gnu';
  }

  // Fallback - return the combination as-is
  return `${arch}-${platform}`;
}

/**
 * Check if a game supports the current platform
 */
export async function isGameSupported(
  availableTriples: string[]
): Promise<boolean> {
  try {
    const currentTriple = await detectTargetTriple();
    return availableTriples.includes(currentTriple);
  } catch {
    return false;
  }
}

/**
 * Get the executable URL for the current platform from a game's executables
 */
export async function getExecutableForCurrentPlatform(
  executables: Record<string, string>
): Promise<string | null> {
  try {
    const currentTriple = await detectTargetTriple();
    return executables[currentTriple] || null;
  } catch {
    return null;
  }
}
