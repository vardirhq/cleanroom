use std::{
    io::{self, BufRead, Write},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

use cleanroom_lib::{
    backend::{
        export_cleanup_report_pdf_sync, get_app_bootstrap_sync, get_cleanup_report_sync,
        get_device_signature_sync, get_package_metadata_sync, open_launcher_recovery_settings_sync,
        run_cleanup_sync, set_active_device_sync, update_app_settings_sync,
    },
    models::report::PdfExportLanguage,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RpcRequest {
    id: u64,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RpcResponse {
    id: u64,
    kind: &'static str,
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RpcEvent {
    kind: &'static str,
    event: &'static str,
    payload: Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetActiveDeviceParams {
    serial: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAppSettingsParams {
    adb_strategy: String,
    developer_mode: bool,
    export_directory: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageMetadataParams {
    package_names: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunCleanupParams {
    package_names: Vec<String>,
    allow_launcher_packages: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReportIdParams {
    report_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportPdfParams {
    report_id: String,
    language: PdfExportLanguage,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherRecoveryParams {
    target: String,
}

fn main() {
    let stdout = Arc::new(Mutex::new(io::stdout()));
    spawn_device_state_monitor(stdout.clone());

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        match line {
            Ok(line) if !line.trim().is_empty() => {
                let response = match serde_json::from_str::<RpcRequest>(&line) {
                    Ok(request) => handle_request(request),
                    Err(error) => RpcResponse {
                        id: 0,
                        kind: "response",
                        success: false,
                        result: None,
                        error: Some(format!("Invalid request: {error}")),
                    },
                };
                emit_json(&stdout, &response);
            }
            Ok(_) => {}
            Err(error) => {
                emit_json(
                    &stdout,
                    &RpcEvent {
                        kind: "event",
                        event: "sidecar-error",
                        payload: json!({ "message": error.to_string() }),
                    },
                );
                break;
            }
        }
    }
}

fn spawn_device_state_monitor(stdout: Arc<Mutex<io::Stdout>>) {
    thread::spawn(move || {
        let mut last_signature = get_device_signature_sync();

        loop {
            thread::sleep(Duration::from_secs(2));
            let next_signature = get_device_signature_sync();
            if next_signature != last_signature {
                last_signature = next_signature.clone();
                emit_json(
                    &stdout,
                    &RpcEvent {
                        kind: "event",
                        event: "device-state-changed",
                        payload: json!({ "signature": next_signature }),
                    },
                );
            }
        }
    });
}

fn handle_request(request: RpcRequest) -> RpcResponse {
    let result = match request.method.as_str() {
        "getAppBootstrap" => Ok(serde_json::to_value(get_app_bootstrap_sync()).unwrap()),
        "setActiveDevice" => parse_params::<SetActiveDeviceParams>(request.params).map(|params| {
            set_active_device_sync(params.serial);
            Value::Null
        }),
        "updateAppSettings" => parse_params::<UpdateAppSettingsParams>(request.params).map(|params| {
            serde_json::to_value(update_app_settings_sync(
                params.adb_strategy,
                params.developer_mode,
                params.export_directory,
            ))
            .unwrap()
        }),
        "getDeviceSignature" => Ok(json!(get_device_signature_sync())),
        "getPackageMetadata" => {
            parse_params::<PackageMetadataParams>(request.params).map(|params| {
                serde_json::to_value(get_package_metadata_sync(params.package_names)).unwrap()
            })
        }
        "runCleanup" => parse_params::<RunCleanupParams>(request.params).map(|params| {
            serde_json::to_value(run_cleanup_sync(
                params.package_names,
                params.allow_launcher_packages,
            ))
            .unwrap()
        }),
        "getCleanupReport" => parse_params::<ReportIdParams>(request.params).map(|params| {
            serde_json::to_value(get_cleanup_report_sync(params.report_id)).unwrap()
        }),
        "exportCleanupReportPdf" => {
            parse_params::<ExportPdfParams>(request.params).map(|params| {
                serde_json::to_value(export_cleanup_report_pdf_sync(
                    params.report_id,
                    params.language,
                ))
                .unwrap()
            })
        }
        "openLauncherRecoverySettings" => {
            parse_params::<LauncherRecoveryParams>(request.params).and_then(|params| {
                open_launcher_recovery_settings_sync(params.target).map(|value| json!(value))
            })
        }
        method => Err(format!("Unknown method: {method}")),
    };

    match result {
        Ok(result) => RpcResponse {
            id: request.id,
            kind: "response",
            success: true,
            result: Some(result),
            error: None,
        },
        Err(error) => RpcResponse {
            id: request.id,
            kind: "response",
            success: false,
            result: None,
            error: Some(error),
        },
    }
}

fn parse_params<T: for<'de> Deserialize<'de>>(params: Value) -> Result<T, String> {
    serde_json::from_value(params).map_err(|error| format!("Invalid params: {error}"))
}

fn emit_json<T: Serialize>(stdout: &Arc<Mutex<io::Stdout>>, payload: &T) {
    if let Ok(line) = serde_json::to_string(payload) {
        if let Ok(mut stdout) = stdout.lock() {
            let _ = writeln!(stdout, "{line}");
            let _ = stdout.flush();
        }
    }
}
