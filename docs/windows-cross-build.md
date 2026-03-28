# Windows Cross-Build Notes

Cleanroom can be cross-built from Linux to an unsigned Windows `.exe` using the GNU target. A simple NSIS installer path is also wired into the repo, but it requires `makensis` to be installed on the build machine.

Electron packaging uses a dedicated asset root under `packaging/electron/` rather than reusing the broader Tauri icon directory. Regenerate those assets from `logo.svg` before a release if the branding changes:

```bash
pnpm build:electron:icons
```

## Target

```bash
rustup target add x86_64-pc-windows-gnu
```

## Required packages on Ubuntu/Debian runners

```bash
sudo apt-get update
sudo apt-get install -y \
  gcc-mingw-w64-x86-64 \
  binutils-mingw-w64-x86-64 \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libsoup-3.0-dev \
  libayatana-appindicator3-dev \
  patchelf
```

The MinGW packages provide the `x86_64-w64-mingw32-*` tooling required by the Windows GNU target, including `dlltool`.

## Build command

From the repo root:

```bash
pnpm tauri build --target x86_64-pc-windows-gnu --no-bundle --ci
```

Equivalent package script:

```bash
pnpm build:windows:portable
```

## Output

The plain unsigned executable is produced under:

```text
src-tauri/target/x86_64-pc-windows-gnu/release/cleanroom.exe
```

The release directory also includes `WebView2Loader.dll`, which should travel with the executable for testing on Windows.

Bundled Windows Platform-Tools are copied into:

```text
src-tauri/target/x86_64-pc-windows-gnu/release/platform-tools/windows/
```

## Simple installer

If `makensis` is installed, the repo now includes a simple installer path that packages the working portable release into an unsigned setup executable:

```bash
pnpm build:windows:installer
```

Installer output:

```text
src-tauri/target/windows-installer/cleanroom-<version>-setup.exe
```

The installer includes:

- `cleanroom.exe`
- `WebView2Loader.dll`
- bundled Windows ADB runtime files
- Start Menu and desktop shortcuts
- an uninstaller entry

## Scope

- This path validates the plain `.exe` output only.
- It does not sign the binary.
- Tauri itself does not emit Windows NSIS bundles from this Linux host.
- The NSIS installer path is a manual packaging layer over the working portable Windows release.

## Windows icon verification

After a fresh Electron Windows package build, verify:

- `Cleanroom.exe` shows the expected icon in Explorer
- the taskbar icon matches after launch
- the installer/uninstaller use the same icon

If the build is correct but Windows still shows the wrong icon, test with a renamed artifact first to rule out Explorer/taskbar icon cache issues.
