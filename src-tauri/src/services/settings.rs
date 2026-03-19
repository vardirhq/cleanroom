use std::{fs, path::PathBuf};

use crate::models::settings::{AdbStrategy, AppSettings, AppSettingsPayload};

pub fn load_settings() -> AppSettings {
    let path = settings_path();
    let contents = fs::read_to_string(path).ok();
    contents
        .and_then(|value| serde_json::from_str::<AppSettings>(&value).ok())
        .unwrap_or_else(default_settings)
}

pub fn save_settings(mut settings: AppSettings) -> AppSettingsPayload {
    settings.export_directory = normalize_export_directory(settings.export_directory);

    if fs::create_dir_all(app_data_root()).is_ok() {
        if let Ok(contents) = serde_json::to_string_pretty(&settings) {
            let _ = fs::write(settings_path(), contents);
        }
    }

    payload_for_settings(&settings)
}

pub fn payload_for_settings(settings: &AppSettings) -> AppSettingsPayload {
    AppSettingsPayload {
        adb_strategy: settings.adb_strategy.clone(),
        developer_mode: settings.developer_mode,
        export_directory: settings.export_directory.clone(),
        effective_export_directory: export_directory_for(settings).to_string_lossy().to_string(),
    }
}

pub fn effective_export_directory() -> PathBuf {
    export_directory_for(&load_settings())
}

pub fn app_data_root() -> PathBuf {
    if let Some(path) = std::env::var_os("XDG_DATA_HOME") {
        return PathBuf::from(path).join("cleanroom");
    }

    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("cleanroom");
    }

    std::env::temp_dir().join("cleanroom")
}

fn export_directory_for(settings: &AppSettings) -> PathBuf {
    settings
        .export_directory
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| app_data_root().join("reports"))
}

fn normalize_export_directory(value: Option<String>) -> Option<String> {
    value.and_then(|path| {
        let trimmed = path.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn default_settings() -> AppSettings {
    AppSettings {
        adb_strategy: AdbStrategy::System,
        developer_mode: false,
        export_directory: None,
    }
}

fn settings_path() -> PathBuf {
    app_data_root().join("settings.json")
}
