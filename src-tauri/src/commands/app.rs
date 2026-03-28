use crate::backend::{
    export_cleanup_report_pdf_sync, get_app_bootstrap_sync, get_cleanup_report_sync,
    get_device_signature_sync, get_package_metadata_sync, open_launcher_recovery_settings_sync,
    run_cleanup_sync, set_active_device_sync, update_app_settings_sync,
};
use crate::models::{
    app::AppBootstrap,
    package::{CleanupResultRecord, PackageMetadataRecord},
    report::{CleanupSessionReport, PdfExportLanguage, PdfExportResult},
    settings::AppSettingsPayload,
};

#[tauri::command]
pub fn get_app_bootstrap() -> AppBootstrap {
    get_app_bootstrap_sync()
}

#[tauri::command]
pub fn set_active_device(serial: Option<String>) {
    set_active_device_sync(serial);
}

#[tauri::command]
pub fn update_app_settings(
    adb_strategy: String,
    developer_mode: bool,
    export_directory: Option<String>,
) -> AppSettingsPayload {
    update_app_settings_sync(adb_strategy, developer_mode, export_directory)
}

#[tauri::command]
pub fn get_device_signature() -> String {
    get_device_signature_sync()
}

#[tauri::command]
pub async fn get_package_metadata(package_names: Vec<String>) -> Vec<PackageMetadataRecord> {
    tauri::async_runtime::spawn_blocking(move || get_package_metadata_sync(package_names))
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn run_cleanup(
    package_names: Vec<String>,
    allow_launcher_packages: bool,
) -> Vec<CleanupResultRecord> {
    tauri::async_runtime::spawn_blocking(move || {
        run_cleanup_sync(package_names, allow_launcher_packages)
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub fn get_cleanup_report(report_id: String) -> Option<CleanupSessionReport> {
    get_cleanup_report_sync(report_id)
}

#[tauri::command]
pub async fn export_cleanup_report_pdf(
    report_id: String,
    language: PdfExportLanguage,
) -> PdfExportResult {
    tauri::async_runtime::spawn_blocking(move || {
        export_cleanup_report_pdf_sync(report_id, language)
    })
        .await
        .unwrap_or(PdfExportResult {
            success: false,
            path: None,
            message: "PDF export failed unexpectedly.".to_string(),
            export_status: "Local JSON + text".to_string(),
            preview_data_url: None,
        })
}

#[tauri::command]
pub async fn open_launcher_recovery_settings(target: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || open_launcher_recovery_settings_sync(target))
    .await
    .map_err(|error| error.to_string())?
}
