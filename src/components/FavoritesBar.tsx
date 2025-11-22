import { useFavorites } from "@/providers/favorites.provider";
import { LibraryGame } from "@/lib/marketplace/game-library.service";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type FavoritesBarProps = {
  games: LibraryGame[];
  onLaunchGame: (game: LibraryGame) => void;
  onDownloadGame: (game: LibraryGame) => void;
  getImageUrl: (url: string) => string;
  onAddClick: () => void;
};

export function FavoritesBar({
  games,
  onLaunchGame,
  onDownloadGame,
  getImageUrl,
  onAddClick,
}: FavoritesBarProps) {
  const { favorites, removeFavorite, canAddMore } = useFavorites();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [gameToDownload, setGameToDownload] = useState<LibraryGame | null>(null);

  // Get favorite games from the library games
  const favoriteGames = games.filter((game) =>
    favorites.includes(game.candyMachinePublicKey)
  );

  const handleGameClick = (game: LibraryGame) => {
    if (game.isInstalled) {
      onLaunchGame(game);
    } else {
      setGameToDownload(game);
    }
  };

  const handleConfirmDownload = () => {
    if (gameToDownload) {
      onDownloadGame(gameToDownload);
      setGameToDownload(null);
    }
  };

  const handleRemove = (e: React.MouseEvent, candyMachinePublicKey: string) => {
    e.stopPropagation();
    removeFavorite(candyMachinePublicKey);
  };

  return (
    <>
      <Dialog
        open={!!gameToDownload}
        onOpenChange={(open) => !open && setGameToDownload(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar Jogo</DialogTitle>
            <DialogDescription>
              O jogo "{gameToDownload?.metadata.name}" não está instalado. Deseja
              baixá-lo agora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGameToDownload(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDownload}>Baixar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex items-center gap-2 rounded-xl bg-neutral-800/50 p-2">
        {/* Favorites Label */}
        <h2 className="text-sm font-medium text-neutral-200">Favoritos</h2>

        {/* Favorite Games */}
        <div className="flex flex-1 items-center gap-2">
          {favoriteGames.map((game) => (
            <div
              key={game.candyMachinePublicKey}
              className="group relative cursor-pointer"
              onMouseEnter={() => setHoveredGame(game.candyMachinePublicKey)}
              onMouseLeave={() => setHoveredGame(null)}
              onClick={() => handleGameClick(game)}
            >
              {/* Game Image */}
              <div className="h-10 w-10 overflow-hidden rounded-md transition-all hover:brightness-110">
                <img
                  src={getImageUrl(game.metadata.image)}
                  alt={game.metadata.name}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Remove Button on Hover */}
              {hoveredGame === game.candyMachinePublicKey && (
                <button
                  onClick={(e) => handleRemove(e, game.candyMachinePublicKey)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 transition-all hover:bg-red-600"
                  aria-label="Remove from favorites"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}

              {/* Tooltip with game name */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {game.metadata.name}
              </div>
            </div>
          ))}

          {/* Empty state placeholders */}
          {favoriteGames.length === 0 && (
            <p className="text-xs text-neutral-500">
              Nenhum favorito ainda. Clique em + para adicionar jogos
            </p>
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={onAddClick}
          disabled={!canAddMore()}
          className={`flex h-10 w-10 items-center justify-center rounded-md border-2 border-dashed transition-all ${
            canAddMore()
              ? "border-neutral-600 hover:border-pink-500 hover:text-pink-500"
              : "cursor-not-allowed border-neutral-700 text-neutral-700"
          }`}
          aria-label="Add favorite"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
