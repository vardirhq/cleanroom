import { Search } from "lucide-react";
import { ContaminantCard } from "../components/scan/ContaminantCard";
import { ScanResultsTable } from "../components/scan/ScanResultsTable";
import { EmptyState } from "../components/ui/EmptyState";
import { useDeviceStore } from "../stores/useDeviceStore";
import { useScanStore } from "../stores/useScanStore";
import type { ContaminantCategory } from "../types/package";

const categoryOptions: Array<{
  label: string;
  value: ContaminantCategory | "all";
}> = [
  { label: "All categories", value: "all" },
  { label: "Fake cleaner", value: "fake_cleaner" },
  { label: "Fake booster", value: "fake_booster" },
  { label: "Fake optimizer", value: "fake_optimizer" },
  { label: "Fake launcher", value: "fake_launcher" },
  { label: "Fake security", value: "fake_security_app" },
  { label: "Ad-spam utility", value: "ad_spam_utility" },
  { label: "Duplicate junk utility", value: "duplicate_junk_utility" },
];

export function ScanResults() {
  const categoryFilter = useScanStore((state) => state.categoryFilter);
  const clearFilters = useScanStore((state) => state.clearFilters);
  const clearSelection = useScanStore((state) => state.clearSelection);
  const getVisiblePackages = useScanStore((state) => state.getVisiblePackages);
  const groupMode = useScanStore((state) => state.groupMode);
  const installedPackages = useScanStore((state) => state.installedPackages);
  const quickFilter = useScanStore((state) => state.quickFilter);
  const searchQuery = useScanStore((state) => state.searchQuery);
  const setCategoryFilter = useScanStore((state) => state.setCategoryFilter);
  const setGroupMode = useScanStore((state) => state.setGroupMode);
  const setQuickFilter = useScanStore((state) => state.setQuickFilter);
  const setSearchQuery = useScanStore((state) => state.setSearchQuery);
  const setScopeFilter = useScanStore((state) => state.setScopeFilter);
  const selectAllFlagged = useScanStore((state) => state.selectAllFlagged);
  const selectedPackageIds = useScanStore((state) => state.selectedPackageIds);
  const scopeFilter = useScanStore((state) => state.scopeFilter);
  const summary = useScanStore((state) => state.summary);
  const togglePackageSelection = useScanStore(
    (state) => state.togglePackageSelection,
  );
  const device = useDeviceStore((state) => state.device);
  const selectionRequired = useDeviceStore((state) => state.selectionRequired);
  const visiblePackages = getVisiblePackages();
  const visibleContaminants = visiblePackages
    .filter((item) => item.contaminant !== null)
    .map(
      (item) => item.contaminant as NonNullable<(typeof item)["contaminant"]>,
    );
  const advisoryItems = visiblePackages.filter(
    (item) => item.contaminant === null && item.suspicionScore > 0,
  );
  const selectedVisibleCount = visiblePackages.filter((item) =>
    selectedPackageIds.includes(item.packageName),
  ).length;

  if (selectionRequired) {
    return (
      <EmptyState
        description="Multiple devices are connected. Choose the active phone from Dashboard before loading a scan."
        title="Device selection required"
      />
    );
  }

  if (!device || device.status !== "ready" || installedPackages.length === 0) {
    return (
      <EmptyState
        description="No package inventory is available yet. Connect an authorized Android device, or finish device authorization, then refresh device state to pull installed packages."
        title="No package inventory loaded"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Review queue
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-text">
              Scan results and operator selection
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Keep the table as the source of truth, then carry only reviewed
              packages into cleanup. Flagged contaminants surface above the
              table, while advisory items stay visible below for manual
              judgement.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-[16px] border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-text transition hover:bg-panel-soft"
              onClick={selectAllFlagged}
              type="button"
            >
              Select visible flagged
            </button>
            <button
              className="rounded-[16px] border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-text transition hover:bg-panel-soft"
              onClick={clearSelection}
              type="button"
            >
              Clear
            </button>
            <div className="rounded-[16px] border border-line bg-panel px-4 py-2.5 text-sm text-text-muted">
              {selectedPackageIds.length} selected · {selectedVisibleCount}{" "}
              visible
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-5">
        <div className="grid gap-4 xl:grid-cols-[1.25fr_repeat(5,minmax(0,auto))] xl:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full rounded-[16px] border border-line bg-surface-soft py-2.5 pl-10 pr-4 text-sm text-text outline-none transition focus:border-primary"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search app name, package, reason, or category"
              type="search"
              value={searchQuery}
            />
          </label>
          <select
            className="rounded-[16px] border border-line bg-surface-soft px-3 py-2.5 text-sm text-text"
            onChange={(event) =>
              setQuickFilter(event.target.value as typeof quickFilter)
            }
            value={quickFilter}
          >
            <option value="all">All rows</option>
            <option value="flagged">Flagged</option>
            <option value="advisory">Advisory</option>
            <option value="protected">Protected</option>
            <option value="launcher">Launcher risk</option>
            <option value="selected">Selected</option>
          </select>
          <select
            className="rounded-[16px] border border-line bg-surface-soft px-3 py-2.5 text-sm text-text"
            onChange={(event) =>
              setCategoryFilter(
                event.target.value as ContaminantCategory | "all",
              )
            }
            value={categoryFilter}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-[16px] border border-line bg-surface-soft px-3 py-2.5 text-sm text-text"
            onChange={(event) =>
              setScopeFilter(event.target.value as "all" | "user" | "system")
            }
            value={scopeFilter}
          >
            <option value="user">User apps only</option>
            <option value="all">All packages</option>
            <option value="system">System / OEM only</option>
          </select>
          <select
            className="rounded-[16px] border border-line bg-surface-soft px-3 py-2.5 text-sm text-text"
            onChange={(event) =>
              setGroupMode(event.target.value as typeof groupMode)
            }
            value={groupMode}
          >
            <option value="review">Group by review state</option>
            <option value="category">Group by category</option>
            <option value="none">No grouping</option>
          </select>
          <button
            className="rounded-[16px] border border-line bg-surface-soft px-4 py-2.5 text-sm font-medium text-text transition hover:bg-panel-soft"
            onClick={clearFilters}
            type="button"
          >
            Reset filters
          </button>
        </div>
        <p className="mt-3 text-sm text-text-muted">
          Showing {visiblePackages.length} of {installedPackages.length}{" "}
          packages in the current review view. {summary.userPackageCount} user ·{" "}
          {summary.systemPackageCount} system/OEM.
        </p>
      </section>

      {visibleContaminants.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {visibleContaminants.map((item) => (
            <ContaminantCard item={item} key={item.packageName} />
          ))}
        </section>
      ) : advisoryItems.length > 0 ? (
        <EmptyState
          description={`${advisoryItems.length} package${advisoryItems.length === 1 ? " has" : "s have"} suspicious signals, but none crossed the contaminant threshold yet. Review the advisory entries in the table below before cleanup.`}
          title="No contaminants crossed the threshold"
        />
      ) : (
        <EmptyState
          description="Installed packages were loaded successfully. No obvious cleaner, booster, optimizer, security, or launcher keyword hits were found in the current review scope."
          title="No suspicious packages flagged"
        />
      )}

      <section>
        <ScanResultsTable
          groupMode={groupMode}
          items={visiblePackages}
          onToggleSelection={togglePackageSelection}
          selectedPackageIds={selectedPackageIds}
        />
      </section>
    </div>
  );
}
