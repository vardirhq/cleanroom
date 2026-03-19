use std::{
    io::{BufRead, BufReader},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Emitter};

use crate::services::adb::runner::AdbRunner;

pub const DEVICE_STATE_CHANGED_EVENT: &str = "cleanroom://device-state-changed";

pub fn start(app_handle: AppHandle) {
    thread::spawn(move || loop {
        let Some(adb) = AdbRunner::detect() else {
            thread::sleep(Duration::from_secs(5));
            continue;
        };

        let Ok(mut child) = adb.spawn_track_devices() else {
            thread::sleep(Duration::from_secs(5));
            continue;
        };

        let Some(stdout) = child.stdout.take() else {
            let _ = child.kill();
            thread::sleep(Duration::from_secs(5));
            continue;
        };

        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(_) => {
                    let _ = app_handle.emit(DEVICE_STATE_CHANGED_EVENT, ());
                }
                Err(_) => break,
            }
        }

        let _ = child.kill();
        thread::sleep(Duration::from_secs(1));
    });
}
