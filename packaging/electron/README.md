# Electron Packaging Assets

This directory is the dedicated Electron packaging asset root.

- `icon.ico` is the Windows executable and installer icon source.
- `icon.png` is the generic Electron packaging icon source for Linux and other fallback packaging flows.

Regenerate these files from `logo.svg` with:

```bash
bash ./scripts/prepare-electron-icons.sh
```
