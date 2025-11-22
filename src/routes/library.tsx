import { createFileRoute, redirect } from "@tanstack/react-router";
import { useUser } from "@/providers/user.provider";
import { LibraryGame } from "@/lib/marketplace/game-library.service";
import { GameCard } from "@/components/GameCard";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetOwnershipService } from "@/lib/blockchain/services/asset-ownership.service";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { useLibraryGamesQuery } from "@/hooks/queries/use-library-games-query";
import { useDownloadGameMutation } from "@/hooks/mutations/use-download-game-mutation";
import { useUninstallGameMutation } from "@/hooks/mutations/use-uninstall-game-mutation";
import { detectTargetTriple, getExecutableFilename } from "@/lib/platform";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FavoritesBar } from "@/components/FavoritesBar";
import { AddFavoriteDialog } from "@/components/AddFavoriteDialog";

export const Route = createFileRoute("/library")({
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
  // Signal route entry for fresh data loading
  loader: () => {
    return { loadedAt: Date.now() };
  },
});

type LibraryTab = "all" | "installed" | "uninstalled";

function RouteComponent() {
  const { wallet } = useUser();
  const { data: games = [], isLoading, error, refetch } = useLibraryGamesQuery({
    walletAddress: wallet?.address
  });
  const downloadGameMutation = useDownloadGameMutation();
  const uninstallGameMutation = useUninstallGameMutation();
  const [gameToUninstall, setGameToUninstall] = useState<LibraryGame | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [showAddFavoriteDialog, setShowAddFavoriteDialog] = useState(false);

  // Filter games based on active tab
  const filteredGames = useMemo(() => {
    switch (activeTab) {
      case "installed":
        return games.filter((game) => game.isInstalled);
      case "uninstalled":
        return games.filter((game) => !game.isInstalled);
      case "all":
      default:
        return games;
    }
  }, [games, activeTab]);

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

  const handleLaunchGame = async (game: LibraryGame) => {
    if (!wallet) return;

    try {
      console.log("Launching game:", game.metadata.name);

      // Verify ownership before launching
      const ownershipService = new AssetOwnershipService();
      const isOwner = await ownershipService.verifyOwnership(
        game.assetPublicKey,
        wallet.address
      );

      if (!isOwner) {
        alert("Você não possui mais este jogo. Não é possível iniciá-lo.");
        // Refresh library to update UI
        await refetch();
        return;
      }

      // Detect current platform and get executable filename
      const currentTriple = await detectTargetTriple();
      const executableFilename = getExecutableFilename(currentTriple);

      // Get game executable path with platform-specific filename
      const appData = await appDataDir();
      const gamesDir = await join(appData, "games");
      const gameDir = await join(gamesDir, game.candyMachinePublicKey);
      const executablePath = await join(gameDir, executableFilename);

      console.log("Launching executable:", executablePath);

      // Launch the game
      const result = await invoke<string>("execute_game", { path: executablePath });
      console.log("Game launched:", result);
    } catch (err) {
      console.error("Error launching game:", err);
      alert(`Falha ao iniciar o jogo: ${err}`);
    }
  };

  const getDownloadErrorMessage = (error: Error): string => {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes("content not available") || errorMessage.includes("no peers found")) {
      return "Jogo indisponível na rede IPFS. Nenhum peer encontrado hospedando este jogo. O conteúdo pode ter sido removido ou está temporariamente indisponível.";
    }

    if (errorMessage.includes("timeout")) {
      return "Tempo limite de download excedido. Verifique sua conexão com a internet.";
    }

    if (errorMessage.includes("not available for your platform")) {
      return error.message; // Keep the original platform-specific message
    }

    return `Falha ao baixar o jogo: ${error.message}`;
  };

  const handleDownloadGame = async (game: LibraryGame) => {
    if (!wallet) return;

    downloadGameMutation.mutate({
      candyMachineAddress: game.candyMachinePublicKey,
      executables: game.metadata.executables,
      assetPublicKey: game.assetPublicKey,
      walletAddress: wallet.address,
      metadataUri: game.metadataUri,
      imageUrl: game.metadata.image,
      onProgress: (loaded, total) => {
        console.log(`Download progress: ${loaded}/${total}`);
      },
    }, {
      onSuccess: () => {
        console.log("Game downloaded successfully");
      },
      onError: (err) => {
        console.error("Error downloading game:", err);
        alert(getDownloadErrorMessage(err as Error));
      },
    });
  };

  const handleUninstallGame = (game: LibraryGame) => {
    setGameToUninstall(game);
  };

  const confirmUninstall = async () => {
    if (!wallet || !gameToUninstall) return;

    try {
      // Find the executable for the current platform
      const currentTriple = await detectTargetTriple();
      const executable = gameToUninstall.metadata.executables.find(
        (exec) => exec.platform === currentTriple
      );

      if (!executable) {
        alert("Não foi possível encontrar o executável para desinstalar");
        setGameToUninstall(null);
        return;
      }

      uninstallGameMutation.mutate({
        candyMachineAddress: gameToUninstall.candyMachinePublicKey,
        executableUrl: executable.url,
        metadataUri: gameToUninstall.metadataUri,
        imageUrl: gameToUninstall.metadata.image,
        walletAddress: wallet.address,
      }, {
        onSuccess: () => {
          console.log("Game uninstalled successfully");
          setGameToUninstall(null);
        },
        onError: (err) => {
          console.error("Error uninstalling game:", err);
          alert(`Falha ao desinstalar o jogo: ${err}`);
          setGameToUninstall(null);
        },
      });
    } catch (err) {
      console.error("Error during uninstallation:", err);
      alert(`Falha ao desinstalar o jogo: ${err}`);
      setGameToUninstall(null);
    }
  };

  if (!wallet) {
    return null;
  }

  return (
    <>
      <Dialog open={!!gameToUninstall} onOpenChange={(open) => !open && setGameToUninstall(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desinstalar Jogo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desinstalar "{gameToUninstall?.metadata.name}"? Isso irá deletar os arquivos do jogo do seu computador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGameToUninstall(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmUninstall}>
              Desinstalar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddFavoriteDialog
        open={showAddFavoriteDialog}
        onOpenChange={setShowAddFavoriteDialog}
        games={games}
        getImageUrl={getLocalImageUrl}
      />

      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Biblioteca de Jogos</h1>
          <p className="text-gray-400">
            Sua coleção de jogos na blockchain
          </p>
        </div>

        {/* Favorites Bar */}
        {games.length > 0 && (
          <FavoritesBar
            games={games}
            onLaunchGame={handleLaunchGame}
            onDownloadGame={handleDownloadGame}
            getImageUrl={getLocalImageUrl}
            onAddClick={() => setShowAddFavoriteDialog(true)}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LibraryTab)} className="mb-6">
          <TabsList className="bg-neutral-800 border border-neutral-700">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-pink-600 data-[state=active]:text-white"
            >
              Todos ({games.length})
            </TabsTrigger>
            <TabsTrigger
              value="installed"
              className="data-[state=active]:bg-pink-600 data-[state=active]:text-white"
            >
              Instalados ({games.filter(g => g.isInstalled).length})
            </TabsTrigger>
            <TabsTrigger
              value="uninstalled"
              className="data-[state=active]:bg-pink-600 data-[state=active]:text-white"
            >
              Não Instalados ({games.filter(g => !g.isInstalled).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-white" />
            <p className="text-gray-400">Carregando sua biblioteca de jogos...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-red-400">{error.message || "Falha ao carregar sua biblioteca de jogos"}</p>
            <Button onClick={() => refetch()}>Tentar Novamente</Button>
          </div>
        </div>
      ) : games.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="mb-2 text-xl text-gray-300">Nenhum jogo na sua biblioteca</p>
            <p className="text-gray-500">
              Navegue no marketplace para adicionar jogos à sua coleção
            </p>
          </div>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="mb-2 text-xl text-gray-300">
              {activeTab === "installed"
                ? "Nenhum jogo instalado"
                : "Nenhum jogo não instalado"}
            </p>
            <p className="text-gray-500">
              {activeTab === "installed"
                ? "Faça o download de seus jogos para instalá-los"
                : "Todos os seus jogos já estão instalados"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredGames.map((game) => (
            <GameCard
              key={game.assetPublicKey}
              title={game.metadata.name}
              imageUrl={getLocalImageUrl(game.metadata.image)}
              categories={game.metadata.categories}
              isInstalled={game.isInstalled}
              isAvailable={game.isAvailable}
              unavailabilityReason={game.unavailabilityReason}
              onLaunch={() => handleLaunchGame(game)}
              onDownload={() => handleDownloadGame(game)}
              onUninstall={() => handleUninstallGame(game)}
            />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
