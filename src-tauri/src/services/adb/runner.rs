use std::process::{Child, Command, Stdio};

#[derive(Debug, Clone)]
pub struct AdbRunner {
    adb_path: String,
}

impl AdbRunner {
    pub fn detect() -> Option<Self> {
        let output = Command::new("adb").arg("version").output().ok()?;
        if !output.status.success() {
            return None;
        }

        Some(Self {
            adb_path: "adb".to_string(),
        })
    }

    pub fn adb_path(&self) -> &str {
        &self.adb_path
    }

    pub fn devices_long(&self) -> std::io::Result<String> {
        self.run(&["devices", "-l"])
    }

    pub fn get_prop(&self, serial: &str, prop: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "getprop", prop])
    }

    pub fn list_user_packages(&self, serial: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "pm", "list", "packages", "-3"])
    }

    pub fn list_packages(&self, serial: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "pm", "list", "packages"])
    }

    pub fn package_paths(&self, serial: &str, package_name: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "pm", "path", package_name])
    }

    pub fn resolve_home_package(&self, serial: &str) -> std::io::Result<String> {
        self.run(&[
            "-s",
            serial,
            "shell",
            "cmd",
            "package",
            "resolve-activity",
            "--brief",
            "android.intent.action.MAIN",
            "android.intent.category.HOME",
        ])
    }

    pub fn dump_package(&self, serial: &str, package_name: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "pm", "dump", package_name])
    }

    pub fn dump_notifications(&self, serial: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "dumpsys", "notification"])
    }

    pub fn pull_file(
        &self,
        serial: &str,
        remote_path: &str,
        local_path: &std::path::Path,
    ) -> std::io::Result<String> {
        let local_path = local_path.to_string_lossy().to_string();
        self.run(&["-s", serial, "pull", remote_path, &local_path])
    }

    pub fn uninstall_package(&self, serial: &str, package_name: &str) -> std::io::Result<String> {
        let output = Command::new(&self.adb_path)
            .args(["-s", serial, "uninstall", package_name])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        if !output.status.success() {
            return Err(std::io::Error::other(if stderr.is_empty() {
                stdout
            } else {
                stderr
            }));
        }

        if stdout.contains("Success") {
            Ok(stdout)
        } else {
            Err(std::io::Error::other(if stdout.is_empty() {
                "ADB uninstall did not report success".to_string()
            } else {
                stdout
            }))
        }
    }

    pub fn start_activity(&self, serial: &str, action: &str) -> std::io::Result<String> {
        self.run(&["-s", serial, "shell", "am", "start", "-a", action])
    }

    pub fn spawn_track_devices(&self) -> std::io::Result<Child> {
        Command::new(&self.adb_path)
            .args(["track-devices"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    }

    fn run(&self, args: &[&str]) -> std::io::Result<String> {
        let output = Command::new(&self.adb_path)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        if output.status.success() {
            Ok(stdout)
        } else {
            Err(std::io::Error::other(if stderr.is_empty() {
                stdout
            } else {
                stderr
            }))
        }
    }
}
