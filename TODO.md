# Cleanroom TODO

This checklist tracks the current planned work for Cleanroom. Update it when scope changes, work starts, or work ships.

## Current completed foundation

- [x] Restore root project docs after the scaffold overwrite
- [x] Create `README.md` with product overview and local development steps
- [x] Create initial `.gitignore` for Tauri, Rust, Node, and editor artifacts
- [x] Initialize Tauri 2 application shell
- [x] Initialize React + TypeScript frontend
- [x] Add Vite-based frontend build setup
- [x] Add Tailwind CSS and base design tokens
- [x] Add icon system with `lucide-react`
- [x] Wire frontend-to-Tauri command bridge with a typed bootstrap payload
- [x] Establish app shell layout with sidebar, topbar, and content regions
- [x] Create `src/app/`, `src/components/`, `src/pages/`, `src/stores/`, `src/lib/`, and `src/types/`
- [x] Choose Zustand for MVP frontend state
- [x] Create initial Rust command and typed model modules for frontend bootstrap data
- [x] Replace the template demo UI with a Cleanroom dashboard and workflow shells
- [x] Validate the frontend with `pnpm build`
- [x] Validate the Rust backend with `cargo check`

## Repo and project setup

- [x] Define repository conventions for formatting, linting, and testing
- [ ] Add license and contribution docs if this will be shared beyond internal use
- [ ] Create `docs/` for product, ADB, and detection-engine notes
- [ ] Initialize a git repository if this repo is meant to track local history

## App foundation

- [ ] Add client-side routing for Dashboard, Scan Results, Cleanup Session, Reports, and Settings
- [x] Replace the placeholder bootstrap payload with real ADB-backed device bootstrap data
- [x] Replace the centered max-width shell with a full-width desktop window layout
- [x] Add a custom desktop titlebar and premium window chrome treatment
- [ ] Add startup/loading transitions and better failure recovery states

## Frontend architecture

- [x] Build `AppShell` component
- [x] Build `Sidebar` component
- [x] Build `Topbar` component
- [x] Build `DeviceCard` component
- [x] Build `StatusBadge` component
- [x] Build `RiskBadge` component
- [x] Build `ContaminantCard` component
- [x] Build `ScanResultsTable` component
- [x] Build `CleanupSummaryCard` component
- [x] Build `ReportPanel` component
- [x] Build `EmptyState` component
- [x] Build `ConfirmationModal` component
- [ ] Add reusable loading and error-state UI primitives
- [x] Replace empty scan table with live installed-package inventory
- [x] Add filters and grouping controls to scan results
- [x] Add scope filtering so system/OEM packages stay hidden by default but remain reviewable

## Design system and UX

- [x] Define semantic color tokens for background, surface, primary, success, warning, danger, and info
- [x] Define initial typography scale and spacing system
- [x] Define initial radius, border, and shadow system
- [x] Shift the app shell toward a denser native desktop feel with a persistent app rail
- [x] Add a premium dual-theme visual system for dark and light workstation use
- [x] Make launcher/default-app risk warnings visually explicit
- [ ] Add keyboard/focus treatment for technician-heavy workflows
- [ ] Ensure the UI works cleanly on smaller laptop screens with real data volume
- [x] Add theme persistence and a complete light/dark strategy

## Rust backend structure

- [ ] Create `src-tauri/src/commands/` modules for device, scan, cleanup, reports, and settings
- [x] Create `src-tauri/src/services/adb/` for ADB location, execution, and parsing
- [x] Create initial `src-tauri/src/services/device.rs` for current-session device discovery
- [x] Create initial `src-tauri/src/services/package.rs` for package inventory and heuristic flagging
- [x] Create `src-tauri/src/services/detection/` for rules loading and scoring
- [ ] Create `src-tauri/src/services/cleanup/` for uninstall and launcher recovery logic
- [ ] Create `src-tauri/src/services/reports/` for report generation/export
- [x] Create `src-tauri/src/models/` for app bootstrap, device, package, and report types
- [ ] Create `src-tauri/src/storage/` for file-based persistence
- [ ] Create `src-tauri/src/util/` for errors, paths, and logging
- [x] Register the initial real Tauri command surface in `main.rs`

## ADB integration

- [x] Implement ADB discovery strategy for system-installed `adb`
- [ ] Implement bundled sidecar strategy for platform-specific `adb`
- [ ] Add Tauri sidecar configuration and permissions
- [ ] Implement command runner with timeout and retry behavior
- [ ] Capture stdout/stderr and map failures into typed errors
- [x] Support device enumeration via `adb devices`
- [x] Support per-device command targeting
- [x] Add live notification-state inspection via `adb shell dumpsys notification`
- [x] Parse high-importance notification state from `dumpsys notification`
- [x] Parse aggressive notification-channel configuration from `dumpsys notification`
- [x] Obfuscate displayed serial/device identifiers where appropriate
- [ ] Document required udev/device access notes for Linux
- [ ] Plan Windows-specific handling for `adb.exe`, quoting, and drivers

## Device management

- [x] Detect connected Android devices
- [x] Distinguish `disconnected`, `unauthorized`, and `ready` states from real ADB output
- [x] Fetch basic metadata: model, manufacturer, Android version, serial/ID
- [x] Keep current device session state in sync with connection changes
- [x] Show clear UI guidance for ADB authorization failures
- [x] Handle no-device and multi-device states safely
- [x] Require explicit device selection before scan/cleanup when multiple phones are attached

## Package scanning

- [x] List installed packages from the connected device
- [x] Separate probable user apps from system/OEM apps where possible
- [x] Normalize package metadata into Rust and TypeScript models
- [x] Resolve real app labels from APK metadata with heuristic fallback
- [x] Resolve app icons from APK metadata with cached extraction
- [x] Load expensive APK metadata asynchronously after the fast bootstrap scan to avoid blocking the UI
- [x] Show visible background progress while app metadata is still being resolved
- [x] Cache resolved package metadata across refreshes so repeated scans do not re-fetch every app
- [x] Identify apps with launcher/home activities
- [ ] Cache scan results locally for the active session
- [ ] Evaluate whether install recency is reliable enough to include in MVP

## Detection engine

- [ ] Define rules schema for keywords, exact package matches, and heuristic signals
- [x] Create initial `data/rules/keywords.json`
- [x] Create initial `data/rules/known_bad_packages.json`
- [x] Create initial `data/rules/vendor_whitelist.json`
- [x] Implement rules loading from local JSON
- [x] Add package trust modifiers with exact and prefix whitelists
- [x] Implement scoring based on app name keywords
- [x] Implement initial scoring based on package-name patterns
- [x] Implement initial scoring based on exact package matches
- [x] Implement initial launcher-related suspicion scoring
- [x] Incorporate live notification volume as an additional suspicion signal
- [x] Weight high-importance notifications more heavily than low-priority notification volume
- [x] Incorporate aggressive notification-channel configuration as an additional signal
- [x] Gate notification-based suspicion behind candidate signals instead of using it as a primary signal
- [x] Implement category-specific scoring instead of relying on first-match category assignment
- [x] Implement duplicate-junk-category scoring
- [x] Implement suspicious-combination scoring
- [x] Assign initial heuristic categories such as fake cleaner, fake booster, fake optimizer, fake launcher, and fake security app
- [x] Define initial confidence/risk thresholds so weak single-signal hits stay advisory
- [x] Surface rule-match reasons for every flagged app
- [ ] Keep detection advisory only for MVP

## Cleanup workflow

- [x] Support multi-select cleanup selection flow in the UI
- [x] Add protected-package checks before uninstall
- [x] Warn explicitly before removing launcher/default-handler apps
- [x] Prevent obviously unsafe removals by default
- [x] Execute uninstall actions through ADB
- [x] Capture per-app success/failure results
- [x] Log every cleanup action to the session audit trail
- [x] Add rollback notes/guidance where uninstall is not reversible

## Launcher/default recovery

- [ ] Detect suspicious launcher packages
- [ ] Highlight likely fake home apps in scan results from real package data
- [x] Guide technicians to restore the default launcher
- [x] Add quick-open helpers for relevant Android settings where feasible
- [ ] Document vendor/device limitations around launcher recovery

## Reports and persistence

- [x] Define session report schema
- [x] Persist before/after scan state per cleanup session
- [x] Export JSON reports
- [x] Export human-readable text reports
- [x] Add timestamped report filenames
- [x] Show recent report history from persisted data
- [x] Include device info, contaminants, removals, launcher observations, and timestamps
- [x] Add in-app report detail viewing for recorded cleanup sessions
- [x] Decide whether PDF export is post-MVP or part of v1.x
- [x] Export PDF reports in English and Norwegian

## Settings

- [x] Persist ADB source selection: system vs bundled
- [x] Add rules database version display sourced from actual rules data
- [ ] Add theme setting
- [x] Add developer/debug mode
- [x] Add export directory setting
- [x] Persist settings locally

## Testing and quality

- [x] Add Rust unit test setup
- [x] Add Vitest frontend test setup
- [x] Add tests for ADB output parsing
- [x] Add tests for rules loading and scoring
- [x] Add tests for protected-package checks
- [x] Add tests for report generation
- [x] Add basic UI tests for scan results and cleanup warnings
- [x] Add linting/formatting scripts for Rust and frontend code
- [x] Add CI workflow for build, lint, and test

## Packaging and distribution

- [ ] Set Linux as the first supported release target
- [ ] Add GitHub Actions build workflow for Tauri bundles
- [x] Validate Linux-to-Windows `x86_64-pc-windows-gnu` cross-build
- [ ] Plan Windows packaging prerequisites and release workflow
- [ ] Bundle platform-specific `adb` binaries if sidecar strategy is chosen
- [ ] Decide updater strategy for future releases

## Documentation

- [x] Keep the root project summary in the repo
- [x] Create `docs/product-summary.md`
- [ ] Create `docs/adb-notes.md`
- [ ] Create `docs/detection-rules.md`
- [x] Document the Linux-to-Windows Tauri cross-build prerequisites and artifact path
- [x] Document the detection philosophy and human-review requirement
- [x] Document the focused product scope and adjacency rule
- [ ] Document false-positive risk and technician guardrails
- [ ] Document release/platform support policy

## Future milestones

- [ ] Keep future feature work limited to junk-app remediation adjacencies
- [ ] Add better contamination categories for v1.5
- [ ] Add technician cleanup presets
- [ ] Add vendor-specific whitelist profiles
- [ ] Add cloud-updated contamination database for v2
- [ ] Add offline signature update packs
- [ ] Add device brand profiles
- [ ] Add CLI mode
- [ ] Add bench mode for multiple phones
- [ ] Evaluate a companion Android helper app later
