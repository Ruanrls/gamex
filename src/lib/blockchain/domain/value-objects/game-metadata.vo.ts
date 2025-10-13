export type GameMetadata = {
  name: string;
  description: string;
  image: string;
  executable: string;
};

export class GameMetadataVO {
  private constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly image: string,
    public readonly executable: string
  ) {}

  static create(data: GameMetadata): GameMetadataVO {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Game name is required");
    }

    if (!data.description || data.description.trim().length < 10) {
      throw new Error("Game description must be at least 10 characters");
    }

    if (!data.image || !data.image.startsWith("http")) {
      throw new Error("Valid image URL is required");
    }

    if (!data.executable || !data.executable.startsWith("http")) {
      throw new Error("Valid executable URL is required");
    }

    return new GameMetadataVO(
      data.name.trim(),
      data.description.trim(),
      data.image,
      data.executable
    );
  }

  toJSON(): GameMetadata {
    return {
      name: this.name,
      description: this.description,
      image: this.image,
      executable: this.executable,
    };
  }
}
