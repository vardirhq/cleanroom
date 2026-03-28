#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SVG="$ROOT_DIR/logo.svg"
OUTPUT_DIR="$ROOT_DIR/packaging/electron"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 'magick' is required to prepare Electron icons." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

SIZES=(16 24 32 48 64 128 256 512)

for size in "${SIZES[@]}"; do
  magick \
    -background none \
    -density 384 \
    "$SOURCE_SVG" \
    -resize "${size}x${size}" \
    -gravity center \
    -extent "${size}x${size}" \
    "$TMP_DIR/${size}.png"
done

magick \
  "$TMP_DIR/16.png" \
  "$TMP_DIR/24.png" \
  "$TMP_DIR/32.png" \
  "$TMP_DIR/48.png" \
  "$TMP_DIR/64.png" \
  "$TMP_DIR/128.png" \
  "$TMP_DIR/256.png" \
  "$OUTPUT_DIR/icon.ico"

cp "$TMP_DIR/512.png" "$OUTPUT_DIR/icon.png"

echo "Prepared Electron packaging icons in $OUTPUT_DIR"
