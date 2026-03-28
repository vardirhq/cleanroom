#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release"
OUTPUT_DIR="$ROOT_DIR/src-tauri/target/windows-installer"
NSIS_SCRIPT="$ROOT_DIR/packaging/windows/cleanroom-installer.nsi"
ICON_PATH="$ROOT_DIR/src-tauri/icons/icon.ico"
APP_NAME="Cleanroom"
APP_VERSION="$(node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version")"

if ! command -v makensis >/dev/null 2>&1; then
  echo "makensis is required to build the Windows installer." >&2
  echo "Install NSIS first, then rerun pnpm build:windows:installer." >&2
  exit 1
fi

if [[ ! -f "$RELEASE_DIR/cleanroom.exe" ]]; then
  echo "Portable Windows release not found. Building it first..."
  (cd "$ROOT_DIR" && pnpm build:windows:portable)
fi

for required in \
  "$RELEASE_DIR/cleanroom.exe" \
  "$RELEASE_DIR/WebView2Loader.dll" \
  "$RELEASE_DIR/platform-tools/windows/adb.exe" \
  "$RELEASE_DIR/platform-tools/windows/AdbWinApi.dll" \
  "$RELEASE_DIR/platform-tools/windows/AdbWinUsbApi.dll"
do
  if [[ ! -f "$required" ]]; then
    echo "Missing required Windows runtime file: $required" >&2
    exit 1
  fi
done

mkdir -p "$OUTPUT_DIR"

makensis \
  -DAPP_NAME="$APP_NAME" \
  -DAPP_VERSION="$APP_VERSION" \
  -DSOURCE_DIR="$RELEASE_DIR" \
  -DOUTPUT_DIR="$OUTPUT_DIR" \
  -DICON_PATH="$ICON_PATH" \
  "$NSIS_SCRIPT"
