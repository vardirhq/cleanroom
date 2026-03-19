import { create } from "zustand";
import { updateAppSettings } from "../lib/api";
import type { AppBootstrap } from "../types/app";
import type { NavItemId } from "../types/app";

type ThemeMode = "dark" | "light" | "system";

type SettingsStore = {
  activePage: NavItemId;
  adbStrategy: "system" | "bundled";
  activeReportId: string | null;
  developerMode: boolean;
  effectiveExportDirectory: string | null;
  exportDirectory: string;
  themeMode: ThemeMode;
  saveOperationalSettings: () => Promise<void>;
  syncFromBootstrap: (bootstrap: AppBootstrap) => void;
  setActivePage: (page: NavItemId) => void;
  setAdbStrategy: (strategy: "system" | "bundled") => void;
  setActiveReportId: (reportId: string | null) => void;
  setDeveloperMode: (value: boolean) => void;
  setExportDirectory: (value: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const storedTheme =
  typeof window !== "undefined"
    ? window.localStorage.getItem("cleanroom.theme-mode")
    : null;

export const useSettingsStore = create<SettingsStore>((set) => ({
  activePage: "dashboard",
  adbStrategy: "system",
  activeReportId: null,
  developerMode: false,
  effectiveExportDirectory: null,
  exportDirectory: "",
  saveOperationalSettings: async () => {
    const state = useSettingsStore.getState();
    const result = await updateAppSettings({
      adbStrategy: state.adbStrategy,
      developerMode: state.developerMode,
      exportDirectory: state.exportDirectory.trim()
        ? state.exportDirectory.trim()
        : null,
    });

    set({
      adbStrategy: result.adbStrategy,
      developerMode: result.developerMode,
      effectiveExportDirectory: result.effectiveExportDirectory,
      exportDirectory: result.exportDirectory ?? "",
    });
  },
  syncFromBootstrap: (bootstrap) =>
    set({
      adbStrategy: bootstrap.settings.adbStrategy,
      developerMode: bootstrap.settings.developerMode,
      effectiveExportDirectory: bootstrap.settings.effectiveExportDirectory,
      exportDirectory: bootstrap.settings.exportDirectory ?? "",
    }),
  themeMode:
    storedTheme === "dark" ||
    storedTheme === "light" ||
    storedTheme === "system"
      ? storedTheme
      : "system",
  setActivePage: (page) => set({ activePage: page }),
  setAdbStrategy: (strategy) => set({ adbStrategy: strategy }),
  setActiveReportId: (activeReportId) => set({ activeReportId }),
  setDeveloperMode: (developerMode) => set({ developerMode }),
  setExportDirectory: (exportDirectory) => set({ exportDirectory }),
  setThemeMode: (themeMode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cleanroom.theme-mode", themeMode);
    }
    set({ themeMode });
  },
}));
