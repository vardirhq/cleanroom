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
    <article className="workbench-panel contaminant-card">
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

      <div className="tag-row">
        <span className="tag">
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="tag">
          {formatRiskLabel(item.riskScore)}
        </span>
        {item.launcherRisk ? (
          <span className="tag tag--warning">Launcher risk</span>
        ) : null}
      </div>

      <ul className="signal-list text-sm leading-6 text-text-muted">
        {item.reasons.map((reason) => (
          <li className="reason-card" key={reason}>
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
