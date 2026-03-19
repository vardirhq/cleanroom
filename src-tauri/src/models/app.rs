use serde::Serialize;

use super::{
    device::DeviceSummary,
    package::{ContaminantRecord, InstalledPackageRecord, ScanSummary},
    report::ReportSummary,
    settings::AppSettingsPayload,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDescriptor {
    pub adb_path: Option<String>,
    pub connection_message: String,
    pub device_count: usize,
    pub mode: String,
    pub platform: String,
    pub rules_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppBootstrap {
    pub app: AppDescriptor,
    pub active_device_serial: Option<String>,
    pub device: Option<DeviceSummary>,
    pub device_selection_required: bool,
    pub devices: Vec<DeviceSummary>,
    pub settings: AppSettingsPayload,
    pub scan_summary: ScanSummary,
    pub installed_packages: Vec<InstalledPackageRecord>,
    pub reports: Vec<ReportSummary>,
    pub contaminants: Vec<ContaminantRecord>,
}
