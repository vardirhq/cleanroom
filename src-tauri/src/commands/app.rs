use crate::models::{
    app::{AppBootstrap, AppDescriptor},
    package::{CleanupResultRecord, PackageMetadataRecord, ScanSummary},
    report::{CleanupSessionReport, PdfExportLanguage, PdfExportResult},
    settings::{AdbStrategy, AppSettings, AppSettingsPayload},
};
use crate::services::{
    adb::runner::AdbRunner,
    detection::rules::DetectionRules,
    device::{
        get_active_device_serial, load_signature as load_device_signature,
        load_snapshot as load_device_snapshot, set_active_device_serial,
    },
    package::{load_package_metadata, load_snapshot as load_package_snapshot},
    reports::{
        export_cleanup_report_pdf as export_pdf_report, load_cleanup_report, load_report_summaries,
        write_cleanup_report,
    },
    settings::{load_settings, payload_for_settings, save_settings},
};

#[tauri::command]
pub fn get_app_bootstrap() -> AppBootstrap {
    let adb = AdbRunner::detect();
    let rules = DetectionRules::load();
    let settings = load_settings();
    let active_serial = get_active_device_serial();
    let device_snapshot = load_device_snapshot(adb.as_ref(), active_serial.as_deref());
    let package_snapshot =
        load_package_snapshot(adb.as_ref(), device_snapshot.ready_serial.as_deref(), false);

    AppBootstrap {
        app: AppDescriptor {
            adb_path: adb.as_ref().map(|runner| runner.adb_path().to_string()),
            connection_message: device_snapshot.connection_message,
            device_count: device_snapshot.device_count,
            mode: "desktop".into(),
            platform: std::env::consts::OS.into(),
            rules_version: rules.version,
        },
        active_device_serial: device_snapshot.active_device_serial,
        device: device_snapshot.current_device,
        device_selection_required: device_snapshot.selection_required,
        devices: device_snapshot.devices,
        settings: payload_for_settings(&settings),
        scan_summary: ScanSummary {
            active_notification_count: package_snapshot.summary.active_notification_count,
            aggressive_channel_count: package_snapshot.summary.aggressive_channel_count,
            flagged_count: package_snapshot.summary.flagged_count,
            high_importance_notification_count: package_snapshot
                .summary
                .high_importance_notification_count,
            launcher_risk_count: package_snapshot.summary.launcher_risk_count,
            notification_suspect_count: package_snapshot.summary.notification_suspect_count,
            protected_count: package_snapshot.summary.protected_count,
            scanned_package_count: package_snapshot.summary.scanned_package_count,
            system_package_count: package_snapshot.summary.system_package_count,
            user_package_count: package_snapshot.summary.user_package_count,
        },
        installed_packages: package_snapshot.installed_packages,
        reports: load_report_summaries(),
        contaminants: package_snapshot.contaminants,
    }
}

#[tauri::command]
pub fn set_active_device(serial: Option<String>) {
    set_active_device_serial(serial);
}

#[tauri::command]
pub fn update_app_settings(
    adb_strategy: String,
    developer_mode: bool,
    export_directory: Option<String>,
) -> AppSettingsPayload {
    let adb_strategy = match adb_strategy.as_str() {
        "bundled" => AdbStrategy::Bundled,
        _ => AdbStrategy::System,
    };

    save_settings(AppSettings {
        adb_strategy,
        developer_mode,
        export_directory,
    })
}

#[tauri::command]
pub fn get_device_signature() -> String {
    let adb = AdbRunner::detect();
    load_device_signature(adb.as_ref())
}

#[tauri::command]
pub async fn get_package_metadata(package_names: Vec<String>) -> Vec<PackageMetadataRecord> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = AdbRunner::detect();
        let active_serial = get_active_device_serial();
        let device_snapshot = load_device_snapshot(adb.as_ref(), active_serial.as_deref());
        load_package_metadata(
            adb.as_ref(),
            device_snapshot.ready_serial.as_deref(),
            &package_names,
        )
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn run_cleanup(
    package_names: Vec<String>,
    allow_launcher_packages: bool,
) -> Vec<CleanupResultRecord> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = AdbRunner::detect();
        let active_serial = get_active_device_serial();
        let device_snapshot = load_device_snapshot(adb.as_ref(), active_serial.as_deref());
        let package_snapshot =
            load_package_snapshot(adb.as_ref(), device_snapshot.ready_serial.as_deref(), false);
        let Some(adb) = adb else {
            return vec![CleanupResultRecord {
                message: "ADB is not available on this system.".to_string(),
                package_name: String::new(),
                rollback_guidance: None,
                success: false,
            }];
        };
        let device_label = device_snapshot
            .current_device
            .as_ref()
            .map(|device| format!("{} {}", device.manufacturer, device.model))
            .unwrap_or_else(|| "Unknown device".to_string());
        let Some(serial) = device_snapshot.ready_serial else {
            return vec![CleanupResultRecord {
                message: "No authorized Android device is ready for cleanup.".to_string(),
                package_name: String::new(),
                rollback_guidance: None,
                success: false,
            }];
        };

        let installed_by_package = package_snapshot
            .installed_packages
            .into_iter()
            .map(|item| (item.package_name.clone(), item))
            .collect::<std::collections::BTreeMap<_, _>>();

        let results: Vec<_> = package_names
            .into_iter()
            .map(|package_name| {
                let Some(installed) = installed_by_package.get(&package_name) else {
                    return CleanupResultRecord {
                        message: "Package is no longer present in the current device inventory."
                            .to_string(),
                        package_name,
                        rollback_guidance: None,
                        success: false,
                    };
                };

                if installed.protected_package {
                    return CleanupResultRecord {
                        message:
                            "Package is protected by Cleanroom safety rules and cannot be removed."
                                .to_string(),
                        package_name,
                        rollback_guidance: None,
                        success: false,
                    };
                }

                if installed.launcher_candidate && !allow_launcher_packages {
                    return CleanupResultRecord {
                        message: "Package looks launcher-related. Confirm launcher removal before running cleanup."
                            .to_string(),
                        package_name,
                        rollback_guidance: Some(
                            "If this package really is the current launcher, restore a safe home app before retrying removal."
                                .to_string(),
                        ),
                        success: false,
                    };
                }

                match adb.uninstall_package(&serial, &package_name) {
                    Ok(output) => CleanupResultRecord {
                        message: if output.is_empty() {
                            "Uninstall completed successfully.".to_string()
                        } else {
                            output
                        },
                        package_name,
                        rollback_guidance: Some(
                            "Uninstall over ADB is not automatically reversible. Reinstall the app from a trusted source if the customer needs it restored."
                                .to_string(),
                        ),
                        success: true,
                    },
                    Err(error) => CleanupResultRecord {
                        message: error.to_string(),
                        package_name,
                        rollback_guidance: Some(
                            "Review the package in Settings or Play Store, then retry after confirming permissions, active admin roles, or launcher state."
                                .to_string(),
                        ),
                        success: false,
                    },
                }
            })
            .collect();

        let after_snapshot = load_package_snapshot(Some(&adb), Some(&serial), false);
        let launcher_observations = results
            .iter()
            .filter_map(|result| {
                installed_by_package.get(&result.package_name).and_then(|item| {
                    item.launcher_candidate.then(|| {
                        format!(
                            "{} was treated as launcher-related during cleanup review.",
                            item.package_name
                        )
                    })
                })
            })
            .collect();

        write_cleanup_report(
            after_snapshot.summary,
            package_snapshot.summary,
            device_label,
            launcher_observations,
            results.iter().map(|item| item.package_name.clone()).collect(),
            results.clone(),
        );

        results
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub fn get_cleanup_report(report_id: String) -> Option<CleanupSessionReport> {
    load_cleanup_report(&report_id)
}

#[tauri::command]
pub async fn export_cleanup_report_pdf(
    report_id: String,
    language: PdfExportLanguage,
) -> PdfExportResult {
    tauri::async_runtime::spawn_blocking(move || export_pdf_report(&report_id, language))
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
    tauri::async_runtime::spawn_blocking(move || {
        let adb = AdbRunner::detect()
            .ok_or_else(|| "ADB is not available on this system.".to_string())?;
        let active_serial = get_active_device_serial();
        let device_snapshot = load_device_snapshot(Some(&adb), active_serial.as_deref());
        let serial = device_snapshot
            .ready_serial
            .ok_or_else(|| "No authorized Android device is ready.".to_string())?;

        let primary_action = match target.as_str() {
            "home" => "android.settings.HOME_SETTINGS",
            "default_apps" => "android.settings.MANAGE_DEFAULT_APPS_SETTINGS",
            _ => "android.settings.SETTINGS",
        };

        adb.start_activity(&serial, primary_action)
            .or_else(|_| adb.start_activity(&serial, "android.settings.SETTINGS"))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}
