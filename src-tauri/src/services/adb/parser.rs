#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AdbDeviceState {
    Device,
    Offline,
    Unauthorized,
    Unknown(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdbDeviceRecord {
    pub serial: String,
    pub state: AdbDeviceState,
    pub model_hint: Option<String>,
}

pub fn parse_devices(output: &str) -> Vec<AdbDeviceRecord> {
    output
        .lines()
        .skip_while(|line| !line.starts_with("List of devices attached"))
        .skip(1)
        .filter_map(parse_device_line)
        .collect()
}

fn parse_device_line(line: &str) -> Option<AdbDeviceRecord> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut parts = trimmed.split_whitespace();
    let serial = parts.next()?.to_string();
    let state = match parts.next()? {
        "device" => AdbDeviceState::Device,
        "offline" => AdbDeviceState::Offline,
        "unauthorized" => AdbDeviceState::Unauthorized,
        other => AdbDeviceState::Unknown(other.to_string()),
    };

    let model_hint = parts.find_map(|part| {
        part.strip_prefix("model:")
            .map(|value| value.replace('_', " "))
    });

    Some(AdbDeviceRecord {
        serial,
        state,
        model_hint,
    })
}

pub fn parse_package_list(output: &str) -> Vec<String> {
    output
        .lines()
        .filter_map(|line| line.trim().strip_prefix("package:"))
        .map(ToString::to_string)
        .collect()
}

pub fn parse_package_paths(output: &str) -> Vec<String> {
    output
        .lines()
        .filter_map(|line| line.trim().strip_prefix("package:"))
        .map(ToString::to_string)
        .collect()
}

pub fn parse_resolved_package(output: &str) -> Option<String> {
    output.lines().find_map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed == "No activity found" {
            return None;
        }

        let candidate = trimmed
            .split_whitespace()
            .find(|part| part.contains('/'))
            .unwrap_or(trimmed);

        candidate.split('/').next().map(ToString::to_string)
    })
}

pub fn parse_application_label(output: &str) -> Option<String> {
    for line in output.lines() {
        let trimmed = line.trim();

        for prefix in ["application-label:", "application-label-"] {
            if let Some(label) = trimmed.strip_prefix(prefix) {
                let value = if prefix == "application-label-" {
                    label.split_once(':')?.1
                } else {
                    label
                };

                if let Some(parsed) = parse_label_value(value) {
                    return Some(parsed);
                }
            }
        }

        if let Some(label) = trimmed.strip_prefix("nonLocalizedLabel=") {
            if let Some(parsed) = parse_label_value(label) {
                return Some(parsed);
            }
        }
    }

    None
}

pub fn parse_active_notification_counts(output: &str) -> Vec<(String, usize)> {
    let mut counts = std::collections::BTreeMap::<String, usize>::new();

    for line in output.lines() {
        let trimmed = line.trim();
        if !(trimmed.contains("NotificationRecord") || trimmed.contains("StatusBarNotification(")) {
            continue;
        }

        if let Some(package_name) = extract_pkg_value(trimmed) {
            *counts.entry(package_name).or_insert(0) += 1;
        }
    }

    counts.into_iter().collect()
}

pub fn parse_high_importance_notification_counts(output: &str) -> Vec<(String, usize)> {
    let mut counts = std::collections::BTreeMap::<String, usize>::new();
    let mut current_package: Option<String> = None;

    for line in output.lines() {
        let trimmed = line.trim();

        if trimmed.contains("NotificationRecord") || trimmed.contains("StatusBarNotification(") {
            current_package = extract_pkg_value(trimmed);
            continue;
        }

        if current_package.is_none() {
            continue;
        }

        if let Some(importance) = extract_importance_value(trimmed) {
            if importance >= 4 {
                let package_name = current_package.clone().unwrap_or_default();
                if !package_name.is_empty() {
                    *counts.entry(package_name).or_insert(0) += 1;
                }
            }
            current_package = None;
        }
    }

    counts.into_iter().collect()
}

pub fn parse_aggressive_channel_counts(output: &str) -> Vec<(String, usize)> {
    let mut counts = std::collections::BTreeMap::<String, usize>::new();
    let mut current_package: Option<String> = None;

    for line in output.lines() {
        let trimmed = line.trim();

        if trimmed.contains("PackagePreferences")
            || trimmed.contains("NotificationChannel{")
            || trimmed.contains("Notification Channel:")
        {
            if let Some(package_name) = extract_pkg_value(trimmed) {
                current_package = Some(package_name);
            }
        }

        if current_package.is_none() {
            continue;
        }

        if !(trimmed.contains("NotificationChannel{")
            || trimmed.contains("mImportance=")
            || trimmed.contains("importance="))
        {
            continue;
        }

        if let Some(importance) = extract_importance_value(trimmed) {
            if importance >= 4 {
                let package_name = current_package.clone().unwrap_or_default();
                if !package_name.is_empty() {
                    *counts.entry(package_name).or_insert(0) += 1;
                }
            }
        }
    }

    counts.into_iter().collect()
}

fn extract_pkg_value(line: &str) -> Option<String> {
    let start = line.find("pkg=")? + 4;
    let tail = &line[start..];
    let end = tail
        .find(|char: char| char.is_whitespace() || matches!(char, '}' | ')' | ','))
        .unwrap_or(tail.len());
    let value = tail[..end].trim();

    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

fn extract_importance_value(line: &str) -> Option<usize> {
    for marker in ["importance=", "mImportance="] {
        if let Some(start) = line.find(marker) {
            let tail = &line[start + marker.len()..];
            let end = tail
                .find(|char: char| !char.is_ascii_digit())
                .unwrap_or(tail.len());
            let value = tail[..end].trim();
            if let Ok(parsed) = value.parse::<usize>() {
                return Some(parsed);
            }
        }
    }

    None
}

fn parse_label_value(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed == "null" {
        return None;
    }

    let unquoted = trimmed
        .strip_prefix('\'')
        .and_then(|value| value.strip_suffix('\''))
        .unwrap_or(trimmed);
    let cleaned = unquoted.trim();

    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::{
        parse_active_notification_counts, parse_application_label, parse_devices,
        parse_high_importance_notification_counts, parse_package_paths, AdbDeviceRecord,
        AdbDeviceState,
    };

    #[test]
    fn parses_multiple_devices_and_states() {
        assert_eq!(
            parse_devices(
                "List of devices attached\nemulator-5554\tdevice product:sdk model:Pixel_8 device:generic\nR58N12345AB\tunauthorized usb:1-1"
            ),
            vec![
                AdbDeviceRecord {
                    serial: "emulator-5554".to_string(),
                    state: AdbDeviceState::Device,
                    model_hint: Some("Pixel 8".to_string()),
                },
                AdbDeviceRecord {
                    serial: "R58N12345AB".to_string(),
                    state: AdbDeviceState::Unauthorized,
                    model_hint: None,
                }
            ]
        );
    }

    #[test]
    fn parses_application_label_variants() {
        assert_eq!(
            parse_application_label("application-label:'EasyPark'"),
            Some("EasyPark".to_string())
        );
        assert_eq!(
            parse_application_label("application-label-en:'FINN'"),
            Some("FINN".to_string())
        );
        assert_eq!(
            parse_application_label("nonLocalizedLabel=Arlo"),
            Some("Arlo".to_string())
        );
    }

    #[test]
    fn parses_package_paths() {
        assert_eq!(
            parse_package_paths(
                "package:/data/app/~~abc/com.example.app-123/base.apk\npackage:/data/app/~~abc/com.example.app-123/split_config.arm64_v8a.apk"
            ),
            vec![
                "/data/app/~~abc/com.example.app-123/base.apk".to_string(),
                "/data/app/~~abc/com.example.app-123/split_config.arm64_v8a.apk".to_string()
            ]
        );
    }

    #[test]
    fn parses_notification_counts() {
        let output = "\
NotificationRecord{ pkg=com.cleaner.app }\n\
  importance=4\n\
NotificationRecord{ pkg=com.cleaner.app }\n\
  importance=3\n\
StatusBarNotification(pkg=com.safe.tool user=0)\n\
  importance=5\n";

        assert_eq!(
            parse_active_notification_counts(output),
            vec![
                ("com.cleaner.app".to_string(), 2),
                ("com.safe.tool".to_string(), 1)
            ]
        );
        assert_eq!(
            parse_high_importance_notification_counts(output),
            vec![
                ("com.cleaner.app".to_string(), 1),
                ("com.safe.tool".to_string(), 1)
            ]
        );
    }
}
