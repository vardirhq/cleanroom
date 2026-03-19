export type DeviceStatus = "disconnected" | "unauthorized" | "ready";

export type DeviceSummary = {
  androidVersion: string;
  manufacturer: string;
  model: string;
  serial: string;
  serialMasked: string;
  status: DeviceStatus;
};
