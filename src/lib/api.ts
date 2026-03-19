import { invoke } from "@tauri-apps/api/core";
import type { AppBootstrap } from "../types/app";
import type {
  CleanupResultRecord,
  PackageMetadataRecord,
} from "../types/package";
import type {
  CleanupSessionReport,
  PdfExportLanguage,
  PdfExportResult,
} from "../types/report";

export async function getAppBootstrap() {
  return invoke<AppBootstrap>("get_app_bootstrap");
}

export async function getDeviceSignature() {
  return invoke<string>("get_device_signature");
}

export async function getPackageMetadata(packageNames: string[]) {
  return invoke<PackageMetadataRecord[]>("get_package_metadata", {
    packageNames,
  });
}

export async function setActiveDevice(serial: string | null) {
  return invoke<void>("set_active_device", { serial });
}

export async function updateAppSettings(input: {
  adbStrategy: "system" | "bundled";
  developerMode: boolean;
  exportDirectory: string | null;
}) {
  return invoke<{
    adbStrategy: "system" | "bundled";
    developerMode: boolean;
    effectiveExportDirectory: string;
    exportDirectory: string | null;
  }>("update_app_settings", input);
}

export async function runCleanup(
  packageNames: string[],
  allowLauncherPackages: boolean,
) {
  return invoke<CleanupResultRecord[]>("run_cleanup", {
    allowLauncherPackages,
    packageNames,
  });
}

export async function getCleanupReport(reportId: string) {
  return invoke<CleanupSessionReport | null>("get_cleanup_report", {
    reportId,
  });
}

export async function exportCleanupReportPdf(
  reportId: string,
  language: PdfExportLanguage,
) {
  return invoke<PdfExportResult>("export_cleanup_report_pdf", {
    language,
    reportId,
  });
}

export async function openLauncherRecoverySettings(
  target: "default_apps" | "home",
) {
  return invoke<string>("open_launcher_recovery_settings", { target });
}
