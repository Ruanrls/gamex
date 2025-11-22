import { Download, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type GameCardProps = {
  title: string;
  imageUrl: string;
  categories?: string[];
  isInstalled: boolean;
  isAvailable?: boolean;
  unavailabilityReason?: string;
  onLaunch: () => void;
  onDownload: () => void;
  onUninstall?: () => void;
};

export function GameCard({
  title,
  imageUrl,
  categories = [],
  isInstalled,
  isAvailable = true,
  unavailabilityReason,
  onLaunch,
  onDownload,
  onUninstall,
}: GameCardProps) {
  const handleClick = () => {
    // Don't allow interactions if game is unavailable
    if (!isAvailable) return;

    if (isInstalled) {
      onLaunch();
    } else {
      onDownload();
    }
  };

  const handleUninstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onUninstall?.();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-neutral-800 transition-all",
        isAvailable
          ? "cursor-pointer hover:scale-105 hover:shadow-xl"
          : "opacity-60 cursor-not-allowed"
      )}
      title={!isAvailable ? unavailabilityReason : undefined}
    >
      {/* Game Image */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-700">
        <img
          src={imageUrl}
          alt={title}
          className={cn(
            "h-full w-full object-cover transition-transform",
            isAvailable && "group-hover:scale-110"
          )}
          onError={(e) => {
            // Fallback for broken images
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23374151' width='400' height='533'/%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Unavailable Badge */}
      {!isAvailable && (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 shadow-lg">
          <AlertCircle className="h-4 w-4 text-white" />
          <span className="text-xs font-semibold text-white">Indisponível</span>
        </div>
      )}

      {/* Trash Icon (only shown when installed) */}
      {isInstalled && onUninstall && (
        <button
          onClick={handleUninstall}
          className="absolute right-3 top-3 z-20 cursor-pointer rounded-full bg-black/70 p-2 opacity-0 transition-all hover:bg-red-600 group-hover:opacity-100 pointer-events-auto"
          aria-label="Uninstall game"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Hover Overlay (only shown when available) */}
      {isAvailable && (
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100",
            "pointer-events-none backdrop-blur-sm"
          )}
        >
          {isInstalled ? (
            <div className="text-center">
              <p className="text-3xl font-bold text-white">Iniciar</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Download className="h-12 w-12 text-white" />
              <p className="text-lg font-semibold text-white">Download</p>
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="absolute bottom-8 left-0 right-0 px-3">
          <div className="flex flex-wrap justify-center gap-1 py-1.5 rounded-lg">
            {categories.slice(0, 2).map((category) => (
              <Badge key={category} className="text-xs font-semibold shadow-md">
                {category}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge
                variant="secondary"
                className="text-xs font-semibold shadow-md"
              >
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Title Bar at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-3">
        <h3 className="truncate text-sm font-medium text-white">{title}</h3>
      </div>
    </div>
  );
}
