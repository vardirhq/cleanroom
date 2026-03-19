import type { LucideIcon } from "lucide-react";
import type { DeviceSummary } from "./device";
import type {
  ContaminantRecord,
  InstalledPackageRecord,
  ScanSummary,
} from "./package";
import type { ReportSummary } from "./report";

export type NavItemId =
  | "dashboard"
  | "scan-results"
  | "cleanup-session"
  | "reports"
  | "settings";

export type NavItem = {
  icon: LucideIcon;
  id: NavItemId;
  label: string;
};

export type AppBootstrap = {
  activeDeviceSerial: string | null;
  app: {
    adbPath: string | null;
    connectionMessage: string;
    deviceCount: number;
    mode: string;
    platform: string;
    rulesVersion: string;
  };
  deviceSelectionRequired: boolean;
  contaminants: ContaminantRecord[];
  device: DeviceSummary | null;
  devices: DeviceSummary[];
  settings: {
    adbStrategy: "system" | "bundled";
    developerMode: boolean;
    effectiveExportDirectory: string;
    exportDirectory: string | null;
  };
  installedPackages: InstalledPackageRecord[];
  reports: ReportSummary[];
  scanSummary: ScanSummary;
};
