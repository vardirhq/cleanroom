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
      <section className="workbench-panel device-card">
        <div className="device-summary">
          <div className="device-summary__mark">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="section-kicker">Device readiness</p>
            <h3 className="device-summary__title">No device connected</h3>
            <p className="device-summary__copy">{connectionMessage}</p>
            <p className="device-summary__subtitle">
              Cleanroom will refresh automatically when the ADB device set
              changes.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (selectionRequired) {
    return (
      <section className="workbench-panel device-card">
        <div className="device-summary">
          <div className="device-summary__mark">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="section-kicker">Device readiness</p>
            <div className="device-summary__title-row">
              <h3 className="device-summary__title">
                Select a device before scanning
              </h3>
              <span className="status-badge status-badge--unauthorized">
                review blocked
              </span>
            </div>
            <p className="device-summary__copy">{connectionMessage}</p>
          </div>
        </div>
        <div className="device-select-grid">
          <div className="device-grid">
            {devices.map((candidate) => (
              <button
                className="device-select-card"
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
                  <span className="ui-button ui-button--ghost">
                    Select
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="info-card">
            <div className="info-card__label">Guardrail</div>
            <div className="info-card__copy">
              Scan and cleanup stay disabled until one handset is explicitly
              chosen for the current support session.
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!device) {
    return (
      <section className="workbench-panel device-card">
        <div className="device-summary">
          <div className="device-summary__mark">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="section-kicker">Device readiness</p>
            <h3 className="device-summary__title">No active device selected</h3>
            <p className="device-summary__copy">{connectionMessage}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="workbench-panel device-card device-card--ready">
      <div className="min-w-0">
        <div className="device-summary">
          <div className="device-summary__mark">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="section-kicker">Active device</p>
            <div className="device-summary__title-row">
              <h3 className="device-summary__title">{device.model}</h3>
              <StatusBadge status={device.status} />
            </div>
            <p className="device-summary__subtitle">
              {formatDeviceSubtitle(device)}
            </p>
            <p className="device-summary__copy">
              {device.status === "unauthorized"
                ? "ADB can see the handset, but Android has not authorized this workstation yet. Unlock the phone and accept the USB debugging prompt."
                : device.status === "disconnected"
                  ? "The device is visible to ADB but not in a ready state. Reconnect the cable or restart USB debugging."
                  : "This session is currently scoped to one device. Review remains focused on user-installed packages by default, with system packages protected from bulk cleanup."}
            </p>
            <p className="device-summary__subtitle">{connectionMessage}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="info-card">
          <div className="info-card__label">Technician guardrails</div>
          <div className="mt-3 grid gap-2 text-sm text-text-muted">
            <div className="flex items-center gap-2 text-text">
              <ShieldCheck className="h-4 w-4 text-success" />
              Launcher removals always require explicit review.
            </div>
            <div>Protected packages stay out of bulk actions.</div>
            <div>Every cleanup action is retained in local reporting.</div>
          </div>
        </div>

        <div className="device-grid">
          <div className="info-card">
            <div className="info-card__label">Connection</div>
            <div className="info-card__value">{devices.length}</div>
            <div className="info-card__copy">
              device{devices.length === 1 ? "" : "s"} visible to this
              workstation
            </div>
          </div>
          <div className="info-card">
            <div className="info-card__label">Target serial</div>
            <div className="info-card__value">{device.serialMasked}</div>
            <div className="info-card__copy">
              Active cleanup target for this support session
            </div>
          </div>
        </div>

        {devices.length > 1 ? (
          <div className="info-card">
            <div className="info-card__label">Connected devices</div>
            <div className="device-select-grid mt-3">
              {devices.map((candidate) => (
                <button
                  className={`device-select-card ${
                    candidate.serial === activeDeviceSerial
                      ? "device-select-card--active"
                      : ""
                  }`}
                  key={candidate.serial}
                  onClick={() => onSelectDevice(candidate.serial)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text">
                      {candidate.model}
                    </span>
                    <StatusBadge status={candidate.status} />
                  </div>
                  <div className="mt-1 text-sm text-text-muted">
                    {candidate.serialMasked}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
