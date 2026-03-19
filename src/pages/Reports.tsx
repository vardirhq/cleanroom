import { useEffect, useState } from "react";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  FileJson2,
  FileText,
  FileType2,
  LoaderCircle,
  X,
} from "lucide-react";
import { ReportPanel } from "../components/report/ReportPanel";
import { exportCleanupReportPdf, getCleanupReport } from "../lib/api";
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

  if (activeReport) {
    return (
      <div className="grid gap-6">
        <section className="glass-panel rounded-[28px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                className="inline-flex items-center gap-2 rounded-[14px] border border-line bg-surface-soft px-3.5 py-2 text-sm text-text transition hover:bg-panel-soft"
                onClick={() => {
                  setActiveReportId(null);
                }}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to reports
              </button>
              <p className="mt-5 text-xs uppercase tracking-[0.22em] text-text-muted">
                Cleanup record
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-text">
                {activeReport.deviceLabel}
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {activeReport.summary} ·{" "}
                {formatTimestamp(activeReport.timestamp)}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-[18px] border border-line bg-surface-soft px-4 py-3 text-sm text-text-muted">
                <div className="flex flex-wrap items-center gap-2">
                  {parseReportArtifacts(activeReport.exportStatus).map(
                    (artifact) => {
                      const config = reportArtifactConfig[artifact];
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
                    },
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-line bg-surface-soft px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    className="rounded-[14px] border border-line bg-panel px-3 py-2 text-sm text-text"
                    onChange={(event) =>
                      setExportLanguage(event.target.value as PdfExportLanguage)
                    }
                    value={exportLanguage}
                  >
                    <option value="en">English PDF</option>
                    <option value="no">Norwegian PDF</option>
                  </select>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-line bg-panel px-4 py-2 text-sm font-medium text-text transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-60"
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
                  <div className="mt-3 space-y-3">
                    <div className="rounded-[14px] border border-line bg-panel px-3.5 py-3 text-sm text-text-muted">
                      {exportMessage}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {pdfPreviewDataUrl ? (
                        <button
                          className="rounded-[14px] border border-line bg-panel px-3.5 py-2 text-sm font-medium text-text transition hover:bg-panel-soft"
                          onClick={() => setIsPdfPreviewOpen(true)}
                          type="button"
                        >
                          Preview PDF
                        </button>
                      ) : null}
                      {exportPath ? (
                        <button
                          className="rounded-[14px] border border-line bg-panel px-3.5 py-2 text-sm font-medium text-text transition hover:bg-panel-soft"
                          onClick={() => void openPath(exportPath)}
                          type="button"
                        >
                          Open externally
                        </button>
                      ) : null}
                      {exportPath ? (
                        <button
                          className="rounded-[14px] border border-line bg-panel px-3.5 py-2 text-sm font-medium text-text transition hover:bg-panel-soft"
                          onClick={() => void revealItemInDir(exportPath)}
                          type="button"
                        >
                          Reveal in folder
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="glass-panel rounded-[28px] p-6">
            <h3 className="text-lg font-semibold text-text">Before cleanup</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
                Scanned packages
                <div className="mt-2 text-2xl font-semibold text-text">
                  {activeReport.beforeSummary.scannedPackageCount}
                </div>
              </div>
              <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
                Flagged packages
                <div className="mt-2 text-2xl font-semibold text-text">
                  {activeReport.beforeSummary.flaggedCount}
                </div>
              </div>
            </div>
          </article>
          <article className="glass-panel rounded-[28px] p-6">
            <h3 className="text-lg font-semibold text-text">After cleanup</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
                Scanned packages
                <div className="mt-2 text-2xl font-semibold text-text">
                  {activeReport.afterSummary.scannedPackageCount}
                </div>
              </div>
              <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
                Flagged packages
                <div className="mt-2 text-2xl font-semibold text-text">
                  {activeReport.afterSummary.flaggedCount}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="glass-panel rounded-[28px] p-6">
          <h3 className="text-lg font-semibold text-text">Selected packages</h3>
          <div className="mt-4 grid gap-2">
            {activeReport.selectedPackages.map((packageName) => (
              <div
                key={packageName}
                className="rounded-[16px] border border-line bg-surface-soft px-4 py-3 text-sm text-text-muted"
              >
                {packageName}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[28px] p-6">
          <h3 className="text-lg font-semibold text-text">Results</h3>
          <div className="mt-4 grid gap-3">
            {activeReport.results.map((result) => (
              <article
                className={`rounded-[18px] border px-4 py-4 ${
                  result.success
                    ? "border-success/30 bg-success/8"
                    : "border-danger/30 bg-danger/8"
                }`}
                key={`${result.packageName}-${result.message}`}
              >
                <div className="font-medium text-text">
                  {result.packageName}
                </div>
                <div className="mt-1 text-sm text-text-muted">
                  {result.message}
                </div>
                {result.rollbackGuidance ? (
                  <div className="mt-2 text-xs text-text-muted">
                    Rollback guidance: {result.rollbackGuidance}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {activeReport.launcherObservations.length > 0 ? (
          <section className="glass-panel rounded-[28px] p-6">
            <h3 className="text-lg font-semibold text-text">
              Launcher observations
            </h3>
            <div className="mt-4 grid gap-2">
              {activeReport.launcherObservations.map((item) => (
                <div
                  key={item}
                  className="rounded-[16px] border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {pdfPreviewDataUrl && isPdfPreviewOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 px-4 py-6">
            <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-line bg-panel-strong shadow-[0_30px_80px_rgba(15,23,42,0.42)]">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-text">
                    PDF preview
                  </h3>
                  <p className="text-sm text-text-muted">
                    {exportLanguage === "no"
                      ? "Norwegian export preview"
                      : "English export preview"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {exportPath ? (
                    <button
                      className="rounded-[14px] border border-line bg-panel px-3.5 py-2 text-sm font-medium text-text transition hover:bg-panel-soft"
                      onClick={() => void openPath(exportPath)}
                      type="button"
                    >
                      Open externally
                    </button>
                  ) : null}
                  <button
                    aria-label="Close PDF preview"
                    className="rounded-[14px] border border-line bg-panel px-3 py-2 text-text transition hover:bg-panel-soft"
                    onClick={() => setIsPdfPreviewOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-200">
                <div className="border-b border-line bg-surface-soft px-5 py-3 text-sm text-text-muted">
                  {exportLanguage === "no"
                    ? "Printable service report generated in Norwegian."
                    : "Printable service report generated in English."}
                </div>
                <object
                  className="h-[calc(100%-53px)] w-full"
                  data={pdfPreviewDataUrl}
                  type="application/pdf"
                >
                  <div className="flex h-full items-center justify-center p-8">
                    <div className="max-w-md rounded-[20px] border border-line bg-panel p-6 text-center">
                      <h4 className="text-base font-semibold text-text">
                        Preview unavailable in this webview
                      </h4>
                      <p className="mt-3 text-sm leading-6 text-text-muted">
                        Open the PDF externally if the embedded preview is not
                        supported on this platform.
                      </p>
                      {exportPath ? (
                        <button
                          className="mt-4 rounded-[14px] border border-line bg-panel-soft px-4 py-2 text-sm font-medium text-text transition hover:bg-panel"
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

  return <ReportPanel onSelectReport={setActiveReportId} reports={reports} />;
}

const reportArtifactConfig = {
  json: { icon: FileJson2, label: "JSON", title: "JSON report" },
  text: { icon: FileText, label: "TXT", title: "Text report" },
  "pdf-en": { icon: FileType2, label: "PDF EN", title: "English PDF" },
  "pdf-no": { icon: FileType2, label: "PDF NO", title: "Norwegian PDF" },
} as const;
