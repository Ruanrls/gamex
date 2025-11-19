import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { lamportsToSol } from "@/lib/blockchain/utils/currency";
import type { CreateGameResponse } from "@/lib/api/types";
import { TARGET_TRIPLES, getPlatformFamilies } from "@/lib/platform";

export type MarketplaceGameCardProps = {
  game: CreateGameResponse;
  onCardClick: (game: CreateGameResponse) => void;
  isLoading?: boolean;
};

export function MarketplaceGameCard({
  game,
  onCardClick,
  isLoading = false,
}: MarketplaceGameCardProps) {
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

  // Convert lamports to SOL and format
  const priceInSol = lamportsToSol(game.price_lamports);
  const formattedPrice = priceInSol === 0 ? "Grátis" : `${priceInSol.toFixed(2)} SOL`;

  // Get unique platform families from available platforms (if they exist)
  const platformFamilies = game.platforms ? getPlatformFamilies(game.platforms) : [];
  const platformIcons = platformFamilies.map((family) => {
    // Get any triple of this family to get the icon
    const triple = Object.keys(TARGET_TRIPLES).find(
      (t) => TARGET_TRIPLES[t as keyof typeof TARGET_TRIPLES].platform === family
    );
    return triple ? TARGET_TRIPLES[triple as keyof typeof TARGET_TRIPLES].icon : "";
  });

  return (
    <div
      onClick={() => onCardClick(game)}
      className="group relative overflow-hidden rounded-3xl bg-neutral-800 transition-all hover:scale-105 hover:shadow-xl cursor-pointer"
    >
      {/* Game Image */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-700">
        <img
          src={getLocalImageUrl(game.image_url)}
          alt={game.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-110"
          onError={(e) => {
            // Fallback for broken images
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23374151' width='400' height='533'/%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Platform Badges */}
      {platformIcons.length > 0 && (
        <div className="absolute top-3 right-3 flex gap-1">
          {platformIcons.map((icon, index) => (
            <div
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg backdrop-blur-sm"
              title={`Available for ${platformFamilies[index]}`}
            >
              {icon}
            </div>
          ))}
        </div>
      )}

      {/* Title Bar at Bottom */}
      <div className="absolute bottom-12 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 py-4">
        <h3 className="truncate text-center text-lg font-semibold text-white">
          {game.name}
        </h3>
      </div>

      {/* Price Button at Very Bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onCardClick(game);
          }}
          disabled={isLoading}
          className={cn(
            "h-12 w-full rounded-none rounded-b-3xl text-base font-bold",
            "bg-pink-600 hover:bg-pink-700 active:bg-pink-800",
            "transition-colors duration-200"
          )}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          {isLoading ? "Processando..." : formattedPrice}
        </Button>
      </div>
    </div>
  );
}
