import { createContext, use, useState, useEffect } from "react";
import { useUser } from "./user.provider";

const MAX_FAVORITES = 5;

export type FavoritesContext = {
  favorites: string[]; // Array of candyMachinePublicKeys
  addFavorite: (candyMachinePublicKey: string) => boolean;
  removeFavorite: (candyMachinePublicKey: string) => void;
  isFavorite: (candyMachinePublicKey: string) => boolean;
  canAddMore: () => boolean;
  clearFavorites: () => void;
};

const getStorageKey = (walletAddress?: string): string => {
  if (!walletAddress) return "gamex_favorites";
  return `gamex_favorites_${walletAddress}`;
};

const loadFavorites = (walletAddress?: string): string[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(walletAddress));
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("[FavoritesProvider] Error loading favorites:", error);
  }
  return [];
};

const saveFavorites = (favorites: string[], walletAddress?: string) => {
  try {
    localStorage.setItem(getStorageKey(walletAddress), JSON.stringify(favorites));
  } catch (error) {
    console.error("[FavoritesProvider] Error saving favorites:", error);
  }
};

export const favoritesContext = createContext<FavoritesContext>({
  favorites: [],
  addFavorite: () => false,
  removeFavorite: () => {},
  isFavorite: () => false,
  canAddMore: () => true,
  clearFavorites: () => {},
});

export function useFavorites() {
  return use(favoritesContext);
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { wallet } = useUser();
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFavorites(wallet?.address)
  );

  // Load favorites when wallet changes
  useEffect(() => {
    const loaded = loadFavorites(wallet?.address);
    setFavorites(loaded);
    console.debug("[FavoritesProvider] Loaded favorites for wallet:", wallet?.address, loaded);
  }, [wallet?.address]);

  // Save favorites whenever they change
  useEffect(() => {
    saveFavorites(favorites, wallet?.address);
    console.debug("[FavoritesProvider] Favorites updated:", favorites);
  }, [favorites, wallet?.address]);

  const addFavorite = (candyMachinePublicKey: string): boolean => {
    if (favorites.length >= MAX_FAVORITES) {
      console.warn("[FavoritesProvider] Cannot add favorite: limit reached");
      return false;
    }

    if (favorites.includes(candyMachinePublicKey)) {
      console.debug("[FavoritesProvider] Game already in favorites");
      return false;
    }

    setFavorites((prev) => [...prev, candyMachinePublicKey]);
    console.debug("[FavoritesProvider] Added favorite:", candyMachinePublicKey);
    return true;
  };

  const removeFavorite = (candyMachinePublicKey: string) => {
    setFavorites((prev) => prev.filter((id) => id !== candyMachinePublicKey));
    console.debug("[FavoritesProvider] Removed favorite:", candyMachinePublicKey);
  };

  const isFavorite = (candyMachinePublicKey: string): boolean => {
    return favorites.includes(candyMachinePublicKey);
  };

  const canAddMore = (): boolean => {
    return favorites.length < MAX_FAVORITES;
  };

  const clearFavorites = () => {
    setFavorites([]);
    console.debug("[FavoritesProvider] Cleared all favorites");
  };

  return (
    <favoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        canAddMore,
        clearFavorites,
      }}
    >
      {children}
    </favoritesContext.Provider>
  );
}
