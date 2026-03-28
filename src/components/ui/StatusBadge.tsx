import type { DeviceStatus } from "../../types/device";

type StatusBadgeProps = {
  status: DeviceStatus;
};

const statusStyles: Record<DeviceStatus, string> = {
  disconnected: "",
  unauthorized: "status-badge--unauthorized",
  ready: "status-badge--ready",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
