import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GAME_CATEGORIES } from "@/lib/blockchain/domain/value-objects/game-metadata.vo";
import type { GameFilterParams } from "@/lib/api/types";

export type MarketplaceFiltersProps = {
  filters: GameFilterParams;
  onFiltersChange: (filters: GameFilterParams) => void;
  onClearFilters: () => void;
};

export function MarketplaceFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: MarketplaceFiltersProps) {
  const hasActiveFilters =
    (filters.categories && filters.categories.length > 0) ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  const activeFilterCount =
    (filters.categories?.length || 0) +
    (filters.minPrice !== undefined ? 1 : 0) +
    (filters.maxPrice !== undefined ? 1 : 0);

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];

    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  const handleMinPriceChange = (value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    onFiltersChange({
      ...filters,
      minPrice: numValue,
    });
  };

  const handleMaxPriceChange = (value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    onFiltersChange({
      ...filters,
      maxPrice: numValue,
    });
  };

  return (
    <div className="w-full lg:w-64 bg-neutral-900 rounded-xl p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Filtros</h3>
        {hasActiveFilters && (
          <Badge variant="secondary" className="text-xs">
            {activeFilterCount}
          </Badge>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300">
          Preço (SOL)
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Mín"
              value={filters.minPrice ?? ""}
              onChange={(e) => handleMinPriceChange(e.target.value)}
              min="0"
              step="0.01"
              className="h-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Máx"
              value={filters.maxPrice ?? ""}
              onChange={(e) => handleMaxPriceChange(e.target.value)}
              min="0"
              step="0.01"
              className="h-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300">
          Categorias
        </label>
        <div className="space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          {GAME_CATEGORIES.map((category) => {
            const isSelected = filters.categories?.includes(category) || false;
            return (
              <label
                key={category}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCategoryToggle(category)}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-pink-600 focus:ring-pink-600 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  {category}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          onClick={onClearFilters}
          variant="outline"
          size="sm"
          className="w-full border-neutral-700 hover:bg-neutral-800 hover:text-white"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
