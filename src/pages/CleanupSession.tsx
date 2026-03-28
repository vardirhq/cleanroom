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
    (item) => item.launcherRisk,
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
    <div className="workbench-page">
      <section className="page-hero">
        <div className="page-hero__header">
          <div className="max-w-4xl">
            <p className="panel-kicker">Cleanup execution</p>
            <h2 className="page-hero__title">
              Review the plan before anything is removed
            </h2>
            <p className="page-hero__description">
              Cleanup runs package-by-package over ADB. Protected apps, launcher
              risk, and device readiness remain visible here so the technician
              can make the final call.
            </p>
          </div>
          <div className="page-hero__actions">
            <button
              className="ui-button ui-button--danger"
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
        </div>
      </section>

      <CleanupSummaryCard plan={cleanupPlan} />
      <section className="cleanup-grid">
        <div className="workbench-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Execution review</p>
              <h3 className="panel-title mt-3">Selected packages</h3>
              <p className="panel-copy">
                Review the removal set before execution. Uninstall runs
                package-by-package and returns a result record for each package.
              </p>
            </div>
          </div>
        {launcherRiskSelected ? (
          <label className="reason-card mt-5 text-sm text-text-muted">
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
          <div className="inline-actions mt-3">
            <button
              className="ui-button ui-button--ghost"
              onClick={() => void openLauncherRecoverySettings("home")}
              type="button"
            >
              Open home app settings
            </button>
            <button
              className="ui-button ui-button--ghost"
              onClick={() => void openLauncherRecoverySettings("default_apps")}
              type="button"
            >
              Open default apps settings
            </button>
          </div>
        ) : null}
        {protectedSelected ? (
          <div className="reason-card mt-5 text-sm text-text-muted">
            Protected packages are selected in this plan. Remove them from the
            selection before cleanup will enable.
          </div>
        ) : null}
        {selectionRequired ? (
          <div className="reason-card mt-5 text-sm text-text-muted">
            Multiple devices are connected. Choose the active device from
            Dashboard before cleanup can run.
          </div>
        ) : null}
        {!selectionRequired && device?.status !== "ready" ? (
          <div className="reason-card mt-5 text-sm text-text-muted">
            Cleanup is disabled until an authorized ready device is selected.
          </div>
        ) : null}
        {selectedPackages.length > 0 ? (
          <div className="package-list mt-5">
            {selectedPackages.map((item) => (
              <article className="package-row" key={item.packageName}>
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
                        <span className="tag tag--info">
                          Protected
                        </span>
                      ) : null}
                      {item.launcherRisk ? (
                        <span className="tag tag--warning">
                          Launcher risk
                        </span>
                      ) : item.launcherCandidate ? (
                        <span className="tag tag--info">
                          Launcher-capable
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-text-muted">
                      {item.packageName}
                    </div>
                  </div>
                </div>
                <button
                  className="ui-button ui-button--ghost"
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
        </div>

        <div className="grid gap-4">
          <div className="info-card">
            <div className="info-card__label">Execution state</div>
            <div className="info-card__value">
              {selectionRequired
                ? "Blocked"
                : device?.status !== "ready"
                  ? "Waiting"
                  : hasPackages
                    ? "Ready"
                    : "Idle"}
            </div>
            <div className="info-card__copy">
              {cleanupBlocked
                ? "One or more safety conditions are currently blocking execution."
                : "The reviewed cleanup set is ready to run on the active device."}
            </div>
          </div>

          <div className="info-card">
            <div className="info-card__label">Technician checklist</div>
            <div className="mt-3 grid gap-2 text-sm text-text-muted">
              <div>Confirm the correct handset is selected.</div>
              <div>Review launcher and protected-package warnings.</div>
              <div>Use report history to document the outcome.</div>
            </div>
          </div>
        </div>
      </section>
      {cleanupResults.length > 0 ? (
        <section className="workbench-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Result ledger</p>
              <h3 className="panel-title mt-3">Cleanup results</h3>
              <p className="panel-copy">
                {successfulRemovals.length} succeeded, {failedRemovals.length}{" "}
                failed.
              </p>
            </div>
          </div>
          <div className="package-list mt-4">
            {cleanupResults.map((result) => (
              <article
                className={`result-card ${
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
        <div className="reason-card text-sm text-text-muted">
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
