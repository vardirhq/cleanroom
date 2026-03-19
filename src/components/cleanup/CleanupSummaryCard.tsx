import { Shield, Trash2 } from "lucide-react";
import type { CleanupPlanSummary } from "../../types/package";

type CleanupSummaryCardProps = {
  plan: CleanupPlanSummary;
};

export function CleanupSummaryCard({ plan }: CleanupSummaryCardProps) {
  return (
    <section className="glass-panel rounded-[24px] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-danger/14 p-3 text-danger">
          <Trash2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text">
            Decontamination plan
          </h3>
          <p className="text-sm text-text-muted">
            No destructive automation. Every risky action stays reviewable.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[20px] border border-line bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Selected packages
          </div>
          <div className="mt-2 text-3xl font-semibold text-text">
            {plan.selectedCount}
          </div>
        </div>
        <div className="rounded-[20px] border border-line bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Launcher warnings
          </div>
          <div className="mt-2 text-3xl font-semibold text-warning">
            {plan.launcherWarnings}
          </div>
        </div>
        <div className="rounded-[20px] border border-line bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Protected packages
          </div>
          <div className="mt-2 text-3xl font-semibold text-info">
            {plan.protectedCount}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[20px] border border-warning/30 bg-warning/8 p-4 text-sm text-text-muted">
        <div className="flex items-center gap-2 font-medium text-text">
          <Shield className="h-4 w-4 text-warning" />
          Launcher-risk packages require technician confirmation before
          uninstall.
        </div>
      </div>
    </section>
  );
}
