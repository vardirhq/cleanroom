import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Activity,
  ClipboardList,
  FileText,
  ScanSearch,
  Settings,
} from "lucide-react";
import { AppShell } from "./app/AppShell";
import { getPackageMetadata } from "./lib/api";
import { Dashboard } from "./pages/Dashboard";
import { ScanResults } from "./pages/ScanResults";
import { CleanupSession } from "./pages/CleanupSession";
import { Reports } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { useDeviceStore } from "./stores/useDeviceStore";
import { useScanStore } from "./stores/useScanStore";
import { useSettingsStore } from "./stores/useSettingsStore";
import type { NavItemId } from "./types/app";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "scan-results", label: "Scan Results", icon: ScanSearch },
  { id: "cleanup-session", label: "Cleanup Session", icon: ClipboardList },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
] satisfies Array<{
  id: NavItemId;
  label: string;
  icon: typeof Activity;
}>;

function App() {
  const deviceRefreshTimeoutRef = useRef<number | null>(null);
  const activePage = useSettingsStore((state) => state.activePage);
  const setActivePage = useSettingsStore((state) => state.setActivePage);
  const syncSettingsFromBootstrap = useSettingsStore(
    (state) => state.syncFromBootstrap,
  );
  const themeMode = useSettingsStore((state) => state.themeMode);
  const loadBootstrap = useDeviceStore((state) => state.loadBootstrap);
  const bootstrap = useDeviceStore((state) => state.bootstrap);
  const bootstrapStatus = useDeviceStore((state) => state.bootstrapStatus);
  const bootstrapError = useDeviceStore((state) => state.bootstrapError);
  const device = useDeviceStore((state) => state.device);
  const selectionRequired = useDeviceStore((state) => state.selectionRequired);
  const metadataProgress = useScanStore((state) => state.metadataProgress);
  const mergePackageMetadata = useScanStore(
    (state) => state.mergePackageMetadata,
  );
  const setMetadataProgress = useScanStore(
    (state) => state.setMetadataProgress,
  );
  const syncFromBootstrap = useScanStore((state) => state.syncFromBootstrap);

  useEffect(() => {
    void loadBootstrap(syncFromBootstrap);
  }, [loadBootstrap, syncFromBootstrap]);

  useEffect(() => {
    if (bootstrap) {
      syncSettingsFromBootstrap(bootstrap);
    }
  }, [bootstrap, syncSettingsFromBootstrap]);

  useEffect(() => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const resolvedTheme =
      themeMode === "system"
        ? systemPrefersDark
          ? "dark"
          : "light"
        : themeMode;

    root.dataset.theme = resolvedTheme;
  }, [themeMode]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;

    const subscribe = async () => {
      unlisten = await listen("cleanroom://device-state-changed", () => {
        if (disposed) {
          return;
        }

        if (deviceRefreshTimeoutRef.current !== null) {
          window.clearTimeout(deviceRefreshTimeoutRef.current);
        }

        deviceRefreshTimeoutRef.current = window.setTimeout(() => {
          if (bootstrapStatus !== "loading") {
            void loadBootstrap(syncFromBootstrap);
          }
        }, 300);
      });
    };

    void subscribe();

    return () => {
      disposed = true;
      if (deviceRefreshTimeoutRef.current !== null) {
        window.clearTimeout(deviceRefreshTimeoutRef.current);
      }
      unlisten?.();
    };
  }, [bootstrapStatus, loadBootstrap, syncFromBootstrap]);

  useEffect(() => {
    if (!bootstrap?.installedPackages.length) {
      setMetadataProgress({ completed: 0, inFlight: false, total: 0 });
      return;
    }

    let cancelled = false;
    let resolvedUncachedMetadata = false;
    const unresolvedPackages = new Set(
      bootstrap.installedPackages
        .filter((item) => !item.metadataResolved)
        .map((item) => item.packageName),
    );
    const prioritizedPackageNames = [...bootstrap.installedPackages]
      .sort((left, right) => {
        const leftPriority =
          Number(left.contaminant !== null) * 100 +
          left.suspicionScore * 10 +
          left.activeNotificationCount;
        const rightPriority =
          Number(right.contaminant !== null) * 100 +
          right.suspicionScore * 10 +
          right.activeNotificationCount;

        return rightPriority - leftPriority;
      })
      .map((item) => item.packageName);

    const enrich = async () => {
      setMetadataProgress({
        completed: 0,
        inFlight: true,
        total: prioritizedPackageNames.length,
      });

      let completed = 0;
      for (let index = 0; index < prioritizedPackageNames.length; index += 10) {
        if (cancelled) {
          return;
        }

        const chunk = prioritizedPackageNames.slice(index, index + 10);
        const metadata = await getPackageMetadata(chunk);
        if (cancelled) {
          return;
        }

        if (metadata.some((item) => unresolvedPackages.has(item.packageName))) {
          resolvedUncachedMetadata = true;
        }
        mergePackageMetadata(metadata);
        completed += chunk.length;
        setMetadataProgress({
          completed,
          inFlight: completed < prioritizedPackageNames.length,
          total: prioritizedPackageNames.length,
        });
      }

      if (!cancelled && resolvedUncachedMetadata) {
        await loadBootstrap(syncFromBootstrap);
      }
    };

    void enrich();

    return () => {
      cancelled = true;
    };
  }, [
    bootstrap,
    loadBootstrap,
    mergePackageMetadata,
    setMetadataProgress,
    syncFromBootstrap,
  ]);

  const refreshBootstrap = () => {
    void loadBootstrap(syncFromBootstrap);
  };

  const content = (() => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "scan-results":
        return <ScanResults />;
      case "cleanup-session":
        return <CleanupSession />;
      case "reports":
        return <Reports />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  })();

  return (
    <AppShell
      activePage={activePage}
      bootstrapError={bootstrapError}
      bootstrapStatus={bootstrapStatus}
      deviceSelectionRequired={selectionRequired}
      deviceStatus={device?.status ?? null}
      metadataProgress={metadataProgress}
      navItems={navItems}
      onRefresh={refreshBootstrap}
      onSelectPage={setActivePage}
    >
      {content}
    </AppShell>
  );
}

export default App;
