import type { CleanupResultRecord, ScanSummary } from "./package";

export type ReportSummary = {
  deviceLabel: string;
  exportStatus: string;
  id: string;
  summary: string;
  timestamp: string;
};

export type CleanupSessionReport = {
  afterSummary: ScanSummary;
  beforeSummary: ScanSummary;
  deviceLabel: string;
  exportStatus: string;
  id: string;
  launcherObservations: string[];
  results: CleanupResultRecord[];
  selectedPackages: string[];
  summary: string;
  timestamp: string;
};

export type PdfExportLanguage = "en" | "no";

export type PdfExportResult = {
  exportStatus: string;
  message: string;
  path: string | null;
  previewDataUrl: string | null;
  success: boolean;
};
