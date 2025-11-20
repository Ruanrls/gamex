export type GameExecutable = {
  platform: string; // target triple (e.g., "x86_64-pc-windows-msvc")
  url: string; // IPFS URL or gateway URL
};

export type GameMetadata = {
  name: string;
  description: string;
  image: string;
  executables: GameExecutable[];
};

export class GameMetadataVO {
  private constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly image: string,
    public readonly executables: GameExecutable[]
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

    if (!data.executables || data.executables.length === 0) {
      throw new Error("At least one executable is required");
    }

    // Validate each executable
    data.executables.forEach((exec) => {
      if (!exec.platform || exec.platform.trim().length === 0) {
        throw new Error("Platform is required for each executable");
      }
      if (!exec.url || !exec.url.startsWith("http")) {
        throw new Error(`Valid executable URL is required for ${exec.platform}`);
      }
    });

    // Check for duplicate target triples (max 1 per triple)
    const platforms = data.executables.map((e) => e.platform);
    const uniqueTriples = new Set(platforms);
    if (uniqueTriples.size !== platforms.length) {
      throw new Error("Duplicate target triples are not allowed");
    }

    return new GameMetadataVO(
      data.name.trim(),
      data.description.trim(),
      data.image,
      data.executables
    );
  }

  toJSON(): GameMetadata {
    return {
      name: this.name,
      description: this.description,
      image: this.image,
      executables: this.executables,
    };
  }
}
