import { useFavorites } from "@/providers/favorites.provider";
import { LibraryGame } from "@/lib/marketplace/game-library.service";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search } from "lucide-react";

type AddFavoriteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: LibraryGame[];
  getImageUrl: (url: string) => string;
};

export function AddFavoriteDialog({
  open,
  onOpenChange,
  games,
  getImageUrl,
}: AddFavoriteDialogProps) {
  const { favorites, addFavorite, canAddMore } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out games that are already favorites
  const availableGames = useMemo(() => {
    const filtered = games.filter(
      (game) => !favorites.includes(game.candyMachinePublicKey)
    );

    if (!searchQuery.trim()) {
      return filtered;
    }

    return filtered.filter((game) =>
      game.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [games, favorites, searchQuery]);

  const handleAddFavorite = (game: LibraryGame) => {
    const success = addFavorite(game.candyMachinePublicKey);
    if (success) {
      setSearchQuery("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add to Favorites</DialogTitle>
          <DialogDescription>
            {canAddMore()
              ? "Select a game to add to your favorites (max 5)"
              : "You have reached the maximum number of favorites (5)"}
          </DialogDescription>
        </DialogHeader>

        {canAddMore() && (
          <>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Games Grid */}
            <div className="max-h-[50vh] overflow-y-auto">
              {availableGames.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <p className="text-neutral-500">
                    {searchQuery
                      ? "No games found matching your search"
                      : "All your games are already in favorites"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {availableGames.map((game) => (
                    <button
                      key={game.candyMachinePublicKey}
                      onClick={() => handleAddFavorite(game)}
                      className="group relative overflow-hidden rounded-lg transition-all hover:scale-105"
                    >
                      {/* Game Image with 3:4 aspect ratio */}
                      <div className="aspect-[3/4] overflow-hidden rounded-lg">
                        <img
                          src={getImageUrl(game.metadata.image)}
                          alt={game.metadata.name}
                          className="h-full w-full object-cover transition-all group-hover:brightness-110"
                        />
                      </div>

                      {/* Overlay with gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Game Name */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="line-clamp-2 text-sm font-semibold text-white">
                          {game.metadata.name}
                        </h3>
                      </div>

                      {/* Installed Badge */}
                      {game.isInstalled && (
                        <div className="absolute left-2 top-2">
                          <Badge variant="secondary" className="text-xs">
                            Installed
                          </Badge>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
