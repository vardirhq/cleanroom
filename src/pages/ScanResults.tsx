import { Search } from "lucide-react";
import { ContaminantCard } from "../components/scan/ContaminantCard";
import { ScanResultsTable } from "../components/scan/ScanResultsTable";
import { EmptyState } from "../components/ui/EmptyState";
import { StateNotice } from "../components/ui/StateNotice";
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
  const bootstrapError = useDeviceStore((state) => state.bootstrapError);
  const bootstrapStatus = useDeviceStore((state) => state.bootstrapStatus);
  const selectionRequired = useDeviceStore((state) => state.selectionRequired);
  const metadataProgress = useScanStore((state) => state.metadataProgress);
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
      <StateNotice
        description="Multiple devices are connected. Choose the active phone from Dashboard before loading a scan."
        title="Device selection required"
        tone="warning"
      />
    );
  }

  if (bootstrapStatus === "error") {
    return (
      <StateNotice
        description={
          bootstrapError ??
          "The current device session failed to load. Refresh device state and retry."
        }
        title="Scan bootstrap failed"
        tone="error"
      />
    );
  }

  if (!device || device.status !== "ready" || installedPackages.length === 0) {
    return (
      <StateNotice
        description="No package inventory is available yet. Connect an authorized Android device, or finish device authorization, then refresh device state to pull installed packages."
        title="No package inventory loaded"
        tone={bootstrapStatus === "loading" ? "loading" : "info"}
      />
    );
  }

  return (
    <div className="workbench-page">
      <section className="page-hero">
        <div className="page-hero__header">
          <div className="max-w-4xl">
            <p className="panel-kicker">Review queue</p>
            <h2 className="page-hero__title">
              Scan results and operator selection
            </h2>
            <p className="page-hero__description">
              Keep the table as the source of truth, then carry only reviewed
              packages into cleanup. Flagged contaminants surface above the
              table, while advisory items stay visible below for manual
              judgement.
            </p>
          </div>
          <div className="page-hero__actions">
            <button
              className="ui-button"
              onClick={selectAllFlagged}
              type="button"
            >
              Select visible flagged
            </button>
            <button
              className="ui-button ui-button--ghost"
              onClick={clearSelection}
              type="button"
            >
              Clear
            </button>
            <div className="artifact-chip">
              {selectedPackageIds.length} selected · {selectedVisibleCount}{" "}
              visible
            </div>
          </div>
        </div>
      </section>

      <section className="filter-bar">
        <div className="filter-grid">
          <label className="search-field">
            <Search className="search-field__icon h-4 w-4" />
            <input
              className="ui-input"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search app name, package, reason, or category"
              type="search"
              value={searchQuery}
            />
          </label>
          <select
            className="ui-select"
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
            className="ui-select"
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
            className="ui-select"
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
            className="ui-select"
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
            className="ui-button ui-button--ghost"
            onClick={clearFilters}
            type="button"
          >
            Reset filters
          </button>
        </div>

        <p className="text-sm text-text-muted">
          Showing {visiblePackages.length} of {installedPackages.length}{" "}
          packages in the current review view. {summary.userPackageCount} user ·{" "}
          {summary.systemPackageCount} system/OEM.{" "}
          {summary.snapshotSource === "session_cache"
            ? "Session cache reused."
            : "Live device scan."}
        </p>
      </section>

      {metadataProgress.inFlight ? (
        <StateNotice
          description={`Resolved ${metadataProgress.completed} of ${metadataProgress.total} package metadata records. Labels and icons will continue to improve while you review the current table.`}
          title="Metadata enrichment is still running"
          tone="loading"
        />
      ) : null}

      {visibleContaminants.length > 0 ? (
        <section className="contaminant-grid">
          {visibleContaminants.map((item) => (
            <ContaminantCard item={item} key={item.packageName} />
          ))}
        </section>
      ) : advisoryItems.length > 0 ? (
        <StateNotice
          description={`${advisoryItems.length} package${advisoryItems.length === 1 ? " has" : "s have"} suspicious signals, but none crossed the contaminant threshold yet. Review the advisory entries in the table below before cleanup.`}
          title="No contaminants crossed the threshold"
          tone="warning"
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
