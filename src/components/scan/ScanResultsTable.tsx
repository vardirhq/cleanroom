import { Fragment } from "react";
import { formatRiskLabel } from "../../lib/format";
import type { ScanGroupMode } from "../../lib/scanReview";
import type { InstalledPackageRecord } from "../../types/package";
import { AppIcon } from "../ui/AppIcon";
import { RiskBadge } from "../ui/RiskBadge";

type ScanResultsTableProps = {
  groupMode: ScanGroupMode;
  items: InstalledPackageRecord[];
  onToggleSelection: (packageName: string) => void;
  selectedPackageIds: string[];
};

export function ScanResultsTable({
  groupMode,
  items,
  onToggleSelection,
  selectedPackageIds,
}: ScanResultsTableProps) {
  const groupedItems = buildGroups(items, groupMode);

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-panel-strong shadow-[0_24px_48px_rgba(15,23,42,0.1)]">
      <table className="min-w-full border-collapse">
        <thead className="bg-surface-soft text-left text-xs uppercase tracking-[0.18em] text-text-muted">
          <tr>
            <th className="px-5 py-4 font-medium">Select</th>
            <th className="px-5 py-4 font-medium">App</th>
            <th className="px-5 py-4 font-medium">Scope</th>
            <th className="px-5 py-4 font-medium">Notifications</th>
            <th className="px-5 py-4 font-medium">Suspicion</th>
            <th className="px-5 py-4 font-medium">Signals</th>
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(({ label, items: groupItems }) => (
            <Fragment key={`group-${label || "all"}`}>
              {label ? (
                <tr className="border-t border-line bg-surface-soft/60">
                  <td
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                    colSpan={6}
                  >
                    {label}
                  </td>
                </tr>
              ) : null}
              {groupItems.map((item) => {
                const selected = selectedPackageIds.includes(item.packageName);

                return (
                  <tr
                    key={item.packageName}
                    className="border-t border-line text-sm text-text-muted transition hover:bg-surface-soft/70"
                  >
                    <td className="px-5 py-5 align-top">
                      <input
                        checked={selected}
                        className="h-4 w-4 accent-sky-500"
                        onChange={() => onToggleSelection(item.packageName)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="flex items-center gap-3">
                        <AppIcon
                          iconDataUrl={item.iconDataUrl}
                          name={item.name}
                          size="sm"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2 font-medium text-text">
                            <span>{item.name}</span>
                            {item.protectedPackage ? (
                              <span className="rounded-full bg-info/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-info">
                                Protected
                              </span>
                            ) : null}
                            {item.launcherCandidate ? (
                              <span className="rounded-full bg-warning/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                                Launcher
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 break-all">
                            {item.packageName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top">{item.scope}</td>
                    <td className="px-5 py-5 align-top">
                      {item.activeNotificationCount > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{item.activeNotificationCount}</span>
                          {item.aggressiveChannelCount > 0 ? (
                            <span className="rounded-full bg-info/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-info">
                              Ch {item.aggressiveChannelCount}
                            </span>
                          ) : null}
                          {item.highImportanceNotificationCount > 0 ? (
                            <span className="rounded-full bg-warning/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                              High {item.highImportanceNotificationCount}
                            </span>
                          ) : null}
                          {item.notificationSpamRisk ? (
                            <span className="rounded-full bg-danger/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-danger">
                              Spam risk
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span>0</span>
                      )}
                    </td>
                    <td className="px-5 py-5 align-top">
                      {item.suspicionScore > 0 ? (
                        <div className="flex items-center gap-3">
                          <RiskBadge score={item.suspicionScore} />
                          <span>{formatRiskLabel(item.suspicionScore)}</span>
                        </div>
                      ) : (
                        <span>None</span>
                      )}
                    </td>
                    <td className="px-5 py-5 align-top leading-6">
                      {item.reasons.length > 0
                        ? item.reasons.join(" · ")
                        : "No obvious junk heuristics matched."}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildGroups(
  items: InstalledPackageRecord[],
  groupMode: ScanGroupMode,
) {
  if (groupMode === "none") {
    return [{ label: "", items }];
  }

  const groups = new Map<string, InstalledPackageRecord[]>();
  for (const item of items) {
    const label =
      groupMode === "category"
        ? item.contaminant?.category
          ? item.contaminant.category.replace(/_/g, " ")
          : "uncategorized"
        : item.contaminant
          ? "flagged contaminants"
          : item.suspicionScore > 0
            ? "advisory review"
            : "no active suspicion";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }

  return [...groups.entries()].map(([label, grouped]) => ({
    label,
    items: grouped,
  }));
}
