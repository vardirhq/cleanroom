use std::sync::{Mutex, OnceLock};

use crate::{
    models::device::{DeviceStatus, DeviceSummary},
    services::adb::{
        parser::{parse_devices, AdbDeviceRecord, AdbDeviceState},
        runner::AdbRunner,
    },
};

static ACTIVE_DEVICE_SERIAL: OnceLock<Mutex<Option<String>>> = OnceLock::new();

pub struct DeviceSnapshot {
    pub connection_message: String,
    pub active_device_serial: Option<String>,
    pub current_device: Option<DeviceSummary>,
    pub device_count: usize,
    pub devices: Vec<DeviceSummary>,
    pub ready_serial: Option<String>,
    pub selection_required: bool,
}

fn active_device_slot() -> &'static Mutex<Option<String>> {
    ACTIVE_DEVICE_SERIAL.get_or_init(|| Mutex::new(None))
}

pub fn get_active_device_serial() -> Option<String> {
    active_device_slot()
        .lock()
        .ok()
        .and_then(|value| value.clone())
}

pub fn set_active_device_serial(serial: Option<String>) {
    if let Ok(mut active) = active_device_slot().lock() {
        *active = serial;
    }
}

pub fn load_signature(adb: Option<&AdbRunner>) -> String {
    let Some(adb) = adb else {
        return "adb-missing".to_string();
    };

    let Ok(output) = adb.devices_long() else {
        return "adb-error".to_string();
    };

    let devices = parse_devices(&output);
    if devices.is_empty() {
        return "no-devices".to_string();
    }

    let mut signature_parts: Vec<_> = devices
        .into_iter()
        .map(|device| {
            let state = match device.state {
                AdbDeviceState::Device => "device".to_string(),
                AdbDeviceState::Offline => "offline".to_string(),
                AdbDeviceState::Unauthorized => "unauthorized".to_string(),
                AdbDeviceState::Unknown(value) => value,
            };
            format!("{}:{state}", device.serial)
        })
        .collect();
    signature_parts.sort();

    signature_parts.join("|")
}

pub fn load_snapshot(adb: Option<&AdbRunner>, preferred_serial: Option<&str>) -> DeviceSnapshot {
    let Some(adb) = adb else {
        return DeviceSnapshot {
            connection_message: "ADB was not found on this system. Install Android Platform-Tools or point Cleanroom at a bundled binary.".into(),
            active_device_serial: None,
            current_device: None,
            device_count: 0,
            devices: vec![],
            ready_serial: None,
            selection_required: false,
        };
    };

    let devices_output = match adb.devices_long() {
        Ok(output) => output,
        Err(_) => {
            return DeviceSnapshot {
                connection_message: "ADB is installed, but device enumeration failed. Check USB permissions and that the ADB server can start.".into(),
                active_device_serial: None,
                current_device: None,
                device_count: 0,
                devices: vec![],
                ready_serial: None,
                selection_required: false,
            }
        }
    };

    let devices = parse_devices(&devices_output);
    if devices.is_empty() {
        set_active_device_serial(None);
        return DeviceSnapshot {
            connection_message:
                "No Android devices detected. Connect a phone over USB and enable USB debugging."
                    .into(),
            active_device_serial: None,
            current_device: None,
            device_count: 0,
            devices: vec![],
            ready_serial: None,
            selection_required: false,
        };
    }

    let device_summaries = devices
        .iter()
        .map(|record| match record.state {
            AdbDeviceState::Device => build_ready_device(adb, record),
            AdbDeviceState::Unauthorized => build_unauthorized_device(record),
            _ => build_unavailable_device(record),
        })
        .collect::<Vec<_>>();

    let resolved_active_serial = if devices.len() == 1 {
        Some(devices[0].serial.clone())
    } else {
        preferred_serial
            .filter(|serial| devices.iter().any(|device| device.serial == *serial))
            .map(ToOwned::to_owned)
    };

    if devices.len() != 1 && resolved_active_serial.is_none() {
        set_active_device_serial(None);
    } else if let Some(serial) = &resolved_active_serial {
        set_active_device_serial(Some(serial.clone()));
    }

    let current = resolved_active_serial.as_ref().and_then(|serial| {
        device_summaries
            .iter()
            .find(|device| device.serial == *serial)
    });

    let Some(current) = current.cloned().or_else(|| {
        if devices.len() == 1 {
            device_summaries.first().cloned()
        } else {
            None
        }
    }) else {
        return DeviceSnapshot {
            connection_message: format!(
                "{} devices detected. Select a single device before scanning or cleanup.",
                devices.len()
            ),
            active_device_serial: None,
            current_device: None,
            device_count: devices.len(),
            devices: device_summaries,
            ready_serial: None,
            selection_required: true,
        };
    };

    let ready_serial =
        matches!(current.status, DeviceStatus::Ready).then(|| current.serial.clone());
    let connection_message = if devices.len() > 1 {
        format!(
            "{} devices connected. Cleanroom is scoped to the selected device only.",
            devices.len()
        )
    } else if matches!(current.status, DeviceStatus::Unauthorized) {
        "Android has not authorized this workstation yet. Unlock the phone and approve USB debugging.".into()
    } else if matches!(current.status, DeviceStatus::Disconnected) {
        "The device is visible to ADB but not ready. Reconnect USB or restart USB debugging.".into()
    } else {
        "Single-device session detected.".into()
    };

    DeviceSnapshot {
        connection_message,
        active_device_serial: Some(current.serial.clone()),
        current_device: Some(current),
        device_count: devices.len(),
        devices: device_summaries,
        ready_serial,
        selection_required: false,
    }
}

fn build_ready_device(adb: &AdbRunner, record: &AdbDeviceRecord) -> DeviceSummary {
    let manufacturer = get_prop_or(
        adb,
        &record.serial,
        "ro.product.manufacturer",
        "Unknown manufacturer",
    );
    let model = get_prop_or(
        adb,
        &record.serial,
        "ro.product.model",
        record.model_hint.as_deref().unwrap_or("Android device"),
    );
    let android_version = get_prop_or(adb, &record.serial, "ro.build.version.release", "Unknown");

    DeviceSummary {
        serial: record.serial.clone(),
        manufacturer,
        model,
        android_version,
        serial_masked: mask_serial(&record.serial),
        status: DeviceStatus::Ready,
    }
}

fn build_unauthorized_device(record: &AdbDeviceRecord) -> DeviceSummary {
    DeviceSummary {
        serial: record.serial.clone(),
        manufacturer: "ADB".into(),
        model: record
            .model_hint
            .clone()
            .unwrap_or_else(|| "Unauthorized device".into()),
        android_version: "Unavailable".into(),
        serial_masked: mask_serial(&record.serial),
        status: DeviceStatus::Unauthorized,
    }
}

fn build_unavailable_device(record: &AdbDeviceRecord) -> DeviceSummary {
    DeviceSummary {
        serial: record.serial.clone(),
        manufacturer: "ADB".into(),
        model: record
            .model_hint
            .clone()
            .unwrap_or_else(|| "Unavailable device".into()),
        android_version: "Unavailable".into(),
        serial_masked: mask_serial(&record.serial),
        status: DeviceStatus::Disconnected,
    }
}

fn get_prop_or(adb: &AdbRunner, serial: &str, prop: &str, fallback: &str) -> String {
    adb.get_prop(serial, prop)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn mask_serial(serial: &str) -> String {
    let chars: Vec<char> = serial.chars().collect();
    if chars.len() <= 4 {
        return "****".into();
    }

    let prefix: String = chars.iter().take(4).collect();
    let suffix: String = chars.iter().rev().take(2).rev().collect();
    format!("{prefix}****{suffix}")
}
