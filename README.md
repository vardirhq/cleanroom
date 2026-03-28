# Cleanroom

Cleanroom is a Tauri 2 desktop workbench for technicians who need to inspect Android phones over ADB, identify likely junk apps, recover hijacked defaults, and document safe cleanup.

## Current state

- Real ADB-backed device discovery, package scanning, cleanup, and reporting are wired.
- The app supports live device tracking, multi-device selection, cleanup guardrails, and persisted reports with JSON, text, and bilingual PDF export.
- Package labels and icons are resolved asynchronously and cached to keep the shell responsive.
- A Linux-to-Windows `x86_64-pc-windows-gnu` cross-build path has been validated for unsigned `.exe` output.

## Development

```bash
pnpm install
pnpm tauri dev
```

Electron migration path:

```bash
pnpm build:electron:sidecar
pnpm electron:dev
```

If `electron:dev` fails with `Electron failed to install correctly`, allow the blocked install script first:

```bash
pnpm approve-builds
```

Electron packaging:

```bash
pnpm dist:electron:linux
pnpm dist:electron:win
```

These package commands stage the platform resources and Rust sidecar into `electron-resources/` before invoking `electron-builder`.

## Quality gate

Frontend:

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Rust:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --all --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Combined:

```bash
pnpm quality
```

Windows packaging:

```bash
pnpm build:windows:portable
pnpm build:windows:installer
```

`pnpm build:windows:installer` requires `makensis`. See [Windows cross-build notes](./docs/windows-cross-build.md).

## Docs

- [Product summary](./docs/product-summary.md)
- [Quality workflow](./docs/quality-workflow.md)
- [Windows cross-build notes](./docs/windows-cross-build.md)
- [Detection philosophy](./docs/detection-philosophy.md)
