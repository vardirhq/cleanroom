import type { DeviceSummary } from "../types/device";

export type ReportArtifact = "json" | "text" | "pdf-en" | "pdf-no";

export function formatDeviceSubtitle(device: DeviceSummary) {
  return `${device.manufacturer} · Android ${device.androidVersion} · ${device.serialMasked}`;
}

export function formatRiskLabel(score: number) {
  if (score >= 8) {
    return "High risk contaminant";
  }

  if (score >= 5) {
    return "Likely junk";
  }

  if (score >= 2) {
    return "Suspicious";
  }

  return "Probably safe";
}

export function formatTimestamp(value: string) {
  const date = /^\d+$/.test(value)
    ? new Date(Number(value) * 1000)
    : new Date(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function parseReportArtifacts(exportStatus: string): ReportArtifact[] {
  const artifacts: ReportArtifact[] = ["json", "text"];

  if (exportStatus.includes("PDF (English, Norwegian)")) {
    artifacts.push("pdf-en", "pdf-no");
    return artifacts;
  }

  if (exportStatus.includes("PDF (English)")) {
    artifacts.push("pdf-en");
  }

  if (exportStatus.includes("PDF (Norwegian)")) {
    artifacts.push("pdf-no");
  }

  return artifacts;
}
