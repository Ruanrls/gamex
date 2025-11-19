import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export type GameCardProps = {
  title: string;
  imageUrl: string;
  isInstalled: boolean;
  onLaunch: () => void;
  onDownload: () => void;
};

export function GameCard({
  title,
  imageUrl,
  isInstalled,
  onLaunch,
  onDownload,
}: GameCardProps) {
  const handleClick = () => {
    if (isInstalled) {
      onLaunch();
    } else {
      onDownload();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-neutral-800 transition-all hover:scale-105 hover:shadow-xl"
    >
      {/* Game Image */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-700">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-110"
          onError={(e) => {
            // Fallback for broken images
            const target = e.target as HTMLImageElement;
            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23374151' width='400' height='533'/%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Hover Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100",
          "backdrop-blur-sm"
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

      {/* Title Bar at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-3">
        <h3 className="truncate text-sm font-medium text-white">{title}</h3>
      </div>
    </div>
  );
}
