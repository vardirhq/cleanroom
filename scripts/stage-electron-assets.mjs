import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const stageRoot = path.join(root, "electron-resources");
const target = normalizeTarget(process.argv[2]);

rmSync(stageRoot, { force: true, recursive: true });
mkdirSync(stageRoot, { recursive: true });

copyDirectory("src-tauri/resources", "resources");
copyDirectory("src-tauri/icons", "icons");

const sidecarName =
  target === "win32" ? "cleanroom-sidecar.exe" : "cleanroom-sidecar";
const sidecarSource =
  target === "win32"
    ? path.join(
        root,
        "src-tauri",
        "target",
        "x86_64-pc-windows-gnu",
        "release",
        sidecarName,
      )
    : path.join(root, "src-tauri", "target", "release", sidecarName);

if (!existsSync(sidecarSource)) {
  throw new Error(
    `Expected packaged ${target} sidecar at ${sidecarSource}. Build the release sidecar for that target first.`,
  );
}

mkdirSync(path.join(stageRoot, "sidecar"), { recursive: true });
cpSync(sidecarSource, path.join(stageRoot, "sidecar", sidecarName));

if (target === "win32") {
  copyWindowsSidecarRuntime();
}

function copyDirectory(relativeFrom, relativeTo) {
  const source = path.join(root, relativeFrom);
  const target = path.join(stageRoot, relativeTo);
  cpSync(source, target, { recursive: true });
}

function normalizeTarget(value) {
  if (value === "win" || value === "win32" || value === "windows") {
    return "win32";
  }

  return "linux";
}

function copyWindowsSidecarRuntime() {
  const runtimeDlls = ["WebView2Loader.dll"];

  for (const fileName of runtimeDlls) {
    const source = path.join(
      root,
      "src-tauri",
      "target",
      "x86_64-pc-windows-gnu",
      "release",
      fileName,
    );

    if (!existsSync(source)) {
      throw new Error(
        `Expected Windows sidecar runtime dependency at ${source}.`,
      );
    }

    cpSync(source, path.join(stageRoot, "sidecar", fileName));
  }
}
