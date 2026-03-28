import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";
import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  onWindowResized,
  startWindowDragging,
  toggleWindowMaximize,
} from "../../lib/api";

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

function shouldIgnoreDragTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest("button, input, select, textarea, a"))
    : false;
}

export function Titlebar({
  bootstrapError,
  bootstrapStatus,
  deviceSelectionRequired,
  deviceStatus,
  metadataProgress,
  onRefresh,
}: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  const syncMaximizedState = async () => {
    const maximized = await isWindowMaximized();
    setIsMaximized(maximized);
  };

  useEffect(() => {
    let mounted = true;
    let dispose: (() => void) | null = null;

    const bind = async () => {
      const maximized = await isWindowMaximized();
      if (mounted) {
        setIsMaximized(maximized);
      }

      dispose = await onWindowResized(async () => {
        const next = await isWindowMaximized();
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

  const handleDragMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || shouldIgnoreDragTarget(event.target)) {
      return;
    }

    void startWindowDragging();
  };

  const handleDragDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (shouldIgnoreDragTarget(event.target)) {
      return;
    }

    void toggleWindowMaximize().then(syncMaximizedState);
  };

  const handleMinimize = async () => {
    await minimizeWindow();
  };

  const handleToggleMaximize = async () => {
    await toggleWindowMaximize();
    await syncMaximizedState();
  };

  const handleClose = async () => {
    await closeWindow();
  };

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
            ? "Device selection required"
            : deviceStatus === "unauthorized"
              ? "Awaiting authorization"
              : deviceStatus === "disconnected"
                ? "Device not ready"
                : "Ready for review",
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
      <div
        className="titlebar__drag-zone"
        data-tauri-drag-region
        onDoubleClick={handleDragDoubleClick}
        onMouseDown={handleDragMouseDown}
      >
        <div className="titlebar__identity" data-tauri-drag-region>
          <div className="titlebar__mark" data-tauri-drag-region>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0" data-tauri-drag-region>
            <p className="titlebar__eyebrow" data-tauri-drag-region>
              Active workstation
            </p>
            <div className="titlebar__title-row" data-tauri-drag-region>
              <span className="titlebar__title" data-tauri-drag-region>
                Support session
              </span>
              <span className="titlebar__subtitle" data-tauri-drag-region>
                Device review, cleanup, reporting
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
            <LayoutGrid className="h-4 w-4 text-text-muted" />
            <span>Technician workflow</span>
          </div>
        </div>
      </div>

      <div className="window-controls">
        <button
          aria-label="Minimize window"
          className="window-control"
          onClick={() => void handleMinimize()}
          type="button"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
        <button
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
          className="window-control"
          onClick={() => void handleToggleMaximize()}
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
          onClick={() => void handleClose()}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
