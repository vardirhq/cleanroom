use serde::{Deserialize, Serialize};

use super::package::ScanSummary;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportSummary {
    pub id: String,
    pub device_label: String,
    pub summary: String,
    pub timestamp: String,
    pub export_status: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupSessionReport {
    pub after_summary: ScanSummary,
    pub before_summary: ScanSummary,
    pub id: String,
    pub device_label: String,
    pub launcher_observations: Vec<String>,
    pub selected_packages: Vec<String>,
    pub results: Vec<crate::models::package::CleanupResultRecord>,
    pub summary: String,
    pub timestamp: String,
    pub export_status: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PdfExportLanguage {
    En,
    No,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportResult {
    pub success: bool,
    pub path: Option<String>,
    pub message: String,
    pub export_status: String,
    pub preview_data_url: Option<String>,
}
