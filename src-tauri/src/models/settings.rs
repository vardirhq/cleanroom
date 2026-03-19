use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub adb_strategy: AdbStrategy,
    pub developer_mode: bool,
    pub export_directory: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AdbStrategy {
    System,
    Bundled,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsPayload {
    pub adb_strategy: AdbStrategy,
    pub developer_mode: bool,
    pub export_directory: Option<String>,
    pub effective_export_directory: String,
}
