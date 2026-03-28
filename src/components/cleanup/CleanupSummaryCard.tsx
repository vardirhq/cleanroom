import { Shield, Trash2 } from "lucide-react";
import type { CleanupPlanSummary } from "../../types/package";

type CleanupSummaryCardProps = {
  plan: CleanupPlanSummary;
};

export function CleanupSummaryCard({ plan }: CleanupSummaryCardProps) {
  return (
    <section className="workbench-panel">
      <div className="flex items-center gap-3">
        <div className="device-summary__mark">
          <Trash2 className="h-5 w-5" />
        </div>
        <div>
          <p className="section-kicker">Execution posture</p>
          <h3 className="panel-title mt-2">
            Decontamination plan
          </h3>
          <p className="panel-copy">
            No destructive automation. Every risky action stays reviewable.
          </p>
        </div>
      </div>

      <div className="summary-card-grid mt-5">
        <div className="info-card">
          <div className="info-card__label">
            Selected packages
          </div>
          <div className="info-card__value">
            {plan.selectedCount}
          </div>
        </div>
        <div className="info-card">
          <div className="info-card__label">
            Launcher warnings
          </div>
          <div className="info-card__value text-warning">
            {plan.launcherWarnings}
          </div>
        </div>
        <div className="info-card">
          <div className="info-card__label">
            Protected packages
          </div>
          <div className="info-card__value text-info">
            {plan.protectedCount}
          </div>
        </div>
      </div>

      <div className="reason-card mt-5">
        <div className="flex items-center gap-2 font-medium text-text">
          <Shield className="h-4 w-4 text-warning" />
          Launcher-risk packages require technician confirmation before
          uninstall.
        </div>
      </div>
    </section>
  );
}
