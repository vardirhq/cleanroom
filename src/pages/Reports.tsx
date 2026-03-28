import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileJson2,
  FileText,
  FileType2,
  LoaderCircle,
  X,
} from "lucide-react";
import { ReportPanel } from "../components/report/ReportPanel";
import { StateNotice } from "../components/ui/StateNotice";
import {
  exportCleanupReportPdf,
  getCleanupReport,
  openPath,
  revealItemInDir,
} from "../lib/api";
import { formatTimestamp, parseReportArtifacts } from "../lib/format";
import { useDeviceStore } from "../stores/useDeviceStore";
import { useScanStore } from "../stores/useScanStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import type { CleanupSessionReport, PdfExportLanguage } from "../types/report";

export function Reports() {
  const reports = useDeviceStore((state) => state.bootstrap?.reports ?? []);
  const loadBootstrap = useDeviceStore((state) => state.loadBootstrap);
  const activeReportId = useSettingsStore((state) => state.activeReportId);
  const setActiveReportId = useSettingsStore(
    (state) => state.setActiveReportId,
  );
  const syncFromBootstrap = useScanStore((state) => state.syncFromBootstrap);
  const [activeReport, setActiveReport] = useState<CleanupSessionReport | null>(
    null,
  );
  const [exportLanguage, setExportLanguage] = useState<PdfExportLanguage>("en");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfPreviewDataUrl, setPdfPreviewDataUrl] = useState<string | null>(
    null,
  );
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  useEffect(() => {
    if (!activeReportId) {
      setActiveReport(null);
      setExportMessage(null);
      setExportPath(null);
      setPdfPreviewDataUrl(null);
      setIsPdfPreviewOpen(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setActiveReport(null);
      const report = await getCleanupReport(activeReportId);
      if (!cancelled) {
        setActiveReport(report);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeReportId]);

  const refreshReportState = async (reportId: string) => {
    const report = await getCleanupReport(reportId);
    setActiveReport(report);
    await loadBootstrap(syncFromBootstrap);
  };

  const handleExportPdf = async () => {
    if (!activeReport) {
      return;
    }

    setIsExportingPdf(true);
    setExportMessage(null);
    try {
      const result = await exportCleanupReportPdf(
        activeReport.id,
        exportLanguage,
      );
      setExportMessage(result.message);
      setExportPath(result.path);
      setPdfPreviewDataUrl(result.previewDataUrl);
      setIsPdfPreviewOpen(Boolean(result.previewDataUrl));
      await refreshReportState(activeReport.id);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!activeReport) {
    if (activeReportId) {
      return (
        <div className="workbench-page">
          <StateNotice
            description="The selected cleanup record is being loaded from local storage."
            title="Loading report details"
            tone="loading"
          />
        </div>
      );
    }

    return (
      <div className="workbench-page">
        <section className="page-hero">
          <div className="page-hero__header">
            <div className="max-w-4xl">
              <p className="panel-kicker">Service records</p>
              <h2 className="page-hero__title">Cleanup history and exports</h2>
              <p className="page-hero__description">
                Reports stay local to the workstation and act as the audit trail
                for technician-reviewed cleanup work.
              </p>
            </div>
            <div className="page-hero__actions">
              <div className="artifact-chip">
                <FileJson2 className="h-4 w-4" />
                JSON and text always retained
              </div>
            </div>
          </div>
        </section>

        <ReportPanel onSelectReport={setActiveReportId} reports={reports} />
      </div>
    );
  }

  const artifacts = parseReportArtifacts(activeReport.exportStatus);

  return (
    <div className="workbench-page">
      <section className="page-hero">
        <div className="page-hero__header">
          <div className="max-w-4xl">
            <div className="inline-actions">
              <button
                className="ui-button ui-button--ghost"
                onClick={() => setActiveReportId(null)}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to reports
              </button>
            </div>
            <p className="panel-kicker mt-4">Cleanup record</p>
            <h2 className="page-hero__title">{activeReport.deviceLabel}</h2>
            <p className="page-hero__description">
              {activeReport.summary} Recorded{" "}
              {formatTimestamp(activeReport.timestamp)}.
            </p>
          </div>
          <div className="page-hero__actions">
            {artifacts.map((artifact) => {
              const config = reportArtifactConfig[artifact];
              const Icon = config.icon;
              return (
                <span
                  className="artifact-chip"
                  key={artifact}
                  title={config.title}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <section className="report-detail-grid">
        <div className="grid gap-4">
          <section className="workbench-panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">PDF export</p>
                <h3 className="panel-title mt-3">Printable service document</h3>
                <p className="panel-copy">
                  Generate a technician-ready PDF in English or Norwegian, then
                  preview it in-app or open it externally.
                </p>
              </div>
            </div>
            <div className="inline-actions mt-4">
              <select
                className="ui-select max-w-[220px]"
                onChange={(event) =>
                  setExportLanguage(event.target.value as PdfExportLanguage)
                }
                value={exportLanguage}
              >
                <option value="en">English PDF</option>
                <option value="no">Norwegian PDF</option>
              </select>
              <button
                className="ui-button"
                disabled={isExportingPdf}
                onClick={() => void handleExportPdf()}
                type="button"
              >
                {isExportingPdf ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {isExportingPdf ? "Exporting PDF" : "Export PDF"}
              </button>
            </div>
            {exportMessage ? (
              <div className="info-card mt-4">
                <div className="info-card__copy">{exportMessage}</div>
                <div className="inline-actions mt-4">
                  {pdfPreviewDataUrl ? (
                    <button
                      className="ui-button ui-button--ghost"
                      onClick={() => setIsPdfPreviewOpen(true)}
                      type="button"
                    >
                      Preview PDF
                    </button>
                  ) : null}
                  {exportPath ? (
                    <button
                      className="ui-button ui-button--ghost"
                      onClick={() => void openPath(exportPath)}
                      type="button"
                    >
                      Open externally
                    </button>
                  ) : null}
                  {exportPath ? (
                    <button
                      className="ui-button ui-button--ghost"
                      onClick={() => void revealItemInDir(exportPath)}
                      type="button"
                    >
                      Reveal in folder
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="workbench-panel">
            <p className="section-kicker">Selected packages</p>
            <h3 className="panel-title mt-3">Removal set</h3>
            <div className="package-list mt-4">
              {activeReport.selectedPackages.map((packageName) => (
                <div className="package-row" key={packageName}>
                  <div className="text-sm text-text">{packageName}</div>
                </div>
              ))}
            </div>
          </section>

          {activeReport.launcherObservations.length > 0 ? (
            <section className="workbench-panel">
              <p className="section-kicker">Launcher observations</p>
              <h3 className="panel-title mt-3">Recovery notes</h3>
              <div className="signal-list mt-4">
                {activeReport.launcherObservations.map((item) => (
                  <div className="reason-card" key={item}>
                    <span className="tag tag--warning">Launcher</span>
                    <span className="text-sm text-text-muted">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="grid gap-4">
          <section className="workbench-panel">
            <p className="section-kicker">Before and after</p>
            <h3 className="panel-title mt-3">Session summary</h3>
            <div className="report-summary-grid mt-4">
              <div className="info-card">
                <div className="info-card__label">Before cleanup</div>
                <div className="mt-3 grid gap-3">
                  <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
                    <span>Scanned packages</span>
                    <span className="text-text">
                      {activeReport.beforeSummary.scannedPackageCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
                    <span>Flagged packages</span>
                    <span className="text-text">
                      {activeReport.beforeSummary.flaggedCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-card__label">After cleanup</div>
                <div className="mt-3 grid gap-3">
                  <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
                    <span>Scanned packages</span>
                    <span className="text-text">
                      {activeReport.afterSummary.scannedPackageCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
                    <span>Flagged packages</span>
                    <span className="text-text">
                      {activeReport.afterSummary.flaggedCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="workbench-panel">
            <p className="section-kicker">Execution ledger</p>
            <h3 className="panel-title mt-3">Package-level results</h3>
            <div className="package-list mt-4">
              {activeReport.results.map((result) => (
                <article
                  className={`result-card ${
                    result.success
                      ? "border-success/30 bg-success/8"
                      : "border-danger/30 bg-danger/8"
                  }`}
                  key={`${result.packageName}-${result.message}`}
                >
                  <div className="font-medium text-text">{result.packageName}</div>
                  <div className="mt-2 text-sm text-text-muted">
                    {result.message}
                  </div>
                  {result.rollbackGuidance ? (
                    <div className="mt-3 text-xs text-text-muted">
                      Rollback guidance: {result.rollbackGuidance}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      {pdfPreviewDataUrl && isPdfPreviewOpen ? (
        <div className="report-preview-modal">
          <div className="report-preview-modal__shell">
            <div className="panel-header border-b border-line px-5 py-4">
              <div>
                <p className="section-kicker">Preview</p>
                <h3 className="panel-title mt-3">PDF document preview</h3>
                <p className="panel-copy">
                  {exportLanguage === "no"
                    ? "Printable service report generated in Norwegian."
                    : "Printable service report generated in English."}
                </p>
              </div>
              <div className="inline-actions">
                {exportPath ? (
                  <button
                    className="ui-button ui-button--ghost"
                    onClick={() => void openPath(exportPath)}
                    type="button"
                  >
                    Open externally
                  </button>
                ) : null}
                <button
                  aria-label="Close PDF preview"
                  className="ui-button ui-button--ghost"
                  onClick={() => setIsPdfPreviewOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="report-preview-modal__frame">
              <object
                className="h-full w-full"
                data={pdfPreviewDataUrl}
                type="application/pdf"
              >
                <div className="flex h-full items-center justify-center p-8">
                  <div className="empty-state max-w-md">
                    <p className="section-kicker">Preview unavailable</p>
                    <h4 className="empty-state__title">
                      This webview cannot render the PDF inline
                    </h4>
                    <p className="empty-state__copy">
                      Open the export externally if embedded PDF preview is not
                      supported on this platform.
                    </p>
                    {exportPath ? (
                      <button
                        className="ui-button mt-5"
                        onClick={() => void openPath(exportPath)}
                        type="button"
                      >
                        Open externally
                      </button>
                    ) : null}
                  </div>
                </div>
              </object>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const reportArtifactConfig = {
  json: { icon: FileJson2, label: "JSON", title: "JSON report" },
  text: { icon: FileText, label: "TXT", title: "Text report" },
  "pdf-en": { icon: FileType2, label: "PDF EN", title: "English PDF" },
  "pdf-no": { icon: FileType2, label: "PDF NO", title: "Norwegian PDF" },
} as const;
