import { Clock3, FileJson2, FileText, FileType2, Search } from "lucide-react";
import { formatTimestamp, parseReportArtifacts } from "../../lib/format";
import type { ReportSummary } from "../../types/report";

type ReportPanelProps = {
  onSelectReport?: (reportId: string) => void;
  reports: ReportSummary[];
};

export function ReportPanel({ onSelectReport, reports }: ReportPanelProps) {
  if (reports.length === 0) {
    return (
      <section className="glass-panel rounded-[28px] p-6">
        <h3 className="text-lg font-semibold text-text">Recent reports</h3>
        <p className="mt-2 text-sm text-text-muted">
          No cleanup sessions have been recorded yet. Run a cleanup to generate
          local audit history.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[28px] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text">Recent reports</h3>
          <p className="text-sm text-text-muted">
            Cleanup audit history stays local on this workstation.
          </p>
        </div>
        <div className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-text-muted">
          Local JSON
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {reports.map((report) =>
          onSelectReport ? (
            <button
              className="rounded-[22px] border border-line bg-surface-soft p-4 text-left transition hover:border-line-strong hover:bg-panel-soft"
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              type="button"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="font-medium text-text">
                    {report.deviceLabel}
                  </h4>
                  <p className="text-sm text-text-muted">{report.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {formatTimestamp(report.timestamp)}
                  </span>
                  <ReportArtifactBadges exportStatus={report.exportStatus} />
                  <span className="inline-flex items-center gap-2 rounded-[14px] border border-line bg-panel px-3.5 py-2 text-sm text-text">
                    <Search className="h-4 w-4" />
                    View
                  </span>
                </div>
              </div>
            </button>
          ) : (
            <article
              key={report.id}
              className="rounded-[22px] border border-line bg-surface-soft p-4"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="font-medium text-text">
                    {report.deviceLabel}
                  </h4>
                  <p className="text-sm text-text-muted">{report.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {formatTimestamp(report.timestamp)}
                  </span>
                  <ReportArtifactBadges exportStatus={report.exportStatus} />
                </div>
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

function ReportArtifactBadges({ exportStatus }: { exportStatus: string }) {
  const artifacts = parseReportArtifacts(exportStatus);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {artifacts.map((artifact) => {
        const config = artifactConfig[artifact];
        const Icon = config.icon;

        return (
          <span
            key={artifact}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-medium text-text-muted"
            title={config.title}
          >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

const artifactConfig = {
  json: { icon: FileJson2, label: "JSON", title: "JSON report" },
  text: { icon: FileText, label: "TXT", title: "Text report" },
  "pdf-en": { icon: FileType2, label: "PDF EN", title: "English PDF" },
  "pdf-no": { icon: FileType2, label: "PDF NO", title: "Norwegian PDF" },
} as const;
