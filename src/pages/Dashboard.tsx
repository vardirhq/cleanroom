import {
  ActivitySquare,
  BellRing,
  ShieldAlert,
  SmartphoneCharging,
} from "lucide-react";
import { DeviceCard } from "../components/device/DeviceCard";
import { ReportPanel } from "../components/report/ReportPanel";
import { useDeviceStore } from "../stores/useDeviceStore";
import { useScanStore } from "../stores/useScanStore";
import { useSettingsStore } from "../stores/useSettingsStore";

export function Dashboard() {
  const device = useDeviceStore((state) => state.device);
  const devices = useDeviceStore((state) => state.devices);
  const activeDeviceSerial = useDeviceStore(
    (state) => state.activeDeviceSerial,
  );
  const bootstrap = useDeviceStore((state) => state.bootstrap);
  const selectDevice = useDeviceStore((state) => state.selectDevice);
  const selectionRequired = useDeviceStore((state) => state.selectionRequired);
  const scanSummary = useScanStore((state) => state.summary);
  const syncFromBootstrap = useScanStore((state) => state.syncFromBootstrap);
  const setActivePage = useSettingsStore((state) => state.setActivePage);
  const setActiveReportId = useSettingsStore(
    (state) => state.setActiveReportId,
  );
  const recentReport = bootstrap?.reports[0] ?? null;

  const metrics = [
    {
      label: "Contaminants detected",
      value: scanSummary.flaggedCount,
      icon: ShieldAlert,
      tone: "text-danger",
    },
    {
      label: "Launcher warnings",
      value: scanSummary.launcherRiskCount,
      icon: SmartphoneCharging,
      tone: "text-warning",
    },
    {
      label: "User packages scanned",
      value: scanSummary.userPackageCount,
      icon: ActivitySquare,
      tone: "text-primary-strong",
    },
    {
      label: "Notification suspects",
      value: scanSummary.notificationSuspectCount,
      icon: BellRing,
      tone: "text-danger",
    },
  ];

  return (
    <div className="workbench-page">
      <section className="page-hero">
        <div className="page-hero__header">
          <div>
            <p className="panel-kicker">Support overview</p>
            <h2 className="page-hero__title">
              Active Android remediation workstation
            </h2>
            <p className="page-hero__description">
              Keep the phone state visible, surface suspicious utilities fast,
              and move only reviewed packages into cleanup. Cleanroom is tuned
              for technician judgement, not blind automation.
            </p>
          </div>
          <div className="page-hero__actions">
            <div className="artifact-chip">
              <ShieldAlert className="h-4 w-4" />
              Human-reviewed cleanup
            </div>
            <div className="artifact-chip">
              <BellRing className="h-4 w-4" />
              Notification-aware scoring
            </div>
          </div>
        </div>
      </section>

      <DeviceCard
        activeDeviceSerial={activeDeviceSerial}
        connectionMessage={
          bootstrap?.app.connectionMessage ?? "Checking ADB state..."
        }
        device={device}
        devices={devices}
        onSelectDevice={(serial) =>
          void selectDevice(serial, syncFromBootstrap)
        }
        selectionRequired={selectionRequired}
      />

      <section className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <div className="flex items-center justify-between">
                <span className="metric-card__label">
                  {metric.label}
                </span>
                <Icon className={`h-5 w-5 ${metric.tone}`} />
              </div>
              <div className="metric-card__value">{metric.value}</div>
              <div className="metric-card__meta">
                {metric.label === "Contaminants detected"
                  ? "Packages that crossed the current contaminant threshold"
                  : metric.label === "Launcher warnings"
                    ? "Apps that could affect home/default app recovery"
                    : metric.label === "User packages scanned"
                      ? "Primary review scope for this support session"
                      : "Live notification-heavy apps worth technician review"}
              </div>
            </article>
          );
        })}
      </section>

      <section className="overview-grid">
        <ReportPanel
          onSelectReport={(reportId) => {
            setActiveReportId(reportId);
            setActivePage("reports");
          }}
          reports={bootstrap?.reports ?? []}
        />

        <div className="dashboard-banner">
          <div className="dashboard-banner__row">
            <div>
              <p className="section-kicker">Operator posture</p>
              <h3 className="dashboard-banner__title">
                What the technician should do next
              </h3>
              <p className="dashboard-banner__copy">
                Start with device readiness, move into table-led scan review,
                and keep cleanup limited to packages you can explain in a
                service record.
              </p>
            </div>
            <div className="tag-row">
              <span className="tag">Review first</span>
              <span className="tag tag--warning">Guardrails visible</span>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card__label">Most recent cleanup</div>
            {recentReport ? (
              <div className="mt-3">
                <h4 className="text-base font-semibold text-text">
                  {recentReport.deviceLabel}
                </h4>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {recentReport.summary}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-text-muted">
                No cleanup reports recorded on this workstation yet.
              </p>
            )}
          </div>

          <div className="device-grid">
            <div className="info-card">
              <div className="info-card__label">Connected devices</div>
              <div className="info-card__value">{devices.length}</div>
              <div className="info-card__copy">
                Active ADB-visible handsets for this bench session
              </div>
            </div>
            <div className="info-card">
              <div className="info-card__label">Active target</div>
              <div className="info-card__value">
                {activeDeviceSerial ? "Selected" : "None"}
              </div>
              <div className="info-card__copy">
                {activeDeviceSerial
                  ? "A device is selected for scan and cleanup"
                  : "Choose a device before technician actions can continue"}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
