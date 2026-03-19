use serde::Serialize;

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceStatus {
    Disconnected,
    Unauthorized,
    Ready,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSummary {
    pub serial: String,
    pub manufacturer: String,
    pub model: String,
    pub android_version: String,
    pub serial_masked: String,
    pub status: DeviceStatus,
}
