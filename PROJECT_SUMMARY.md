Here’s the full project summary for **Cleanroom**. Since we’re pretending to be competent adults, I’ve written it like something you could hand to Cursor, Codex, or your future self after three days of bad sleep.

## 1. Direct answer

**Cleanroom** is a cross-platform desktop technician tool built with **Tauri 2 + Rust + React + TypeScript**. It connects to Android phones over **ADB**, scans installed apps, flags likely junk such as fake cleaner/booster/optimizer/launcher apps, helps the technician remove them safely, and guides recovery of hijacked defaults like fake home launchers. ADB is the right backbone here because it is the standard Android tool for communicating with devices and running shell/package actions from a desktop. Tauri 2 is a strong fit because it supports a web frontend with native backend logic and sidecar binaries, which is useful for bundling or invoking external tools like `adb`. ([Android Developers][1])

The core product value is **not** “a GUI for ADB.” The value is:

- a **junk-app detection engine**
- a **safe technician workflow**
- a **launcher/default-app recovery flow**
- a **clean before/after service report**

## 2. Project summary

### Product name

**Cleanroom**

### Tagline

**Decontaminate Android devices from junk apps.**

### One-sentence pitch

Cleanroom is a desktop support tool that detects and removes suspicious cleaner, booster, optimizer, and fake launcher apps from Android phones using ADB, with a safe technician-focused workflow and recovery guidance.

### Problem it solves

Customers, especially elderly or anxious users, often install multiple “cleaner,” “booster,” “security,” and “simple launcher” apps that clutter the phone, spam notifications, hijack the home screen, and make the device feel broken. Support staff then waste time manually hunting through app lists, uninstalling junk one by one, and restoring defaults.

### Solution

Cleanroom connects over USB with ADB, inspects installed packages, identifies likely junk using curated signatures plus heuristics, lets the technician remove selected apps, highlights suspicious launchers/default handlers, and produces a cleanup report.

## 3. Scope and positioning

### What Cleanroom is

A **desktop support utility** for technicians, repair benches, and internal service use, specifically focused on **junk-app remediation** and adjacent recovery/reporting work.

### What Cleanroom is not

Not an antivirus.
Not a consumer one-tap magic optimizer.
Not a general Android bench utility for every repair or diagnostics task.
Not a Play Store Android app trying to inspect all installed packages from inside Android, which is exactly where Android 11+ package visibility restrictions become annoying. A desktop ADB tool avoids that whole sandbox problem. ([Android Developers][2])

### Scope rule

Cleanroom should expand only into **focused adjacencies** that directly improve junk-app remediation:

- better junk detection
- safer cleanup
- launcher/default recovery
- notification-spam diagnosis
- technician reporting and auditability

If a feature does not help identify, remove, recover from, or document junk-app contamination, it should be treated as out of scope by default.

## 4. MVP feature set

### Device connection

- Detect connected Android devices
- Show connection state: disconnected, unauthorized, ready
- Show basic device info: model, manufacturer, Android version, serial/obfuscated ID

ADB is built for device communication and shell access, so this is standard territory. ([Android Developers][1])

### App inventory

- Pull installed package list from device
- Separate user apps from system/OEM apps where possible
- Cache scan results locally per session

### Junk detection engine

- Score apps using:
  - app name keywords
  - package-name patterns
  - known-bad package list
  - launcher-related suspicion
  - duplicate junk categories installed at once
  - optionally install recency if obtainable reliably per vendor/device

### Cleanup workflow

- Multi-select suspicious apps
- Uninstall selected apps through ADB
- Warn before removing potential launcher/default apps
- Protect obvious system packages
- Log every action taken

### Launcher/default recovery

- Detect suspicious launcher packages
- Highlight likely fake home apps
- Guide technician to restore default launcher
- Offer quick-open actions for Android settings screens where feasible

ADB is commonly used to run shell/package commands and reset states around defaults and app links, so using it to help recover launcher/default flows is practical. ([Android Developers][1])

### Report export

- Before/after summary
- Device info
- Contaminants found
- Apps removed
- Launcher/default observations
- Timestamped service report export as JSON and human-readable text/PDF later

## 5. Future feature set

### v1.5

- Better categories: fake cleaners, fake launchers, ad-spam apps, duplicate utility apps
- Technician presets such as “safe cleanup”
- Whitelist system/OEM packages by vendor profile

### v2

- Windows release
- Cloud-updated contamination database
- Device brand profiles for Samsung/Xiaomi/Motorola/etc.
- “Open relevant Android settings” helpers
- Optional offline signature updates via bundled JSON packs

### Possible later ideas

- Portable mode for service desks
- Internal note system for technician remarks
- CLI mode for power users
- Bench mode for handling multiple phones in a session
- Companion Android helper app, but only later, because desktop is the real product

The point of those later ideas is still to support the same remediation workflow, not to turn Cleanroom into a generic Android toolbox.

## 6. Tech stack

### Core stack

**Desktop shell:** Tauri 2
**Backend/core engine:** Rust
**Frontend:** React + TypeScript + Vite
**Styling:** Tailwind CSS
**State management:** Zustand or simple React context/store
**Icons:** Lucide React
**Data serialization:** Serde + serde_json
**Local persistence:** JSON files first, SQLite later if needed
**Testing:** Rust unit tests + Vitest for frontend
**Build/distribution:** GitHub Actions + Tauri bundling

Tauri 2 is built around a web frontend plus native code and supports sidecars and updater workflows. Serde/serde_json are the standard Rust ecosystem tools for typed serialization and JSON handling. Tauri also documents GitHub Actions distribution and updater support. ([Tauri][3])

### ADB integration approach

Use **ADB from Android Platform-Tools**. Either:

1. detect an existing `adb` on the system, or
2. bundle a known compatible `adb` binary as a sidecar per platform

Platform-Tools is the official package that includes `adb`, and Tauri supports packaging external binaries as sidecars with explicit permissions. ([Android Developers][4])

### Recommended architecture

Frontend and backend should be clearly split:

- **Frontend**
  - device dashboard
  - scan results UI
  - cleanup selection flow
  - report view
  - settings

- **Rust core**
  - adb process wrapper
  - command execution
  - output parsing
  - rules/scoring engine
  - cleanup orchestration
  - report generation
  - file persistence

## 7. Architecture overview

### High-level modules

#### 1. `adb_core`

Responsible for:

- locating bundled/system `adb`
- running commands
- handling stdout/stderr
- timeout/retry behavior
- parsing device/package responses

#### 2. `device_service`

Responsible for:

- connected device detection
- device metadata
- current device session state
- authorized vs unauthorized handling

#### 3. `package_service`

Responsible for:

- listing installed packages
- app metadata normalization
- identifying launchers
- distinguishing probable system/user apps

#### 4. `detection_engine`

Responsible for:

- loading rules/signatures
- scoring apps
- assigning categories
- generating confidence levels

#### 5. `cleanup_service`

Responsible for:

- uninstall orchestration
- protected-package checks
- launcher warnings
- execution results
- rollback notes where possible

#### 6. `report_service`

Responsible for:

- session summary
- export formats
- audit trail/logging

#### 7. `settings_service`

Responsible for:

- adb path strategy
- theme
- signature updates
- internal app preferences

## 8. Suggested folder structure

```text
cleanroom/
  src/
    app/
    components/
      layout/
      device/
      scan/
      cleanup/
      report/
      ui/
    pages/
      Dashboard.tsx
      ScanResults.tsx
      CleanupSession.tsx
      Reports.tsx
      Settings.tsx
    stores/
      useDeviceStore.ts
      useScanStore.ts
      useSettingsStore.ts
    hooks/
    lib/
      api.ts
      format.ts
      constants.ts
    types/
      device.ts
      package.ts
      report.ts
      rules.ts
  src-tauri/
    src/
      main.rs
      commands/
        device.rs
        scan.rs
        cleanup.rs
        reports.rs
        settings.rs
      services/
        adb/
          mod.rs
          runner.rs
          parser.rs
        detection/
          mod.rs
          rules.rs
          scoring.rs
        cleanup/
          mod.rs
          uninstall.rs
          launcher.rs
        reports/
          mod.rs
          export.rs
      models/
        device.rs
        package.rs
        report.rs
        rules.rs
      storage/
        mod.rs
        files.rs
      util/
        errors.rs
        paths.rs
        logging.rs
    capabilities/
    icons/
    tauri.conf.json
  data/
    rules/
      keywords.json
      known_bad_packages.json
      vendor_whitelist.json
  docs/
    product-summary.md
    adb-notes.md
    detection-rules.md
```

## 9. Detection model

This is the part that makes Cleanroom worth building.

### Detection categories

- Fake cleaner
- Fake booster
- Fake optimizer
- Fake battery saver
- Fake security app
- Fake launcher / simple home replacement
- Ad-spam utility
- Duplicate junk utility

### Scoring inputs

Start simple:

- keyword in display name
- keyword in package name
- known-bad package exact match
- known-bad developer/publisher pattern if obtainable
- app exposes launcher/home activity unexpectedly
- multiple suspicious apps of same category installed
- suspicious combinations like cleaner + booster + antivirus + launcher all at once

### Example risk levels

- **0-1**: probably safe
- **2-4**: suspicious
- **5-7**: likely junk
- **8+**: high-risk contaminant

### Example rules data

```json
{
  "rules": [
    {
      "type": "keyword",
      "field": "name",
      "value": "cleaner",
      "score": 2,
      "category": "fake_cleaner"
    },
    {
      "type": "keyword",
      "field": "name",
      "value": "booster",
      "score": 2,
      "category": "fake_booster"
    },
    {
      "type": "keyword",
      "field": "name",
      "value": "optimizer",
      "score": 2,
      "category": "fake_optimizer"
    },
    {
      "type": "keyword",
      "field": "package",
      "value": "launcher",
      "score": 2,
      "category": "fake_launcher"
    },
    {
      "type": "exact_package",
      "value": "com.example.supercleaner",
      "score": 10,
      "category": "fake_cleaner"
    }
  ]
}
```

### Important safety rule

Detection should be **advisory**, not fully automatic, at least in MVP. Human-reviewed removal is the right call. Your January 2026 hiring-product principle about visible human accountability applies here too, just in a different circus tent.

## 10. UX and workflow

### Primary technician flow

1. Connect phone over USB
2. Device appears in Cleanroom
3. Technician starts scan
4. Cleanroom lists contaminants with risk score
5. Technician reviews grouped results
6. Technician selects apps to remove
7. Cleanroom runs cleanup
8. Cleanroom shows post-clean state and report

### Key UX rules

- Never default to removing everything automatically
- Hide safe/system apps by default
- Make launcher risk extremely obvious
- Show confidence and reason for every flagged app
- Keep actions reversible in the sense of auditability, even if uninstall itself is not trivially reversible

## 11. Design system

You said I could include one, so here’s the part where I save you from inventing six nearly identical gray cards and calling it a system.

### Design direction

**Clinical utility software**
Think: clean, controlled, calm, trustworthy.
Not cyberpunk. Not “hacker terminal.” Not fake antivirus nonsense.

### Visual tone

- sterile
- modern
- low-noise
- slightly technical
- support-desk friendly

### Color roles

Use semantic tokens, not hardcoded chaos:

- **Background:** soft cool gray
- **Surface:** white / deep slate in dark mode
- **Primary:** muted blue
- **Success:** clean green
- **Warning:** amber
- **Danger:** restrained red
- **Info:** steel/cyan accent

### Suggested feel

The whole app should feel like:
“we inspect, isolate, remove, verify.”

### Typography

- **UI font:** Inter
- Clear hierarchy, no decorative nonsense
- Slightly dense but readable, since this is a tool, not a landing page

### Radius / spacing

- radius: 14px to 18px
- generous padding on cards
- tight but readable tables/lists

### Core components

- `AppShell`
- `Sidebar`
- `Topbar`
- `DeviceCard`
- `StatusBadge`
- `RiskBadge`
- `ContaminantCard`
- `ScanResultsTable`
- `CleanupSummaryCard`
- `ReportPanel`
- `EmptyState`
- `ConfirmationModal`

### UI labels

Lean into the Cleanroom concept lightly:

- **Device status**
- **Scan in progress**
- **Contaminants detected**
- **Decontamination plan**
- **Clean state**
- **Protected packages**
- **Launcher risk**

Do not overdo it. One tasteful metaphor is branding. Ten is roleplay.

## 12. Main screens

### Dashboard

Shows:

- connection status
- current device info
- quick action to scan
- recent reports

### Scan Results

Shows:

- grouped contaminants
- risk scores
- rule-match reasons
- filters by category and confidence

### Cleanup Session

Shows:

- selected removals
- launcher warnings
- execution progress
- success/failure states

### Reports

Shows:

- previous sessions
- exported summaries
- before/after comparison

### Settings

Shows:

- adb source: bundled vs system
- rules database version
- theme
- developer/debug mode
- export directory

## 13. Cross-platform strategy

### Linux first

Good first target because:

- friendly for dev workflow
- packaging is manageable
- ADB usage is straightforward
- Tauri is well suited here ([Tauri][3])

### Windows second

Plan it from day one:

- bundled `adb.exe`
- path handling
- quoting/process spawning
- installer/signing later
- driver/help text for devices where Windows behaves like Windows

Tauri has documented Windows packaging prerequisites and GitHub build pipelines, so supporting Windows is realistic. ([Tauri][5])

## 14. Risks and constraints

### Technical risks

- Vendor-specific Android quirks
- Package parsing inconsistency across devices
- Launcher detection edge cases
- ADB authorization friction
- Windows device driver nonsense

### Product risks

- Over-aggressive detection causing false positives
- Removing apps users actually wanted
- Support staff trusting automation too much
- Rules database aging badly without maintenance

### Policy/legal positioning

Because this is a desktop technician tool using ADB instead of an Android app inspecting all installed packages from inside Android, it avoids much of the Android 11+ package visibility problem that affects on-device apps. That said, any future companion Android app would need to respect those package visibility rules. ([Android Developers][2])

## 15. MVP implementation plan

### Phase 1: foundation

- Tauri app shell
- React UI scaffold
- Rust command bridge
- ADB detection and command runner
- connect/disconnect device state

### Phase 2: scan engine

- installed package listing
- normalization into Rust models
- basic JSON rules loading
- scoring engine v1

### Phase 3: cleanup flow

- multi-select uninstall
- protected package checks
- launcher warnings
- action logs

### Phase 4: reports

- session report generation
- export to JSON/text
- recent history UI

### Phase 5: polish

- dark mode
- refined tables and filters
- better error states
- Windows compatibility pass

## 16. Suggested repo summary for Codex/Cursor

**Project:** Cleanroom
**Type:** Cross-platform desktop Android cleanup utility
**Stack:** Tauri 2, Rust, React, TypeScript, Tailwind
**Primary function:** Detect and remove suspicious cleaner/booster/optimizer/launcher apps from Android phones over ADB
**Primary users:** Technicians, repair desks, internal support staff
**Core differentiator:** Rules-based junk-app detection plus safe launcher/default recovery workflow
**Platforms:** Linux first, Windows second
**Architecture:** Rust backend for ADB/process/scoring/reporting, React frontend for technician workflow
**Data:** Local JSON rules/signatures and local session reports
**MVP goal:** One connected device, one scan, one guided cleanup session, one exported report

## 17. Practical summary / action plan

Build **Cleanroom** as a **Tauri 2 + Rust desktop app** with a **React/TypeScript frontend**. Use **official Android Platform-Tools ADB** as the communication layer. Keep the MVP focused on **device detection, package scanning, junk scoring, technician-reviewed uninstall, launcher warnings, and report export**. Tauri sidecars are a good fit if you bundle `adb`, and Serde/JSON rules make the detection engine easy to evolve over time. ([Tauri][6])

The smart move is to treat this as a **serious bench utility**, not a flashy consumer app. Clinical UI. Strong guardrails. Human-reviewed cleanup. That’s the product.

If you want, next I’ll turn this into a **proper README / product spec document for the repo**, with folder structure, feature checklist, and starter schema files.

[1]: https://developer.android.com/tools/adb?utm_source=chatgpt.com "Android Debug Bridge (adb) | Android Studio"
[2]: https://developer.android.com/training/package-visibility?utm_source=chatgpt.com "Package visibility filtering on Android | App architecture"
[3]: https://v2.tauri.app/start/?utm_source=chatgpt.com "What is Tauri?"
[4]: https://developer.android.com/tools/releases/platform-tools?utm_source=chatgpt.com "SDK Platform Tools release notes | Android Studio"
[5]: https://v2.tauri.app/start/prerequisites/?utm_source=chatgpt.com "Prerequisites"
[6]: https://v2.tauri.app/develop/sidecar/?utm_source=chatgpt.com "Embedding External Binaries"
