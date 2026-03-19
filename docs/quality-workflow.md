# Quality Workflow

Cleanroom uses the same local quality gate in development and CI. The goal is to catch regressions in ADB parsing, scan review behavior, cleanup guardrails, and report generation before they land.

## Local commands

Install dependencies once:

```bash
pnpm install
```

Frontend checks:

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Rust checks:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --all --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Combined gate:

```bash
pnpm quality
```

## What is covered today

- Vitest covers scan review filtering and cleanup-plan helpers in `src/lib/scanReview.test.ts`.
- React Testing Library covers device-state gating in `src/components/device/DeviceCard.test.tsx`.
- Rust unit tests cover ADB parsing, rules loading, report export behavior, and scoring regressions around cleaner detection and trusted packages.

## Expectations for new changes

- Add or update tests when behavior changes in scoring, parsing, cleanup blocking, or report generation.
- Prefer small deterministic tests over broad snapshots.
- Keep detection advisory. The quality gate should protect against over-aggressive classification as much as against missing known junk patterns.
- If a workflow change introduces a new command that contributors are expected to run, add it to `package.json`, document it here, and reflect it in CI.
