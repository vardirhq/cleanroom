import type { DeviceStatus } from "../../types/device";

type StatusBadgeProps = {
  status: DeviceStatus;
};

const statusStyles: Record<DeviceStatus, string> = {
  disconnected: "bg-surface-soft text-text-muted border border-line",
  unauthorized: "bg-warning/14 text-warning",
  ready: "bg-success/14 text-success",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
