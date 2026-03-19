import { ShieldCheck, Smartphone } from "lucide-react";
import { formatDeviceSubtitle } from "../../lib/format";
import type { DeviceSummary } from "../../types/device";
import { StatusBadge } from "../ui/StatusBadge";

type DeviceCardProps = {
  activeDeviceSerial: string | null;
  connectionMessage: string;
  device: DeviceSummary | null;
  devices: DeviceSummary[];
  onSelectDevice: (serial: string) => void;
  selectionRequired: boolean;
};

export function DeviceCard({
  activeDeviceSerial,
  connectionMessage,
  device,
  devices,
  onSelectDevice,
  selectionRequired,
}: DeviceCardProps) {
  if (!device && devices.length === 0) {
    return (
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-[20px] bg-surface-soft p-3.5 text-text-muted">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-text">
              No device connected
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {connectionMessage}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-text-muted">
              Cleanroom is monitoring ADB and will refresh when the device set
              changes.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (selectionRequired) {
    return (
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="rounded-[20px] bg-warning/12 p-3.5 text-warning">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-text">
                Select a device before scanning
              </h3>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                {connectionMessage}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-text-muted">
                Cleanroom will only scan and clean the device you explicitly
                select.
              </p>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {devices.map((candidate) => (
              <button
                className="rounded-[22px] border border-line bg-surface-soft p-4 text-left transition hover:border-line-strong hover:bg-panel-soft"
                key={candidate.serial}
                onClick={() => onSelectDevice(candidate.serial)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">
                        {candidate.model}
                      </span>
                      <StatusBadge status={candidate.status} />
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {formatDeviceSubtitle(candidate)}
                    </p>
                  </div>
                  <span className="rounded-[14px] border border-line bg-panel px-3 py-2 text-xs font-medium text-text">
                    Select
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!device) {
    return (
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-[20px] bg-surface-soft p-3.5 text-text-muted">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-text">
              No active device selected
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {connectionMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[28px] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-[16px] bg-primary-strong/12 p-2.5 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-semibold text-text">
                {device.model}
              </h3>
              <StatusBadge status={device.status} />
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {formatDeviceSubtitle(device)}
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-text-muted">
              {device.status === "unauthorized"
                ? "ADB can see the handset, but Android has not authorized this workstation yet. Unlock the phone and accept the USB debugging prompt. Cleanroom will refresh automatically when authorization changes."
                : device.status === "disconnected"
                  ? "The device is visible to ADB but not in a ready state. Reconnect the cable or restart USB debugging. Cleanroom will rescan when the connection state changes."
                  : "Current session is scoped to a single device. System packages remain hidden by default until the scan engine is ready to classify them safely."}
            </p>
            <p className="mt-3 text-sm text-text-muted">{connectionMessage}</p>
          </div>
        </div>

        <div className="space-y-4 lg:w-[320px]">
          {devices.length > 1 ? (
            <div className="rounded-[22px] border border-line bg-surface-soft px-4 py-4">
              <div className="text-sm font-medium text-text">
                Connected devices
              </div>
              <div className="mt-3 grid gap-2">
                {devices.map((candidate) => (
                  <button
                    className={`rounded-[16px] border px-3 py-3 text-left text-sm transition ${
                      candidate.serial === activeDeviceSerial
                        ? "border-primary/40 bg-primary/10 text-text"
                        : "border-line bg-panel text-text-muted hover:bg-panel-soft"
                    }`}
                    key={candidate.serial}
                    onClick={() => onSelectDevice(candidate.serial)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{candidate.model}</span>
                      <StatusBadge status={candidate.status} />
                    </div>
                    <div className="mt-1 text-xs">{candidate.serialMasked}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-[22px] border border-line bg-surface-soft px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-text">
              <ShieldCheck className="h-4 w-4 text-success" />
              Technician guardrails
            </div>
            <ul className="mt-3 grid gap-2 text-sm text-text-muted">
              <li>Launcher removals require explicit review.</li>
              <li>Protected packages stay out of bulk actions.</li>
              <li>Every cleanup step is logged for reporting.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
