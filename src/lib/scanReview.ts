import type {
  CleanupPlanSummary,
  ContaminantCategory,
  InstalledPackageRecord,
  PackageScope,
} from "../types/package";

export type ScanGroupMode = "none" | "review" | "category";
export type ScanQuickFilter =
  | "all"
  | "flagged"
  | "advisory"
  | "protected"
  | "launcher"
  | "selected";
export type ScanScopeFilter = "all" | PackageScope;

export function buildCleanupPlan(
  installedPackages: InstalledPackageRecord[],
  selectedPackageIds: string[],
): CleanupPlanSummary {
  const selected = installedPackages.filter((item) =>
    selectedPackageIds.includes(item.packageName),
  );

  return {
    launcherWarnings: selected.filter((item) => item.launcherRisk).length,
    protectedCount: selected.filter((item) => item.protectedPackage).length,
    selectedCount: selected.length,
  };
}

export function getVisiblePackages(
  installedPackages: InstalledPackageRecord[],
  searchQuery: string,
  quickFilter: ScanQuickFilter,
  scopeFilter: ScanScopeFilter,
  categoryFilter: ContaminantCategory | "all",
  selectedPackageIds: string[],
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return installedPackages.filter((item) => {
    if (!matchesQuickFilter(item, quickFilter, selectedPackageIds)) {
      return false;
    }

    if (scopeFilter !== "all" && item.scope !== scopeFilter) {
      return false;
    }

    if (
      categoryFilter !== "all" &&
      item.contaminant?.category !== categoryFilter
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      item.name,
      item.packageName,
      item.reasons.join(" "),
      item.contaminant?.category ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function matchesQuickFilter(
  item: InstalledPackageRecord,
  quickFilter: ScanQuickFilter,
  selectedPackageIds: string[],
) {
  switch (quickFilter) {
    case "flagged":
      return item.contaminant !== null;
    case "advisory":
      return item.contaminant === null && item.suspicionScore > 0;
    case "protected":
      return item.protectedPackage;
    case "launcher":
      return item.launcherRisk || item.launcherCandidate;
    case "selected":
      return selectedPackageIds.includes(item.packageName);
    default:
      return true;
  }
}
