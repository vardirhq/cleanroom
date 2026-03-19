import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";

type TitlebarProps = {
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  bootstrapError: string | null;
  deviceSelectionRequired: boolean;
  deviceStatus: "disconnected" | "unauthorized" | "ready" | null;
  metadataProgress: {
    completed: number;
    inFlight: boolean;
    total: number;
  };
  onRefresh: () => void;
};

const appWindow = getCurrentWindow();

export function Titlebar({
  bootstrapError,
  bootstrapStatus,
  deviceSelectionRequired,
  deviceStatus,
  metadataProgress,
  onRefresh,
}: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let dispose: (() => void) | null = null;

    const bind = async () => {
      const maximized = await appWindow.isMaximized();
      if (mounted) {
        setIsMaximized(maximized);
      }

      dispose = await appWindow.onResized(async () => {
        const next = await appWindow.isMaximized();
        if (mounted) {
          setIsMaximized(next);
        }
      });
    };

    void bind();

    return () => {
      mounted = false;
      dispose?.();
    };
  }, []);

  const shellIndicator = (() => {
    switch (bootstrapStatus) {
      case "loading":
        return {
          icon: <LoaderCircle className="h-4 w-4 animate-spin text-info" />,
          label: "Syncing support session",
          tone: "status-chip--info",
        };
      case "error":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-danger" />,
          label: bootstrapError ?? "Desktop state failed",
          tone: "status-chip--danger",
        };
      case "ready":
        return {
          icon: deviceSelectionRequired ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : deviceStatus === "unauthorized" ||
            deviceStatus === "disconnected" ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ),
          label: deviceSelectionRequired
            ? "Select active device"
            : deviceStatus === "unauthorized"
              ? "Awaiting device authorization"
              : deviceStatus === "disconnected"
                ? "Device not ready"
                : "Workbench ready",
          tone:
            deviceSelectionRequired ||
            deviceStatus === "unauthorized" ||
            deviceStatus === "disconnected"
              ? "status-chip--info"
              : "status-chip--success",
        };
      default:
        return {
          icon: <LoaderCircle className="h-4 w-4 text-text-muted" />,
          label: "Initializing",
          tone: "status-chip--neutral",
        };
    }
  })();

  const metadataIndicator =
    metadataProgress.total > 0
      ? {
          icon: metadataProgress.inFlight ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-info" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ),
          label: metadataProgress.inFlight
            ? `Metadata ${metadataProgress.completed}/${metadataProgress.total}`
            : `Metadata ready`,
          tone: metadataProgress.inFlight
            ? "status-chip--info"
            : "status-chip--success",
        }
      : null;

  return (
    <header className="titlebar border-b border-line">
      <div className="titlebar__drag-zone" data-tauri-drag-region>
        <div className="titlebar__identity" data-tauri-drag-region>
          <div className="titlebar__mark" data-tauri-drag-region>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0" data-tauri-drag-region>
            <div className="titlebar__title-row" data-tauri-drag-region>
              <span className="titlebar__title" data-tauri-drag-region>
                Active support session
              </span>
              <span
                className="titlebar__subtitle titlebar__subtitle--strong"
                data-tauri-drag-region
              >
                Inspect, isolate, remove, verify
              </span>
            </div>
          </div>
        </div>

        <div className="titlebar__status-cluster">
          <button
            className="toolbar-button"
            disabled={bootstrapStatus === "loading"}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw
              className={`h-4 w-4 ${bootstrapStatus === "loading" ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <div className={`status-chip ${shellIndicator.tone}`}>
            {shellIndicator.icon}
            <span>{shellIndicator.label}</span>
          </div>
          {metadataIndicator ? (
            <div className={`status-chip ${metadataIndicator.tone}`}>
              {metadataIndicator.icon}
              <span>{metadataIndicator.label}</span>
            </div>
          ) : null}
          <div className="status-chip status-chip--neutral">
            <ScanSearch className="h-4 w-4 text-text-muted" />
            <span>Support disk profile</span>
          </div>
        </div>
      </div>

      <div className="window-controls">
        <button
          aria-label="Minimize window"
          className="window-control"
          onClick={() => void appWindow.minimize()}
          type="button"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
        <button
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
          className="window-control"
          onClick={() => void appWindow.toggleMaximize()}
          type="button"
        >
          {isMaximized ? (
            <Square className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
        <button
          aria-label="Close window"
          className="window-control window-control--danger"
          onClick={() => void appWindow.close()}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
