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

type ElectronBridge = NonNullable<Window["cleanroom"]>;
type TauriCoreModule = typeof import("@tauri-apps/api/core");
type TauriEventModule = typeof import("@tauri-apps/api/event");
type TauriWindowModule = typeof import("@tauri-apps/api/window");
type TauriOpenerModule = typeof import("@tauri-apps/plugin-opener");

let tauriCorePromise: Promise<TauriCoreModule> | null = null;
let tauriEventPromise: Promise<TauriEventModule> | null = null;
let tauriWindowPromise: Promise<TauriWindowModule> | null = null;
let tauriOpenerPromise: Promise<TauriOpenerModule> | null = null;

function getElectronBridge(): ElectronBridge | null {
  return typeof window !== "undefined" ? window.cleanroom ?? null : null;
}

async function getTauriCore() {
  tauriCorePromise ??= import("@tauri-apps/api/core");
  return tauriCorePromise;
}

async function getTauriEvent() {
  tauriEventPromise ??= import("@tauri-apps/api/event");
  return tauriEventPromise;
}

async function getTauriWindow() {
  tauriWindowPromise ??= import("@tauri-apps/api/window");
  return tauriWindowPromise;
}

async function getTauriOpener() {
  tauriOpenerPromise ??= import("@tauri-apps/plugin-opener");
  return tauriOpenerPromise;
}

async function invokeBackend<T>(
  electronMethod: string,
  tauriMethod: string,
  params?: Record<string, unknown>,
) {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    return electronBridge.invoke<T>(electronMethod, params);
  }

  const { invoke } = await getTauriCore();
  return invoke<T>(tauriMethod, params);
}

async function getCurrentTauriWindow() {
  const { getCurrentWindow } = await getTauriWindow();
  return getCurrentWindow();
}

async function listenToTauriEvent(
  event: string,
  listener: () => void,
) {
  const { listen } = await getTauriEvent();
  const unlisten = await listen(event, () => {
    listener();
  });

  return () => {
    void unlisten();
  };
}

async function openWithTauri(path: string) {
  const { openPath } = await getTauriOpener();
  await openPath(path);
}

async function revealWithTauri(path: string) {
  const { revealItemInDir } = await getTauriOpener();
  await revealItemInDir(path);
}

async function isTauriWindowMaximized() {
  const window = await getCurrentTauriWindow();
  return window.isMaximized();
}

async function onTauriWindowResized(listener: () => void) {
  const window = await getCurrentTauriWindow();
  const unlisten = await window.onResized(() => {
    listener();
  });

  return () => {
    unlisten();
  };
}

async function startTauriWindowDragging() {
  const window = await getCurrentTauriWindow();
  await window.startDragging();
}

async function minimizeTauriWindow() {
  const window = await getCurrentTauriWindow();
  await window.minimize();
}

async function toggleTauriWindowMaximize() {
  const window = await getCurrentTauriWindow();
  await window.toggleMaximize();
}

async function closeTauriWindow() {
  const window = await getCurrentTauriWindow();
  await window.close();
}

export async function getAppBootstrap() {
  return invokeBackend<AppBootstrap>("getAppBootstrap", "get_app_bootstrap");
}

export async function getDeviceSignature() {
  return invokeBackend<string>("getDeviceSignature", "get_device_signature");
}

export async function getPackageMetadata(packageNames: string[]) {
  return invokeBackend<PackageMetadataRecord[]>(
    "getPackageMetadata",
    "get_package_metadata",
    {
      packageNames,
    },
  );
}

export async function setActiveDevice(serial: string | null) {
  return invokeBackend<void>("setActiveDevice", "set_active_device", { serial });
}

export async function updateAppSettings(input: {
  adbStrategy: "system" | "bundled";
  developerMode: boolean;
  exportDirectory: string | null;
}) {
  return invokeBackend<{
    adbStrategy: "system" | "bundled";
    developerMode: boolean;
    effectiveExportDirectory: string;
    exportDirectory: string | null;
  }>("updateAppSettings", "update_app_settings", input);
}

export async function runCleanup(
  packageNames: string[],
  allowLauncherPackages: boolean,
) {
  return invokeBackend<CleanupResultRecord[]>("runCleanup", "run_cleanup", {
    allowLauncherPackages,
    packageNames,
  });
}

export async function getCleanupReport(reportId: string) {
  return invokeBackend<CleanupSessionReport | null>(
    "getCleanupReport",
    "get_cleanup_report",
    {
      reportId,
    },
  );
}

export async function exportCleanupReportPdf(
  reportId: string,
  language: PdfExportLanguage,
) {
  return invokeBackend<PdfExportResult>(
    "exportCleanupReportPdf",
    "export_cleanup_report_pdf",
    {
      language,
      reportId,
    },
  );
}

export async function openLauncherRecoverySettings(
  target: "default_apps" | "home",
) {
  return invokeBackend<string>(
    "openLauncherRecoverySettings",
    "open_launcher_recovery_settings",
    { target },
  );
}

export async function onDeviceStateChanged(listener: () => void) {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    return electronBridge.onDeviceStateChanged(listener);
  }

  return listenToTauriEvent("cleanroom://device-state-changed", listener);
}

export async function openPath(path: string) {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    await electronBridge.openPath(path);
    return;
  }

  await openWithTauri(path);
}

export async function revealItemInDir(path: string) {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    await electronBridge.revealItemInDir(path);
    return;
  }

  await revealWithTauri(path);
}

export async function isWindowMaximized() {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    return electronBridge.window.isMaximized();
  }

  return isTauriWindowMaximized();
}

export async function onWindowResized(listener: () => void) {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    return electronBridge.window.onResized(listener);
  }

  return onTauriWindowResized(listener);
}

export async function startWindowDragging() {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    await electronBridge.window.startDragging();
    return;
  }

  await startTauriWindowDragging();
}

export async function minimizeWindow() {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    await electronBridge.window.minimize();
    return;
  }

  await minimizeTauriWindow();
}

export async function toggleWindowMaximize() {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    await electronBridge.window.toggleMaximize();
    return;
  }

  await toggleTauriWindowMaximize();
}

export async function closeWindow() {
  const electronBridge = getElectronBridge();
  if (electronBridge) {
    await electronBridge.window.close();
    return;
  }

  await closeTauriWindow();
}
