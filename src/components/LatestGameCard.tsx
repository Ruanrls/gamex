import type { CreateGameResponse } from "@/lib/api/types";

export type LatestGameCardProps = {
  game: CreateGameResponse;
  onCardClick: (game: CreateGameResponse) => void;
  size?: "large" | "small";
};

export function LatestGameCard({
  game,
  onCardClick,
  size = "small",
}: LatestGameCardProps) {
  // Extract CID from IPFS URL
  const extractCidFromUrl = (input: string): string => {
    const patterns = [
      /ipfs\/([a-zA-Z0-9]+)/,
      /^(Qm[a-zA-Z0-9]{44}|bafybei[a-z2-7]{52}|bafy[a-z2-7]+)$/,
      /([a-zA-Z0-9]+)\.ipfs/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return input.trim();
  };

  const getLocalImageUrl = (imageUrl: string): string => {
    const cid = extractCidFromUrl(imageUrl);
    return `http://127.0.0.1:8080/ipfs/${cid}`;
  };

  const isLarge = size === "large";

  return (
    <div
      onClick={() => onCardClick(game)}
      className={`group relative overflow-hidden rounded-2xl bg-neutral-800 transition-shadow hover:shadow-xl cursor-pointer ${
        isLarge ? "h-full" : ""
      }`}
    >
      {/* Game Image */}
      <div
        className={`w-full overflow-hidden bg-neutral-700 ${
          isLarge ? "h-full" : "aspect-[16/9]"
        }`}
      >
        <img
          src={getLocalImageUrl(game.image_url)}
          alt={game.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            // Fallback for broken images
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Game Title Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 py-3">
        <h3
          className={`truncate font-semibold text-white ${
            isLarge ? "text-lg" : "text-sm"
          }`}
        >
          {game.name}
        </h3>
      </div>
    </div>
  );
}
