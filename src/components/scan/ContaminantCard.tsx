import { AlertTriangle, BellRing, Home, ShieldAlert } from "lucide-react";
import { CATEGORY_LABELS } from "../../lib/constants";
import { formatRiskLabel } from "../../lib/format";
import type { ContaminantRecord } from "../../types/package";
import { AppIcon } from "../ui/AppIcon";
import { RiskBadge } from "../ui/RiskBadge";

type ContaminantCardProps = {
  item: ContaminantRecord;
};

export function ContaminantCard({ item }: ContaminantCardProps) {
  return (
    <article className="glass-panel rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AppIcon iconDataUrl={item.iconDataUrl} name={item.name} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-text">{item.name}</h3>
              {item.launcherRisk ? (
                <Home className="h-4 w-4 text-warning" />
              ) : null}
              {item.category === "ad_spam_utility" ? (
                <BellRing className="h-4 w-4 text-danger" />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-text-muted">{item.packageName}</p>
          </div>
        </div>
        <RiskBadge score={item.riskScore} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {formatRiskLabel(item.riskScore)}
        </span>
      </div>

      <ul className="mt-5 grid gap-3 text-sm leading-6 text-text-muted">
        {item.reasons.map((reason) => (
          <li
            key={reason}
            className="flex items-start gap-3 rounded-[18px] border border-line bg-surface-soft px-3.5 py-3"
          >
            {item.launcherRisk ? (
              <Home className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : item.category === "ad_spam_utility" ? (
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            ) : item.riskScore >= 8 ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            )}
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
