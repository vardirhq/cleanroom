# Windows Cross-Build Notes

Cleanroom can be cross-built from Linux to an unsigned Windows `.exe` using the GNU target.

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

## Output

The plain unsigned executable is produced under:

```text
src-tauri/target/x86_64-pc-windows-gnu/release/cleanroom.exe
```

The release directory also includes `WebView2Loader.dll`, which should travel with the executable for testing on Windows.

## Scope

- This path validates the plain `.exe` output only.
- It does not sign the binary.
- It does not build an installer.
- Bundled `adb.exe` sidecar work is still separate from this cross-build path.
