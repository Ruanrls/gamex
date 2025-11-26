import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useUser } from "@/providers/user.provider";
import { useState, useMemo } from "react";
import { MarketplaceGameCard } from "@/components/MarketplaceGameCard";
import { LatestGameCard } from "@/components/LatestGameCard";
import { GameDetailsDialog } from "@/components/GameDetailsDialog";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAllMarketplaceGamesQuery } from "@/hooks/queries/use-all-marketplace-games-query";
import { useMarketplaceSearchQuery } from "@/hooks/queries/use-marketplace-search-query";
import { usePurchaseGameMutation } from "@/hooks/mutations/use-purchase-game-mutation";
import { useDownloadGameMutation } from "@/hooks/mutations/use-download-game-mutation";
import { useDebounce } from "@/hooks/use-debounce";
import type { CreateGameResponse, GameFilterParams } from "@/lib/api/types";

export const Route = createFileRoute("/marketplace")({
  component: RouteComponent,
  beforeLoad(ctx) {
    if (!ctx.context.wallet) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

function RouteComponent() {
  const navigate = useNavigate({ from: "/marketplace" });
  const router = useRouter();
  const { wallet } = useUser();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [purchasedAssetKey, setPurchasedAssetKey] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<CreateGameResponse | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<GameFilterParams>({});

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Debounce filters to avoid excessive API calls
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch all games when not searching
  const {
    data: allGames = [],
    isLoading: isLoadingAll,
    error: errorAll,
  } = useAllMarketplaceGamesQuery();

  // Check if any filters are active
  const hasActiveFilters =
    (debouncedFilters.categories && debouncedFilters.categories.length > 0) ||
    debouncedFilters.minPrice !== undefined ||
    debouncedFilters.maxPrice !== undefined;

  // Search games when query or filters are present
  const {
    data: searchResults = [],
    isLoading: isSearching,
    error: searchError,
  } = useMarketplaceSearchQuery({
    query: debouncedSearchQuery,
    filters: debouncedFilters,
    enabled: debouncedSearchQuery.length > 0 || hasActiveFilters,
  });

  // Determine which data to display
  const games = useMemo(() => {
    return debouncedSearchQuery.length > 0 || hasActiveFilters
      ? searchResults
      : allGames;
  }, [debouncedSearchQuery, hasActiveFilters, searchResults, allGames]);

  // Get the 3 latest games for the featured section
  const latestGames = useMemo(() => {
    // Don't show latest games when searching or filtering
    if (debouncedSearchQuery.length > 0 || hasActiveFilters) {
      return [];
    }
    // Sort by created_at in descending order and take first 3
    return [...allGames]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 3);
  }, [allGames, debouncedSearchQuery, hasActiveFilters]);

  const isLoading =
    debouncedSearchQuery.length > 0 || hasActiveFilters
      ? isSearching
      : isLoadingAll;
  const error =
    debouncedSearchQuery.length > 0 || hasActiveFilters
      ? searchError
      : errorAll;

  const purchaseGameMutation = usePurchaseGameMutation();
  const downloadGameMutation = useDownloadGameMutation();

  const handleCardClick = (game: CreateGameResponse) => {
    setSelectedGame(game);
    setShowDetailsDialog(true);
  };

  const handleBuyFromDialog = async () => {
    if (!wallet || !selectedGame) return;

    // Close details dialog
    setShowDetailsDialog(false);

    purchaseGameMutation.mutate(
      {
        candyMachineAddress: selectedGame.candy_machine_address,
        wallet,
      },
      {
        onSuccess: (result) => {
          console.log("Game purchased successfully:", result.assetPublicKey);
          setPurchasedAssetKey(result.assetPublicKey);
          setShowSuccessDialog(true);
        },
        onError: (err) => {
          console.error("Error purchasing game:", err);
          alert(`Erro ao comprar o jogo: ${err}`);
          // Reopen details dialog if purchase fails
          setShowDetailsDialog(true);
        },
      }
    );
  };

  const getDownloadErrorMessage = (error: Error): string => {
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes("content not available") ||
      errorMessage.includes("no peers found")
    ) {
      return "Jogo indisponível na rede IPFS. Nenhum peer encontrado hospedando este jogo. O conteúdo pode ter sido removido ou está temporariamente indisponível.";
    }

    if (errorMessage.includes("timeout")) {
      return "Tempo limite de download excedido. Verifique sua conexão com a internet.";
    }

    if (errorMessage.includes("not available for your platform")) {
      return error.message; // Keep the original platform-specific message
    }

    return `Erro ao baixar o jogo: ${error.message}`;
  };

  const handleDownloadAfterPurchase = () => {
    if (!wallet || !selectedGame) return;

    console.log(
      "🚀 ~ handleDownloadAfterPurchase ~ selectedGame.executables:",
      selectedGame.executables
    );
    downloadGameMutation.mutate(
      {
        candyMachineAddress: selectedGame.candy_machine_address,
        executables: selectedGame.executables,
        assetPublicKey: purchasedAssetKey,
        walletAddress: wallet.address,
        metadataUri: selectedGame.metadata_uri,
        imageUrl: selectedGame.image_url,
        onProgress: (loaded, total) => {
          console.log(`Download progress: ${loaded}/${total}`);
        },
      },
      {
        onSuccess: () => {
          console.log("Game downloaded successfully");
          alert("Jogo baixado com sucesso!");
          setShowSuccessDialog(false);
          // Invalidate router to ensure fresh data on library page
          router.invalidate();
          navigate({ to: "/library" });
        },
        onError: (err) => {
          console.error("Error downloading game:", err);
          alert(getDownloadErrorMessage(err as Error));
        },
      }
    );
  };

  const handleGoToLibrary = () => {
    setShowSuccessDialog(false);
    // Invalidate router to ensure fresh data on library page
    router.invalidate();
    navigate({ to: "/library" });
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  if (!wallet) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="w-full mt-20">
        <h1 className="text-2xl font-bold font-mono max-w-3xl mx-auto text-center">
          Seja realmente o dono dos seus jogos. Compre, venda e jogue títulos
          sem ter medo de perder seu acesso.
        </h1>
      </div>

      <div className="mb-8 mt-12">
        <h1 className="mb-2 text-3xl font-bold text-white">Marketplace</h1>
        <p className="text-gray-400">Encontre e compre jogos na blockchain</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Filters */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <MarketplaceFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Latest Games Section */}
          {latestGames.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-white">
                Lançamentos Recentes
              </h2>
              <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-5 md:grid-rows-2 w-full mx-auto md:h-142">
                {/* Large featured game - 3 columns × 2 rows */}
                {latestGames[0] && (
                  <div className="md:col-span-3 md:row-span-2">
                    <LatestGameCard
                      game={latestGames[0]}
                      onCardClick={handleCardClick}
                      size="large"
                    />
                  </div>
                )}

                {/* Second game - 2 columns × 1 row */}
                {latestGames[1] && (
                  <div className="md:col-span-2 md:row-span-1">
                    <LatestGameCard
                      game={latestGames[1]}
                      onCardClick={handleCardClick}
                      size="small"
                    />
                  </div>
                )}

                {/* Third game - 2 columns × 1 row */}
                {latestGames[2] && (
                  <div className="md:col-span-2 md:row-span-1">
                    <LatestGameCard
                      game={latestGames[2]}
                      onCardClick={handleCardClick}
                      size="small"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome ou endereço da coleção"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-pink-600 focus:ring-pink-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Limpar busca"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {(debouncedSearchQuery || hasActiveFilters) && (
              <p className="mt-2 text-sm text-gray-400">
                {isSearching
                  ? "Buscando..."
                  : `${games.length} resultado${
                      games.length !== 1 ? "s" : ""
                    } encontrado${games.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-white" />
                <p className="text-gray-400">Carregando jogos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-red-400">
                  {error.message || "Erro ao carregar jogos"}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : games.length === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-xl text-gray-300">
                  {debouncedSearchQuery || hasActiveFilters
                    ? "Nenhum jogo encontrado"
                    : "Nenhum jogo disponível"}
                </p>
                <p className="text-gray-500">
                  {debouncedSearchQuery || hasActiveFilters
                    ? "Tente ajustar os filtros ou buscar por outro termo"
                    : "Seja o primeiro a publicar um jogo!"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {games.map((game) => (
                <MarketplaceGameCard
                  key={game.collection_address}
                  game={game}
                  onCardClick={handleCardClick}
                  isLoading={
                    purchaseGameMutation.isPending &&
                    selectedGame?.collection_address === game.collection_address
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle>Compra Realizada com Sucesso!</DialogTitle>
            <DialogDescription className="text-gray-400">
              Seu jogo foi adquirido e está disponível na sua biblioteca.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-x-2">
            <Button
              onClick={handleDownloadAfterPurchase}
              className="bg-pink-600 hover:bg-pink-700"
              disabled={downloadGameMutation.isPending}
            >
              {downloadGameMutation.isPending ? "Baixando..." : "Download"}
            </Button>
            <Button onClick={handleGoToLibrary} variant="secondary">
              Biblioteca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Game Details Dialog */}
      <GameDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        game={selectedGame}
        onConfirmPurchase={handleBuyFromDialog}
        isLoading={purchaseGameMutation.isPending}
      />
    </div>
  );
}
