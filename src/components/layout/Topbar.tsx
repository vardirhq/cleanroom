import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

type TopbarProps = {
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  bootstrapError: string | null;
  metadataProgress: {
    completed: number;
    inFlight: boolean;
    total: number;
  };
  onRefresh: () => void;
};

export function Topbar({
  bootstrapError,
  bootstrapStatus,
  metadataProgress,
  onRefresh,
}: TopbarProps) {
  const indicator = (() => {
    switch (bootstrapStatus) {
      case "loading":
        return {
          icon: <LoaderCircle className="h-4 w-4 animate-spin text-info" />,
          label: "Syncing desktop state",
        };
      case "error":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-danger" />,
          label: bootstrapError ?? "Bootstrap failed",
        };
      case "ready":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-success" />,
          label: "Desktop shell ready",
        };
      default:
        return {
          icon: <LoaderCircle className="h-4 w-4 text-text-muted" />,
          label: "Waiting for initialization",
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
            ? `Resolving app metadata ${metadataProgress.completed}/${metadataProgress.total}`
            : `App metadata ready ${metadataProgress.total}/${metadataProgress.total}`,
        }
      : null;

  return (
    <header className="border-b border-line bg-background-elevated/48 px-4 py-3 lg:px-6 xl:px-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
            Clinical utility software
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text lg:text-[1.35rem]">
            Inspect, isolate, remove, verify.
          </h2>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-line bg-white/5 px-3.5 py-2 text-sm font-medium text-text transition hover:border-line-strong hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={bootstrapStatus === "loading"}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw
              className={`h-4 w-4 ${bootstrapStatus === "loading" ? "animate-spin" : ""}`}
            />
            Refresh device state
          </button>
          <div className="flex items-center gap-2 rounded-[14px] border border-line bg-white/5 px-3.5 py-2 text-sm text-text-muted">
            {indicator.icon}
            <span>{indicator.label}</span>
          </div>
          {metadataIndicator ? (
            <div className="flex items-center gap-2 rounded-[14px] border border-line bg-white/5 px-3.5 py-2 text-sm text-text-muted">
              {metadataIndicator.icon}
              <span>{metadataIndicator.label}</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
