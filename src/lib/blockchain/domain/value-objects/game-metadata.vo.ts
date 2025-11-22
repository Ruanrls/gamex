export const GAME_CATEGORIES = [
  "Action",
  "Adventure",
  "RPG",
  "Strategy",
  "Simulation",
  "Puzzle",
  "Horror",
  "Platformer",
  "Shooter",
  "Fighting",
  "Racing",
  "Sports",
  "Casual",
  "Indie",
] as const;

export type GameCategory = typeof GAME_CATEGORIES[number];

export type GameExecutable = {
  platform: string; // target triple (e.g., "x86_64-pc-windows-msvc")
  url: string; // IPFS URL or gateway URL
};

export type GameMetadata = {
  name: string;
  description: string;
  image: string;
  categories: string[];
  executables: GameExecutable[];
};

export class GameMetadataVO {
  private constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly image: string,
    public readonly categories: string[],
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

    if (!data.categories || data.categories.length === 0) {
      throw new Error("At least one category is required");
    }

    if (data.categories.length > 5) {
      throw new Error("Maximum 5 categories allowed");
    }

    // Validate categories are from predefined list
    const invalidCategories = data.categories.filter(
      (cat) => !GAME_CATEGORIES.includes(cat as GameCategory)
    );
    if (invalidCategories.length > 0) {
      throw new Error(`Invalid categories: ${invalidCategories.join(", ")}`);
    }

    // Check for duplicate categories
    const uniqueCategories = new Set(data.categories);
    if (uniqueCategories.size !== data.categories.length) {
      throw new Error("Duplicate categories are not allowed");
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
      data.categories,
      data.executables
    );
  }

  toJSON(): GameMetadata {
    return {
      name: this.name,
      description: this.description,
      image: this.image,
      categories: this.categories,
      executables: this.executables,
    };
  }
}
