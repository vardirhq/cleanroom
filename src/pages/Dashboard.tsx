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
    <div className="grid gap-6">
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

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="metric-tile rounded-[24px] p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
                  {metric.label}
                </span>
                <Icon className={`h-5 w-5 ${metric.tone}`} />
              </div>
              <div className="mt-5 text-4xl font-semibold text-text">
                {metric.value}
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <ReportPanel
          onSelectReport={(reportId) => {
            setActiveReportId(reportId);
            setActivePage("reports");
          }}
          reports={bootstrap?.reports ?? []}
        />
        <div className="glass-panel rounded-[28px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
            Operator overview
          </p>
          <div className="mt-4 rounded-[22px] border border-line bg-surface-soft p-5">
            <h3 className="text-lg font-semibold text-text">
              Support-desk posture
            </h3>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-text-muted">
              <p>
                Cleanroom is tuned for deliberate review. High-risk items
                surface first, but removals stay human-owned.
              </p>
              <p>
                The strongest experience should be: device visible, suspicious
                apps easy to scan, and cleanup decisions obvious to explain to
                the next technician.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-[22px] border border-line bg-surface-soft p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
              Most recent cleanup
            </p>
            {recentReport ? (
              <div className="mt-3">
                <h4 className="text-base font-semibold text-text">
                  {recentReport.deviceLabel}
                </h4>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {recentReport.summary}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-text-muted">
                No cleanup reports recorded on this workstation yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
