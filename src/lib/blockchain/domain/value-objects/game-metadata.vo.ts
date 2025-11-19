export type GameMetadata = {
  name: string;
  description: string;
  image: string;
  executables: Record<string, string>; // { "x86_64-pc-windows-msvc": "ipfs://...", ... }
  platforms: string[]; // ["x86_64-pc-windows-msvc", "aarch64-apple-darwin", ...]
};

export class GameMetadataVO {
  private constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly image: string,
    public readonly executables: Record<string, string>,
    public readonly platforms: string[]
  ) {}

  static create(data: GameMetadata): GameMetadataVO {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Game name is required");
    }

    if (!data.description || data.description.trim().length === 0) {
      throw new Error("Game description must be at least 1 character");
    }

    if (!data.image || !data.image.startsWith("http")) {
      throw new Error("Valid image URL is required");
    }

    if (!data.executables || Object.keys(data.executables).length === 0) {
      throw new Error("At least one executable is required");
    }

    // Validate each executable URL
    Object.entries(data.executables).forEach(([triple, url]) => {
      if (!url || !url.startsWith("http")) {
        throw new Error(`Valid executable URL is required for ${triple}`);
      }
    });

    // Validate platforms array matches executables keys
    const executableKeys = Object.keys(data.executables).sort();
    const platforms = data.platforms.sort();

    if (JSON.stringify(executableKeys) !== JSON.stringify(platforms)) {
      throw new Error("Platforms array must match executables keys");
    }

    // Check for duplicate target triples (max 1 per triple)
    const uniqueTriples = new Set(data.platforms);
    if (uniqueTriples.size !== data.platforms.length) {
      throw new Error("Duplicate target triples are not allowed");
    }

    return new GameMetadataVO(
      data.name.trim(),
      data.description.trim(),
      data.image,
      data.executables,
      data.platforms
    );
  }

  toJSON(): GameMetadata {
    return {
      name: this.name,
      description: this.description,
      image: this.image,
      executables: this.executables,
      platforms: this.platforms,
    };
  }
}
