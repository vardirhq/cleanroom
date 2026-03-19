import { useEffect, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  ShieldAlert,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { CleanupSummaryCard } from "../components/cleanup/CleanupSummaryCard";
import { AppIcon } from "../components/ui/AppIcon";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { runCleanup } from "../lib/api";
import { openLauncherRecoverySettings } from "../lib/api";
import type { CleanupResultRecord } from "../types/package";
import { useDeviceStore } from "../stores/useDeviceStore";
import { useScanStore } from "../stores/useScanStore";

export function CleanupSession() {
  const [cleanupResults, setCleanupResults] = useState<CleanupResultRecord[]>(
    [],
  );
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [launcherRemovalConfirmed, setLauncherRemovalConfirmed] =
    useState(false);
  const cleanupPlan = useScanStore((state) => state.cleanupPlan);
  const installedPackages = useScanStore((state) => state.installedPackages);
  const selectedPackageIds = useScanStore((state) => state.selectedPackageIds);
  const togglePackageSelection = useScanStore(
    (state) => state.togglePackageSelection,
  );
  const loadBootstrap = useDeviceStore((state) => state.loadBootstrap);
  const device = useDeviceStore((state) => state.device);
  const selectionRequired = useDeviceStore((state) => state.selectionRequired);
  const syncFromBootstrap = useScanStore((state) => state.syncFromBootstrap);

  const selectedPackages = installedPackages.filter((item) =>
    selectedPackageIds.includes(item.packageName),
  );
  const launcherRiskSelected = selectedPackages.some(
    (item) => item.launcherCandidate,
  );
  const protectedSelected = selectedPackages.some(
    (item) => item.protectedPackage,
  );
  const hasPackages = selectedPackages.length > 0;
  const cleanupBlocked =
    selectionRequired ||
    device?.status !== "ready" ||
    !hasPackages ||
    isRunningCleanup ||
    protectedSelected ||
    (launcherRiskSelected && !launcherRemovalConfirmed);
  const successfulRemovals = cleanupResults.filter((item) => item.success);
  const failedRemovals = cleanupResults.filter((item) => !item.success);

  useEffect(() => {
    setCleanupResults([]);
    setLauncherRemovalConfirmed(false);
  }, [selectedPackageIds]);

  const executeCleanup = async () => {
    if (!hasPackages || isRunningCleanup) {
      return;
    }

    setIsRunningCleanup(true);
    try {
      const results = await runCleanup(
        selectedPackages.map((item) => item.packageName),
        launcherRemovalConfirmed,
      );
      setCleanupResults(results);
      await loadBootstrap(syncFromBootstrap);
    } finally {
      setIsRunningCleanup(false);
    }
  };

  return (
    <div className="grid gap-6">
      <CleanupSummaryCard plan={cleanupPlan} />
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Execution review
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-text">
              Selected packages
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Review the removal set before execution. Uninstall runs
              package-by-package over ADB and reports each result.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-danger/40 bg-danger/12 px-4 py-2 text-sm font-medium text-text transition hover:bg-danger/18 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={cleanupBlocked}
            onClick={() => void executeCleanup()}
            type="button"
          >
            {isRunningCleanup ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            {isRunningCleanup ? "Running cleanup" : "Run cleanup"}
          </button>
        </div>
        {launcherRiskSelected ? (
          <label className="mt-5 flex items-start gap-3 rounded-[20px] border border-warning/30 bg-warning/8 p-4 text-sm text-text-muted">
            <input
              checked={launcherRemovalConfirmed}
              className="mt-0.5 h-4 w-4 accent-amber-500"
              onChange={(event) =>
                setLauncherRemovalConfirmed(event.target.checked)
              }
              type="checkbox"
            />
            <span>
              I confirm that launcher-like packages are in this plan and the
              device has a safe alternative home app available after cleanup.
            </span>
          </label>
        ) : null}
        {launcherRiskSelected ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="rounded-[14px] border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-text transition hover:bg-panel-soft"
              onClick={() => void openLauncherRecoverySettings("home")}
              type="button"
            >
              Open home app settings
            </button>
            <button
              className="rounded-[14px] border border-line bg-surface-soft px-3.5 py-2.5 text-sm text-text transition hover:bg-panel-soft"
              onClick={() => void openLauncherRecoverySettings("default_apps")}
              type="button"
            >
              Open default apps settings
            </button>
          </div>
        ) : null}
        {protectedSelected ? (
          <div className="mt-5 rounded-[20px] border border-info/30 bg-info/8 p-4 text-sm text-text-muted">
            Protected packages are selected in this plan. Remove them from the
            selection before cleanup will enable.
          </div>
        ) : null}
        {selectionRequired ? (
          <div className="mt-5 rounded-[20px] border border-warning/30 bg-warning/8 p-4 text-sm text-text-muted">
            Multiple devices are connected. Choose the active device from
            Dashboard before cleanup can run.
          </div>
        ) : null}
        {!selectionRequired && device?.status !== "ready" ? (
          <div className="mt-5 rounded-[20px] border border-warning/30 bg-warning/8 p-4 text-sm text-text-muted">
            Cleanup is disabled until an authorized ready device is selected.
          </div>
        ) : null}
        {selectedPackages.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {selectedPackages.map((item) => (
              <article
                className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface-soft p-4 lg:flex-row lg:items-center lg:justify-between"
                key={item.packageName}
              >
                <div className="flex items-start gap-3">
                  <AppIcon
                    iconDataUrl={item.iconDataUrl}
                    name={item.name}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium text-text">
                      <span>{item.name}</span>
                      {item.protectedPackage ? (
                        <span className="rounded-full bg-info/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-info">
                          Protected
                        </span>
                      ) : null}
                      {item.launcherCandidate ? (
                        <span className="rounded-full bg-warning/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-warning">
                          Launcher
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-text-muted">
                      {item.packageName}
                    </div>
                  </div>
                </div>
                <button
                  className="rounded-[16px] border border-line bg-panel px-4 py-2 text-sm font-medium text-text transition hover:bg-panel-soft"
                  onClick={() => togglePackageSelection(item.packageName)}
                  type="button"
                >
                  Remove from plan
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-muted">
            No packages are selected yet. Go to Scan Results and choose the apps
            you want in the cleanup review.
          </p>
        )}
      </section>
      {cleanupResults.length > 0 ? (
        <section className="glass-panel rounded-[28px] p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">
                Cleanup results
              </h3>
              <p className="text-sm text-text-muted">
                {successfulRemovals.length} succeeded, {failedRemovals.length}{" "}
                failed.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {cleanupResults.map((result) => (
              <article
                className={`rounded-[20px] border px-4 py-4 ${
                  result.success
                    ? "border-success/30 bg-success/8"
                    : "border-danger/30 bg-danger/8"
                }`}
                key={`${result.packageName}-${result.success ? "ok" : "err"}`}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  )}
                  <div>
                    <div className="font-medium text-text">
                      {result.packageName || "Cleanup command"}
                    </div>
                    <div className="mt-1 text-sm text-text-muted">
                      {result.message}
                    </div>
                    {result.rollbackGuidance ? (
                      <div className="mt-2 text-xs leading-5 text-text-muted">
                        Rollback guidance: {result.rollbackGuidance}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <ConfirmationModal
        description={
          installedPackages.length === 0
            ? "No live package inventory is loaded yet. Connect an authorized device before attempting cleanup review."
            : selectionRequired
              ? "Multiple devices are connected. Select one active phone from Dashboard before running cleanup."
              : launcherRiskSelected
                ? "One or more selected packages look launcher-related. Removing them can change or break the current home-screen flow until a safe launcher is restored."
                : protectedSelected
                  ? "Protected packages are in the current plan. Cleanroom blocks those removals by default to avoid obvious breakage."
                  : "Cleanup executes through standard ADB package uninstall. Review each selected package carefully before removal."
        }
        title="Launcher risk review"
      />
      {launcherRiskSelected ? (
        <div className="rounded-[18px] border border-warning/30 bg-warning/10 p-4 text-sm text-text-muted">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Launcher-like packages are in the current removal set. Confirm the
              device has a safe alternative home app before uninstalling them.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
