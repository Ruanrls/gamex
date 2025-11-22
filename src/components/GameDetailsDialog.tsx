import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/utils/date-format";
import { lamportsToSol } from "@/lib/blockchain/utils/currency";
import type { CreateGameResponse } from "@/lib/api/types";
import { useState } from "react";

export type GameDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: CreateGameResponse | null;
  onConfirmPurchase: () => void;
  isLoading?: boolean;
};

export function GameDetailsDialog({
  open,
  onOpenChange,
  game,
  onConfirmPurchase,
  isLoading = false,
}: GameDetailsDialogProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedCollection, setCopiedCollection] = useState(false);
  const [copiedCandyMachine, setCopiedCandyMachine] = useState(false);

  if (!game) return null;

  const priceInSol = lamportsToSol(game.price_lamports);
  const formattedPrice =
    priceInSol === 0 ? "Grátis" : `${priceInSol.toFixed(2)} SOL`;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(game.creator);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  const handleCopyCollection = async () => {
    try {
      await navigator.clipboard.writeText(game.collection_address);
      setCopiedCollection(true);
      setTimeout(() => setCopiedCollection(false), 2000);
    } catch (error) {
      console.error("Failed to copy collection address:", error);
    }
  };

  const handleCopyCandyMachine = async () => {
    try {
      await navigator.clipboard.writeText(game.candy_machine_address);
      setCopiedCandyMachine(true);
      setTimeout(() => setCopiedCandyMachine(false), 2000);
    } catch (error) {
      console.error("Failed to copy candy machine address:", error);
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{game.name}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Informações do jogo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Game Thumbnail */}
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-neutral-800">
            <img
              src={getLocalImageUrl(game.image_url)}
              alt={game.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect fill='%23374151' width='800' height='450'/%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Description */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              Descrição
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* Categories */}
          {game.categories && game.categories.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-300">
                Categorias
              </h3>
              <div className="flex flex-wrap gap-2">
                {game.categories.map((category) => (
                  <Badge key={category} className="px-3 py-1.5 text-sm">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Developer Address */}
            <div className="rounded-lg bg-neutral-800 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                <User className="h-4 w-4" />
                <span>Desenvolvedor</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-white">
                  {truncateAddress(game.creator)}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copiar endereço completo"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {copiedAddress && (
                  <span className="text-xs text-green-400">Copiado!</span>
                )}
              </div>
            </div>

            {/* Creation Date */}
            <div className="rounded-lg bg-neutral-800 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Data de Publicação</span>
              </div>
              <p className="text-sm text-white">
                {formatDate(game.created_at)}
              </p>
            </div>

            {/* Collection Address */}
            <div className="rounded-lg bg-neutral-800 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                <Copy className="h-4 w-4" />
                <span>Coleção</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-white">
                  {truncateAddress(game.collection_address)}
                </code>
                <button
                  onClick={handleCopyCollection}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copiar endereço completo"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {copiedCollection && (
                  <span className="text-xs text-green-400">Copiado!</span>
                )}
              </div>
            </div>

            {/* Candy Machine Address */}
            <div className="rounded-lg bg-neutral-800 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                <Copy className="h-4 w-4" />
                <span>Candy Machine</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-white">
                  {truncateAddress(game.candy_machine_address)}
                </code>
                <button
                  onClick={handleCopyCandyMachine}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copiar endereço completo"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {copiedCandyMachine && (
                  <span className="text-xs text-green-400">Copiado!</span>
                )}
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="rounded-lg bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-700/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Preço</span>
              <span className="text-2xl font-bold text-white">
                {formattedPrice}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-x-2">
          <Button
            onClick={onConfirmPurchase}
            disabled={isLoading}
            className="bg-pink-600 hover:bg-pink-700 active:bg-pink-800 font-semibold"
          >
            {isLoading ? "Processando..." : "Comprar Agora"}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="secondary"
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
