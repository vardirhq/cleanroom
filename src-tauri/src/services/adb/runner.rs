use std::{
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::OnceLock,
};

use crate::{
    models::settings::AdbStrategy,
    services::settings::load_settings,
};

static BUNDLED_RESOURCE_DIR: OnceLock<PathBuf> = OnceLock::new();

#[derive(Debug, Clone)]
pub struct AdbRunner {
    adb_path: String,
}

impl AdbRunner {
    pub fn detect() -> Option<Self> {
        let settings = load_settings();

        match settings.adb_strategy {
            AdbStrategy::Bundled => Self::detect_bundled().or_else(Self::detect_system),
            AdbStrategy::System => Self::detect_system().or_else(Self::detect_bundled),
        }
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
        let mut command = adb_command(&self.adb_path);
        let output = command
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
        adb_command(&self.adb_path)
            .args(["track-devices"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    }

    fn run(&self, args: &[&str]) -> std::io::Result<String> {
        let mut command = adb_command(&self.adb_path);
        let output = command
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

    fn detect_bundled() -> Option<Self> {
        bundled_adb_candidates()
            .into_iter()
            .find(|path| is_working_adb_path(path))
            .map(|path| Self {
                adb_path: path.to_string_lossy().to_string(),
            })
    }

    fn detect_system() -> Option<Self> {
        is_working_adb_command("adb").then(|| Self {
            adb_path: "adb".to_string(),
        })
    }
}

pub fn set_bundled_resource_dir(path: Option<PathBuf>) {
    if let Some(path) = path {
        let _ = BUNDLED_RESOURCE_DIR.set(path);
    }
}

fn bundled_adb_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(path) = BUNDLED_RESOURCE_DIR.get() {
        candidates.push(path.join(platform_tools_subdir()).join(adb_binary_name()));
    }

    if let Some(path) = std::env::var_os("CLEANROOM_RESOURCE_DIR") {
        candidates.push(
            PathBuf::from(path)
                .join("platform-tools")
                .join(platform_tools_subdir())
                .join(adb_binary_name()),
        );
    }

    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join(platform_tools_subdir())
            .join(adb_binary_name()),
    );

    if let Ok(executable) = std::env::current_exe() {
        if let Some(directory) = executable.parent() {
            candidates.push(
                directory
                    .join("resources")
                    .join(platform_tools_subdir())
                    .join(adb_binary_name()),
            );
            candidates.push(
                directory
                    .join("platform-tools")
                    .join(platform_tools_subdir())
                    .join(adb_binary_name()),
            );
        }
    }

    dedupe_paths(candidates)
}

fn dedupe_paths(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut unique = Vec::new();

    for path in paths {
        if !unique.iter().any(|existing| existing == &path) {
            unique.push(path);
        }
    }

    unique
}

fn is_working_adb_path(path: &Path) -> bool {
    if !path.exists() {
        return false;
    }

    #[cfg(unix)]
    {
        ensure_executable(path);
    }

    is_working_adb_command(path)
}

#[cfg(unix)]
fn ensure_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;

    if let Ok(metadata) = std::fs::metadata(path) {
        let mode = metadata.permissions().mode();
        if mode & 0o111 == 0 {
            let mut permissions = metadata.permissions();
            permissions.set_mode(mode | 0o755);
            let _ = std::fs::set_permissions(path, permissions);
        }
    }
}

fn is_working_adb_command(command_path: impl AsRef<Path>) -> bool {
    adb_command(command_path)
        .arg("version")
        .output()
        .ok()
        .is_some_and(|output| output.status.success())
}

fn adb_command(command_path: impl AsRef<Path>) -> Command {
    let mut command = Command::new(command_path.as_ref());
    configure_adb_process(&mut command);
    command
}

#[cfg(target_os = "windows")]
fn configure_adb_process(command: &mut Command) {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn configure_adb_process(_command: &mut Command) {}

fn platform_tools_subdir() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "windows"
    }

    #[cfg(target_os = "linux")]
    {
        "linux"
    }

    #[cfg(target_os = "macos")]
    {
        "macos"
    }
}

fn adb_binary_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "adb.exe"
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        "adb"
    }
}
