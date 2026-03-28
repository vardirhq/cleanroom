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
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>App</th>
            <th>Scope</th>
            <th>Notifications</th>
            <th>Suspicion</th>
            <th>Signals</th>
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(({ label, items: groupItems }) => (
            <Fragment key={`group-${label || "all"}`}>
              {label ? (
                <tr className="table-group-row">
                  <td colSpan={6}>
                    {label}
                  </td>
                </tr>
              ) : null}
              {groupItems.map((item) => {
                const selected = selectedPackageIds.includes(item.packageName);

                return (
                  <tr
                    key={item.packageName}
                    className="transition hover:bg-surface-soft/70"
                  >
                    <td>
                      <input
                        checked={selected}
                        className="h-4 w-4 accent-sky-500"
                        onChange={() => onToggleSelection(item.packageName)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <div className="table-app-cell">
                        <AppIcon
                          iconDataUrl={item.iconDataUrl}
                          name={item.name}
                          size="sm"
                        />
                        <div>
                          <div className="table-app-name">
                            <span>{item.name}</span>
                            {item.protectedPackage ? (
                              <span className="tag tag--info">
                                Protected
                              </span>
                            ) : null}
                            {item.launcherRisk ? (
                              <span className="tag tag--warning">
                                Launcher risk
                              </span>
                            ) : item.launcherCandidate ? (
                              <span className="tag tag--info">
                                Launcher-capable
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 break-all text-sm text-text-muted">
                            {item.packageName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{item.scope}</td>
                    <td>
                      {item.activeNotificationCount > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{item.activeNotificationCount}</span>
                          {item.aggressiveChannelCount > 0 ? (
                            <span className="tag tag--info">
                              Ch {item.aggressiveChannelCount}
                            </span>
                          ) : null}
                          {item.highImportanceNotificationCount > 0 ? (
                            <span className="tag tag--warning">
                              High {item.highImportanceNotificationCount}
                            </span>
                          ) : null}
                          {item.notificationSpamRisk ? (
                            <span className="tag tag--danger">
                              Spam risk
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span>0</span>
                      )}
                    </td>
                    <td>
                      {item.suspicionScore > 0 ? (
                        <div className="flex items-center gap-3">
                          <RiskBadge score={item.suspicionScore} />
                          <span>{formatRiskLabel(item.suspicionScore)}</span>
                        </div>
                      ) : (
                        <span>None</span>
                      )}
                    </td>
                    <td className="table-signals">
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
