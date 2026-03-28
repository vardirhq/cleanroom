pub mod backend;
mod commands;
pub mod models;
pub mod services;

use tauri::Manager;

use commands::app::export_cleanup_report_pdf;
use commands::app::get_app_bootstrap;
use commands::app::get_cleanup_report;
use commands::app::get_device_signature;
use commands::app::get_package_metadata;
use commands::app::open_launcher_recovery_settings;
use commands::app::run_cleanup;
use commands::app::set_active_device;
use commands::app::update_app_settings;
use services::adb::runner::set_bundled_resource_dir;
use services::device_monitor;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            set_bundled_resource_dir(app.path().resource_dir().ok());
            device_monitor::start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_bootstrap,
            get_cleanup_report,
            get_device_signature,
            export_cleanup_report_pdf,
            get_package_metadata,
            open_launcher_recovery_settings,
            run_cleanup,
            set_active_device,
            update_app_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
