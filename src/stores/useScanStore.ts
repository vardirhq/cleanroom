import { create } from "zustand";
import {
  buildCleanupPlan,
  getVisiblePackages,
  type ScanGroupMode,
  type ScanQuickFilter,
  type ScanScopeFilter,
} from "../lib/scanReview";
import type { AppBootstrap } from "../types/app";
import type {
  CleanupPlanSummary,
  ContaminantCategory,
  ContaminantRecord,
  InstalledPackageRecord,
  PackageMetadataRecord,
  ScanSummary,
} from "../types/package";

type ScanStore = {
  categoryFilter: ContaminantCategory | "all";
  cleanupPlan: CleanupPlanSummary;
  contaminants: ContaminantRecord[];
  groupMode: ScanGroupMode;
  installedPackages: InstalledPackageRecord[];
  metadataProgress: {
    completed: number;
    inFlight: boolean;
    total: number;
  };
  quickFilter: ScanQuickFilter;
  searchQuery: string;
  selectedPackageIds: string[];
  scopeFilter: ScanScopeFilter;
  summary: ScanSummary;
  clearFilters: () => void;
  clearSelection: () => void;
  getVisiblePackages: () => InstalledPackageRecord[];
  mergePackageMetadata: (items: PackageMetadataRecord[]) => void;
  setCategoryFilter: (filter: ContaminantCategory | "all") => void;
  setGroupMode: (groupMode: ScanGroupMode) => void;
  setMetadataProgress: (progress: {
    completed: number;
    inFlight: boolean;
    total: number;
  }) => void;
  setQuickFilter: (filter: ScanQuickFilter) => void;
  setSearchQuery: (value: string) => void;
  setScopeFilter: (filter: ScanScopeFilter) => void;
  selectAllFlagged: () => void;
  syncFromBootstrap: (bootstrap: AppBootstrap) => void;
  togglePackageSelection: (packageName: string) => void;
};

const emptySummary: ScanSummary = {
  activeNotificationCount: 0,
  aggressiveChannelCount: 0,
  flaggedCount: 0,
  highImportanceNotificationCount: 0,
  launcherRiskCount: 0,
  notificationSuspectCount: 0,
  protectedCount: 0,
  scannedPackageCount: 0,
  systemPackageCount: 0,
  userPackageCount: 0,
};

const emptyCleanupPlan: CleanupPlanSummary = {
  launcherWarnings: 0,
  protectedCount: 0,
  selectedCount: 0,
};

export const useScanStore = create<ScanStore>((set, get) => ({
  categoryFilter: "all",
  cleanupPlan: emptyCleanupPlan,
  contaminants: [],
  groupMode: "review",
  installedPackages: [],
  metadataProgress: {
    completed: 0,
    inFlight: false,
    total: 0,
  },
  quickFilter: "all",
  searchQuery: "",
  selectedPackageIds: [],
  scopeFilter: "user",
  summary: emptySummary,
  clearFilters: () =>
    set({
      categoryFilter: "all",
      groupMode: "review",
      quickFilter: "all",
      searchQuery: "",
      scopeFilter: "user",
    }),
  clearSelection: () =>
    set((state) => ({
      cleanupPlan: buildCleanupPlan(state.installedPackages, []),
      selectedPackageIds: [],
    })),
  getVisiblePackages: () => {
    const state = get();

    return getVisiblePackages(
      state.installedPackages,
      state.searchQuery,
      state.quickFilter,
      state.scopeFilter,
      state.categoryFilter,
      state.selectedPackageIds,
    );
  },
  mergePackageMetadata: (items) =>
    set((state) => {
      if (items.length === 0) {
        return state;
      }

      const metadataByPackage = new Map(
        items.map((item) => [item.packageName, item]),
      );
      const installedPackages = state.installedPackages.map((item) => {
        const metadata = metadataByPackage.get(item.packageName);
        if (!metadata) {
          return item;
        }

        const name = metadata.name ?? item.name;
        const iconDataUrl = metadata.iconDataUrl ?? item.iconDataUrl;

        return {
          ...item,
          contaminant: item.contaminant
            ? {
                ...item.contaminant,
                iconDataUrl,
                name,
              }
            : null,
          iconDataUrl,
          metadataResolved: true,
          name,
        };
      });
      const contaminants = installedPackages
        .filter((item) => item.contaminant !== null)
        .map((item) => item.contaminant as ContaminantRecord)
        .sort((left, right) => {
          if (right.riskScore !== left.riskScore) {
            return right.riskScore - left.riskScore;
          }

          return left.name.localeCompare(right.name);
        });

      return {
        cleanupPlan: buildCleanupPlan(
          installedPackages,
          state.selectedPackageIds,
        ),
        contaminants,
        installedPackages,
      };
    }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setGroupMode: (groupMode) => set({ groupMode }),
  setMetadataProgress: (metadataProgress) => set({ metadataProgress }),
  setQuickFilter: (quickFilter) => set({ quickFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setScopeFilter: (scopeFilter) => set({ scopeFilter }),
  selectAllFlagged: () =>
    set((state) => {
      const selectedPackageIds = getVisiblePackages(
        state.installedPackages,
        state.searchQuery,
        state.quickFilter,
        state.scopeFilter,
        state.categoryFilter,
        state.selectedPackageIds,
      )
        .filter((item) => item.contaminant !== null && !item.protectedPackage)
        .map((item) => item.packageName);

      return {
        cleanupPlan: buildCleanupPlan(
          state.installedPackages,
          selectedPackageIds,
        ),
        selectedPackageIds,
      };
    }),
  syncFromBootstrap: (bootstrap) => {
    const contaminants = [...bootstrap.contaminants].sort((left, right) => {
      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore;
      }

      return left.name.localeCompare(right.name);
    });

    const installedPackages = [...bootstrap.installedPackages].sort(
      (left, right) => {
        const leftFlagged = Number(left.contaminant !== null);
        const rightFlagged = Number(right.contaminant !== null);
        if (rightFlagged !== leftFlagged) {
          return rightFlagged - leftFlagged;
        }

        if (right.suspicionScore !== left.suspicionScore) {
          return right.suspicionScore - left.suspicionScore;
        }

        if (right.activeNotificationCount !== left.activeNotificationCount) {
          return right.activeNotificationCount - left.activeNotificationCount;
        }

        return left.name.localeCompare(right.name);
      },
    );

    set((state) => {
      const selectedPackageIds = state.selectedPackageIds.filter(
        (packageName) =>
          installedPackages.some((item) => item.packageName === packageName),
      );

      return {
        categoryFilter: "all",
        cleanupPlan: buildCleanupPlan(installedPackages, selectedPackageIds),
        contaminants,
        groupMode: "review",
        installedPackages,
        metadataProgress: {
          completed: 0,
          inFlight: installedPackages.length > 0,
          total: installedPackages.length,
        },
        quickFilter: "all",
        searchQuery: "",
        selectedPackageIds,
        scopeFilter: "user",
        summary: bootstrap.scanSummary,
      };
    });
  },
  togglePackageSelection: (packageName) =>
    set((state) => {
      const selectedPackageIds = state.selectedPackageIds.includes(packageName)
        ? state.selectedPackageIds.filter((value) => value !== packageName)
        : [...state.selectedPackageIds, packageName];

      return {
        cleanupPlan: buildCleanupPlan(
          state.installedPackages,
          selectedPackageIds,
        ),
        selectedPackageIds,
      };
    }),
}));
