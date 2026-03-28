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
      <section className="workbench-panel">
        <p className="section-kicker">Service history</p>
        <h3 className="panel-title mt-3">Recent reports</h3>
        <p className="panel-copy">
          No cleanup sessions have been recorded yet. Run a cleanup to generate
          local audit history.
        </p>
      </section>
    );
  }

  return (
    <section className="workbench-panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Service history</p>
          <h3 className="panel-title mt-3">Recent reports</h3>
          <p className="panel-copy">
            Cleanup audit history stays local on this workstation.
          </p>
        </div>
        <div className="artifact-chip">
          <FileJson2 className="h-3.5 w-3.5" />
          Local records
        </div>
      </div>

      <div className="report-list mt-5">
        {reports.map((report) =>
          onSelectReport ? (
            <button
              className="report-list-item"
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              type="button"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="font-medium text-text">
                    {report.deviceLabel}
                  </h4>
                  <p className="mt-1 text-sm text-text-muted">
                    {report.summary}
                  </p>
                </div>
                <div className="report-list-item__meta">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {formatTimestamp(report.timestamp)}
                  </span>
                  <ReportArtifactBadges exportStatus={report.exportStatus} />
                  <span className="ui-button ui-button--ghost">
                    <Search className="h-4 w-4" />
                    View
                  </span>
                </div>
              </div>
            </button>
          ) : (
            <article className="report-list-item" key={report.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="font-medium text-text">
                    {report.deviceLabel}
                  </h4>
                  <p className="mt-1 text-sm text-text-muted">
                    {report.summary}
                  </p>
                </div>
                <div className="report-list-item__meta">
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
            className="artifact-chip"
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
