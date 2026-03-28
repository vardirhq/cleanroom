use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

use apk_info::apk::Apk;
use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::services::detection::scoring::apply_session_signals;
use crate::{
    models::package::{
        InstalledPackageRecord, PackageMetadataRecord, PackageScope, ScanSnapshotSource,
        ScanSummary,
    },
    services::{
        adb::{
            parser::{
                parse_active_notification_counts, parse_aggressive_channel_counts,
                parse_application_label, parse_high_importance_notification_counts,
                parse_package_list, parse_package_paths, parse_resolved_package,
            },
            runner::AdbRunner,
        },
        detection::{rules::DetectionRules, scoring::classify_package},
    },
};

pub struct PackageSnapshot {
    pub contaminants: Vec<crate::models::package::ContaminantRecord>,
    pub installed_packages: Vec<InstalledPackageRecord>,
    pub summary: ScanSummary,
}

#[derive(Clone)]
struct CachedPackageSnapshot {
    fingerprint: String,
    serial: String,
    snapshot: PackageSnapshot,
}

static SNAPSHOT_CACHE: OnceLock<Mutex<Option<CachedPackageSnapshot>>> = OnceLock::new();

fn snapshot_cache() -> &'static Mutex<Option<CachedPackageSnapshot>> {
    SNAPSHOT_CACHE.get_or_init(|| Mutex::new(None))
}

impl Clone for PackageSnapshot {
    fn clone(&self) -> Self {
        Self {
            contaminants: self.contaminants.clone(),
            installed_packages: self.installed_packages.clone(),
            summary: self.summary.clone(),
        }
    }
}

pub fn load_snapshot(
    adb: Option<&AdbRunner>,
    serial: Option<&str>,
    include_metadata: bool,
) -> PackageSnapshot {
    let Some(adb) = adb else {
        return empty_snapshot();
    };

    let Some(serial) = serial else {
        return empty_snapshot();
    };

    let all_package_output = match adb.list_packages(serial) {
        Ok(output) => output,
        Err(_) => return empty_snapshot(),
    };
    let user_package_output = adb
        .list_user_packages(serial)
        .unwrap_or_else(|_| all_package_output.clone());

    let home_package = adb
        .resolve_home_package(serial)
        .ok()
        .and_then(|output| parse_resolved_package(&output));
    let home_package_raw = home_package.clone().unwrap_or_default();
    let notification_dump = adb.dump_notifications(serial).ok();
    let notification_counts = notification_dump
        .as_deref()
        .map(|output| {
            let active = parse_active_notification_counts(&output)
                .into_iter()
                .collect::<std::collections::BTreeMap<_, _>>();
            let channels = parse_aggressive_channel_counts(&output)
                .into_iter()
                .collect::<std::collections::BTreeMap<_, _>>();
            let high_importance = parse_high_importance_notification_counts(&output)
                .into_iter()
                .collect::<std::collections::BTreeMap<_, _>>();
            (active, channels, high_importance)
        })
        .unwrap_or_default();
    let rules = DetectionRules::load();
    let fingerprint = format!(
        "{}\n--users--\n{}\n--home--\n{}\n--notifications--\n{}",
        all_package_output,
        user_package_output,
        home_package_raw,
        notification_dump.as_deref().unwrap_or_default()
    );

    if !include_metadata {
        if let Some(cached) = snapshot_cache()
            .lock()
            .ok()
            .and_then(|cache| cache.clone())
            .filter(|cached| cached.serial == serial && cached.fingerprint == fingerprint)
        {
            let mut snapshot = cached.snapshot;
            snapshot.summary.snapshot_source = ScanSnapshotSource::SessionCache;
            return snapshot;
        }
    }

    let user_packages = parse_package_list(&user_package_output)
        .into_iter()
        .collect::<std::collections::BTreeSet<_>>();

    let mut installed_packages: Vec<InstalledPackageRecord> =
        parse_package_list(&all_package_output)
            .into_iter()
            .map(|package_name| {
                let cached_metadata = load_cached_package_metadata(&package_name);
                let scope = if user_packages.contains(&package_name) {
                    PackageScope::User
                } else {
                    PackageScope::System
                };
                let active_notification_count = notification_counts
                    .0
                    .get(&package_name)
                    .copied()
                    .unwrap_or(0);
                let aggressive_channel_count = notification_counts
                    .1
                    .get(&package_name)
                    .copied()
                    .unwrap_or(0);
                let high_importance_notification_count = notification_counts
                    .2
                    .get(&package_name)
                    .copied()
                    .unwrap_or(0);
                let installed = classify_package(
                    &package_name,
                    cached_metadata
                        .as_ref()
                        .and_then(|item| item.name.as_deref()),
                    home_package.as_deref(),
                    scope,
                    active_notification_count,
                    aggressive_channel_count,
                    high_importance_notification_count,
                    &rules,
                );
                let installed = apply_cached_package_metadata(installed, cached_metadata.as_ref());

                if include_metadata {
                    resolve_package_metadata(adb, serial, package_name, installed)
                } else {
                    installed
                }
            })
            .collect();
    apply_session_signals(&mut installed_packages);

    let contaminants: Vec<_> = installed_packages
        .iter()
        .filter_map(|item| item.contaminant.clone())
        .collect();

    let launcher_risk_count = contaminants
        .iter()
        .filter(|item| item.launcher_risk)
        .count();
    let active_notification_count = installed_packages
        .iter()
        .map(|item| item.active_notification_count)
        .sum();
    let aggressive_channel_count = installed_packages
        .iter()
        .map(|item| item.aggressive_channel_count)
        .sum();
    let high_importance_notification_count = installed_packages
        .iter()
        .map(|item| item.high_importance_notification_count)
        .sum();
    let notification_suspect_count = installed_packages
        .iter()
        .filter(|item| item.notification_spam_risk)
        .count();
    let protected_count = installed_packages
        .iter()
        .filter(|item| item.protected_package)
        .count();
    let user_package_count = installed_packages
        .iter()
        .filter(|item| matches!(item.scope, PackageScope::User))
        .count();
    let system_package_count = installed_packages.len().saturating_sub(user_package_count);

    let snapshot = PackageSnapshot {
        summary: ScanSummary {
            active_notification_count,
            aggressive_channel_count,
            flagged_count: contaminants.len(),
            high_importance_notification_count,
            launcher_risk_count,
            notification_suspect_count,
            protected_count,
            scanned_package_count: installed_packages.len(),
            snapshot_source: ScanSnapshotSource::Live,
            system_package_count,
            user_package_count,
        },
        contaminants,
        installed_packages,
    };

    if !include_metadata {
        if let Ok(mut cache) = snapshot_cache().lock() {
            *cache = Some(CachedPackageSnapshot {
                fingerprint,
                serial: serial.to_string(),
                snapshot: snapshot.clone(),
            });
        }
    }

    snapshot
}

fn empty_snapshot() -> PackageSnapshot {
    PackageSnapshot {
        contaminants: vec![],
        installed_packages: vec![],
        summary: ScanSummary {
            active_notification_count: 0,
            aggressive_channel_count: 0,
            flagged_count: 0,
            high_importance_notification_count: 0,
            launcher_risk_count: 0,
            notification_suspect_count: 0,
            protected_count: 0,
            scanned_package_count: 0,
            snapshot_source: ScanSnapshotSource::Live,
            system_package_count: 0,
            user_package_count: 0,
        },
    }
}

pub fn load_package_metadata(
    adb: Option<&AdbRunner>,
    serial: Option<&str>,
    package_names: &[String],
) -> Vec<PackageMetadataRecord> {
    let Some(adb) = adb else {
        return vec![];
    };

    let Some(serial) = serial else {
        return vec![];
    };

    package_names
        .iter()
        .filter_map(|package_name| {
            if let Some(cached) = load_cached_package_metadata(package_name) {
                return Some(cached);
            }

            let artifact = load_package_artifact(adb, serial, package_name);
            let mut label = artifact.as_ref().and_then(|item| item.label.clone());
            let icon_data_url = artifact.and_then(|item| item.icon_data_url);

            if label.is_none() {
                let fallback_name = package_name
                    .split('.')
                    .next_back()
                    .unwrap_or(package_name)
                    .to_ascii_lowercase();
                if should_attempt_label_lookup(&fallback_name) {
                    label = adb
                        .dump_package(serial, package_name)
                        .ok()
                        .and_then(|output| parse_application_label(&output));
                }
            }

            if label.is_none() && icon_data_url.is_none() {
                return None;
            }

            let record = PackageMetadataRecord {
                package_name: package_name.clone(),
                name: label,
                icon_data_url,
            };
            persist_package_metadata(&record);
            Some(record)
        })
        .collect()
}

fn resolve_package_metadata(
    adb: &AdbRunner,
    serial: &str,
    package_name: String,
    mut installed: InstalledPackageRecord,
) -> InstalledPackageRecord {
    if let Some(artifact) = load_package_artifact(adb, serial, &package_name) {
        if let Some(label) = artifact.label {
            apply_package_label(&mut installed, label);
            installed.metadata_resolved = true;
        } else if should_attempt_label_lookup(&installed.name) {
            populate_label_from_dump(adb, serial, &package_name, &mut installed);
        }

        if artifact.icon_data_url.is_some() {
            installed.metadata_resolved = true;
        }
        installed.icon_data_url = artifact.icon_data_url.clone();
        if let Some(contaminant) = installed.contaminant.as_mut() {
            contaminant.icon_data_url = artifact.icon_data_url;
        }
    } else if should_attempt_label_lookup(&installed.name) {
        populate_label_from_dump(adb, serial, &package_name, &mut installed);
    }

    installed
}

fn apply_package_label(installed: &mut InstalledPackageRecord, label: String) {
    installed.name = label.clone();
    installed.metadata_resolved = true;
    if let Some(contaminant) = installed.contaminant.as_mut() {
        contaminant.name = label;
    }
}

fn apply_cached_package_metadata(
    mut installed: InstalledPackageRecord,
    cached_metadata: Option<&PackageMetadataRecord>,
) -> InstalledPackageRecord {
    let Some(cached_metadata) = cached_metadata else {
        return installed;
    };

    if let Some(label) = &cached_metadata.name {
        apply_package_label(&mut installed, label.clone());
    }

    if let Some(icon_data_url) = &cached_metadata.icon_data_url {
        installed.metadata_resolved = true;
        installed.icon_data_url = Some(icon_data_url.clone());
        if let Some(contaminant) = installed.contaminant.as_mut() {
            contaminant.icon_data_url = Some(icon_data_url.clone());
        }
    }

    installed
}

fn should_attempt_label_lookup(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "android" | "app" | "apps" | "client" | "free" | "lite" | "mobile" | "release"
    )
}

#[derive(Debug)]
struct PackageArtifact {
    icon_data_url: Option<String>,
    label: Option<String>,
}

fn populate_label_from_dump(
    adb: &AdbRunner,
    serial: &str,
    package_name: &str,
    installed: &mut InstalledPackageRecord,
) {
    let Ok(output) = adb.dump_package(serial, package_name) else {
        return;
    };
    let Some(label) = parse_application_label(&output) else {
        return;
    };

    apply_package_label(installed, label);
}

fn load_package_artifact(
    adb: &AdbRunner,
    serial: &str,
    package_name: &str,
) -> Option<PackageArtifact> {
    let remote_apk_path = adb
        .package_paths(serial, package_name)
        .ok()
        .and_then(|output| {
            parse_package_paths(&output)
                .into_iter()
                .find(|path| path.ends_with("/base.apk"))
        })?;
    let local_apk_path = ensure_cached_apk(adb, serial, package_name, &remote_apk_path).ok()?;
    let apk = Apk::new(&local_apk_path).ok()?;
    let label = apk.get_application_label();
    let icon_data_url = apk
        .get_application_icon()
        .and_then(|icon_path| read_icon_data_url(&apk, &icon_path));

    Some(PackageArtifact {
        icon_data_url,
        label,
    })
}

fn ensure_cached_apk(
    adb: &AdbRunner,
    serial: &str,
    package_name: &str,
    remote_apk_path: &str,
) -> std::io::Result<PathBuf> {
    let cache_dir = apk_cache_dir(serial);
    fs::create_dir_all(&cache_dir)?;

    let local_apk_path = cache_dir.join(format!("{}.apk", sanitize_value(package_name)));
    if local_apk_path.exists() {
        return Ok(local_apk_path);
    }

    adb.pull_file(serial, remote_apk_path, &local_apk_path)?;
    Ok(local_apk_path)
}

fn package_cache_dir() -> PathBuf {
    app_cache_root().join("package-metadata")
}

fn apk_cache_dir(serial: &str) -> PathBuf {
    app_cache_root()
        .join("apk-cache")
        .join(sanitize_value(serial))
}

fn sanitize_value(value: &str) -> String {
    value
        .chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() || matches!(char, '.' | '-' | '_') {
                char
            } else {
                '_'
            }
        })
        .collect()
}

fn app_cache_root() -> PathBuf {
    if let Some(path) = std::env::var_os("XDG_CACHE_HOME") {
        return PathBuf::from(path).join("cleanroom");
    }

    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home).join(".cache").join("cleanroom");
    }

    std::env::temp_dir().join("cleanroom")
}

fn load_cached_package_metadata(package_name: &str) -> Option<PackageMetadataRecord> {
    let path = package_metadata_cache_path(package_name);
    let contents = fs::read_to_string(path).ok()?;
    let record = serde_json::from_str::<PackageMetadataRecord>(&contents).ok()?;
    if record.name.is_none() && record.icon_data_url.is_none() {
        None
    } else {
        Some(record)
    }
}

fn persist_package_metadata(record: &PackageMetadataRecord) {
    if record.name.is_none() && record.icon_data_url.is_none() {
        return;
    }

    let cache_dir = package_cache_dir();
    if fs::create_dir_all(&cache_dir).is_err() {
        return;
    }

    let path = package_metadata_cache_path(&record.package_name);
    let Ok(contents) = serde_json::to_string(record) else {
        return;
    };
    let _ = fs::write(path, contents);
}

fn package_metadata_cache_path(package_name: &str) -> PathBuf {
    package_cache_dir().join(format!("{}.json", sanitize_value(package_name)))
}

fn read_icon_data_url(apk: &Apk, icon_path: &str) -> Option<String> {
    if let Some(data_url) = read_icon_data_url_from_entry(apk, icon_path) {
        return Some(data_url);
    }

    if icon_path.ends_with(".xml") {
        return find_raster_icon_fallback(apk, icon_path)
            .and_then(|path| read_icon_data_url_from_entry(apk, &path));
    }

    None
}

fn read_icon_data_url_from_entry(apk: &Apk, entry_path: &str) -> Option<String> {
    let mime = mime_type_for_entry(entry_path)?;
    let (bytes, _) = apk.read(entry_path).ok()?;
    Some(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

fn find_raster_icon_fallback(apk: &Apk, icon_path: &str) -> Option<String> {
    let stem = Path::new(icon_path).file_stem()?.to_str()?;
    let mut candidates: Vec<_> = apk
        .namelist()
        .filter(|name| {
            (name.starts_with("res/mipmap-") || name.starts_with("res/drawable-"))
                && file_stem(name) == Some(stem)
                && mime_type_for_entry(name).is_some()
        })
        .collect();

    candidates.sort_by_key(|name| density_rank(name));
    candidates.into_iter().last().map(ToString::to_string)
}

fn file_stem(path: &str) -> Option<&str> {
    Path::new(path).file_stem()?.to_str()
}

fn density_rank(path: &str) -> usize {
    let lower = path.to_ascii_lowercase();
    if lower.contains("xxxhdpi") {
        6
    } else if lower.contains("xxhdpi") {
        5
    } else if lower.contains("xhdpi") {
        4
    } else if lower.contains("hdpi") {
        3
    } else if lower.contains("mdpi") {
        2
    } else if lower.contains("ldpi") {
        1
    } else {
        0
    }
}

fn mime_type_for_entry(path: &str) -> Option<&'static str> {
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".png") {
        Some("image/png")
    } else if lower.ends_with(".webp") {
        Some("image/webp")
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        Some("image/jpeg")
    } else {
        None
    }
}
