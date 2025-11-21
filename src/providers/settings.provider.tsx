import { createContext, use, useState, useEffect } from "react";
import { connectionManager } from "@/lib/blockchain/connection";
import { gameApiServiceManager } from "@/lib/api/game-api.service";

export type AppSettings = {
  solanaCluster: string;
  apiUrl: string;
};

export type SettingsContext = {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetToDefaults: () => void;
  clearSettings: () => void;
};

const STORAGE_KEY = "gamex_settings";

const getDefaultSettings = (): AppSettings => ({
  solanaCluster: import.meta.env.VITE_SOLANA_CLUSTER || "http://localhost:8899",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...getDefaultSettings(), ...parsed };
    }
  } catch (error) {
    console.error("[SettingsProvider] Error loading settings:", error);
  }
  return getDefaultSettings();
};

const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("[SettingsProvider] Error saving settings:", error);
  }
};

export const settingsContext = createContext<SettingsContext>({
  settings: getDefaultSettings(),
  updateSettings: () => {},
  resetToDefaults: () => {},
  clearSettings: () => {},
});

export function useSettings() {
  return use(settingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    // Save settings whenever they change
    saveSettings(settings);
    console.debug("[SettingsProvider] Settings updated:", settings);

    // Update blockchain connection when cluster changes
    connectionManager.updateEndpoint(settings.solanaCluster);

    // Update API service when URL changes
    gameApiServiceManager.updateUrl(settings.apiUrl);
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  };

  const resetToDefaults = () => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    console.debug("[SettingsProvider] Settings reset to defaults");
  };

  const clearSettings = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      const defaults = getDefaultSettings();
      setSettings(defaults);
      console.debug("[SettingsProvider] Settings cleared and reset to defaults");
    } catch (error) {
      console.error("[SettingsProvider] Error clearing settings:", error);
    }
  };

  return (
    <settingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetToDefaults,
        clearSettings,
      }}
    >
      {children}
    </settingsContext.Provider>
  );
}
