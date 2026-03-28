import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
} from "lucide-react";

type StateNoticeTone = "error" | "info" | "loading" | "success" | "warning";

type StateNoticeProps = {
  action?: ReactNode;
  description: string;
  title: string;
  tone?: StateNoticeTone;
};

const toneConfig: Record<
  StateNoticeTone,
  { icon: ReactNode; kicker: string; toneClass: string }
> = {
  error: {
    icon: <AlertTriangle className="h-4 w-4 text-danger" />,
    kicker: "Attention required",
    toneClass: "border-danger/30 bg-danger/8",
  },
  info: {
    icon: <Info className="h-4 w-4 text-info" />,
    kicker: "Review state",
    toneClass: "border-info/30 bg-info/8",
  },
  loading: {
    icon: <LoaderCircle className="h-4 w-4 animate-spin text-info" />,
    kicker: "Working",
    toneClass: "border-info/30 bg-info/8",
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-success" />,
    kicker: "Ready",
    toneClass: "border-success/30 bg-success/8",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-warning" />,
    kicker: "Review state",
    toneClass: "border-warning/30 bg-warning/8",
  },
};

export function StateNotice({
  action,
  description,
  title,
  tone = "info",
}: StateNoticeProps) {
  const config = toneConfig[tone];

  return (
    <div className={`empty-state border ${config.toneClass}`}>
      <div className="inline-flex items-center gap-2 text-sm text-text-muted">
        {config.icon}
        <span className="section-kicker">{config.kicker}</span>
      </div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__copy">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
