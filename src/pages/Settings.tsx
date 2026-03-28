import { useState } from "react";
import { FolderCog, Save, ShieldAlert, Wrench } from "lucide-react";
import { useDeviceStore } from "../stores/useDeviceStore";
import { useSettingsStore } from "../stores/useSettingsStore";

export function SettingsPage() {
  const bootstrap = useDeviceStore((state) => state.bootstrap);
  const activeDeviceSerial = useDeviceStore(
    (state) => state.activeDeviceSerial,
  );
  const adbStrategy = useSettingsStore((state) => state.adbStrategy);
  const developerMode = useSettingsStore((state) => state.developerMode);
  const effectiveExportDirectory = useSettingsStore(
    (state) => state.effectiveExportDirectory,
  );
  const exportDirectory = useSettingsStore((state) => state.exportDirectory);
  const saveOperationalSettings = useSettingsStore(
    (state) => state.saveOperationalSettings,
  );
  const setAdbStrategy = useSettingsStore((state) => state.setAdbStrategy);
  const setDeveloperMode = useSettingsStore((state) => state.setDeveloperMode);
  const setExportDirectory = useSettingsStore(
    (state) => state.setExportDirectory,
  );
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const persistOperationalSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await saveOperationalSettings();
      setSaveMessage("Operational settings saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workbench-page">
      <section className="page-hero">
        <div className="page-hero__header">
          <div className="max-w-4xl">
            <p className="panel-kicker">Workbench settings</p>
            <h2 className="page-hero__title">Operational controls</h2>
            <p className="page-hero__description">
              Keep the support disk predictable: choose how Cleanroom resolves
              ADB, where it writes reports, and whether diagnostics are visible
              on this workstation.
            </p>
          </div>
          <div className="page-hero__actions">
            <button
              className="ui-button"
              disabled={isSaving}
              onClick={() => void persistOperationalSettings()}
              type="button"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving" : "Save settings"}
            </button>
          </div>
        </div>
      </section>

      <div className="settings-layout">
        <section className="workbench-panel">
          <p className="panel-copy mt-0">
            Keep the support disk predictable: choose how Cleanroom resolves
            ADB, where it writes reports, and whether developer diagnostics are
            visible on this workstation. Bundled ADB is the default zero-setup
            path.
          </p>

          <div className="mt-6">
            <h4 className="panel-title">Theme mode</h4>
            <div className="device-grid mt-4 md:grid-cols-3">
              {(["dark", "light", "system"] as const).map((option) => (
                <button
                  className={`device-select-card ${
                    themeMode === option ? "device-select-card--active" : ""
                  }`}
                  key={option}
                  onClick={() => setThemeMode(option)}
                  type="button"
                >
                  <div className="info-card__label text-left">{option}</div>
                  <div className="mt-2 text-sm leading-6 text-text-muted">
                    {option === "dark"
                      ? "Optimized for focused bench work and lower visual glare."
                      : option === "light"
                        ? "Brighter desk-software presentation for shared support environments."
                        : "Follow the workstation preference automatically."}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="panel-title">ADB strategy</h4>
            <div className="device-grid mt-4">
              {(["system", "bundled"] as const).map((option) => (
                <button
                  className={`device-select-card ${
                    adbStrategy === option ? "device-select-card--active" : ""
                  }`}
                  key={option}
                  onClick={() => setAdbStrategy(option)}
                  type="button"
                >
                  <div className="info-card__label text-left">{option}</div>
                  <div className="mt-2 text-sm leading-6 text-text-muted">
                    {option === "system"
                      ? "Use the workstation Platform-Tools installation as an explicit override for advanced diagnostics."
                      : "Use the ADB binary packaged with Cleanroom. This is the default and recommended zero-setup path."}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <FolderCog className="h-4 w-4 text-info" />
              <h4 className="panel-title">Export directory</h4>
            </div>
            <p className="panel-copy">
              Reports, text exports, and PDFs are written here. Leave blank to
              use the default Cleanroom reports folder.
            </p>
            <input
              className="ui-input mt-4 px-4"
              onChange={(event) => setExportDirectory(event.target.value)}
              placeholder="Default reports directory"
              type="text"
              value={exportDirectory}
            />
            <div className="info-card mt-3">
              Effective directory:{" "}
              <span className="text-text">
                {effectiveExportDirectory ?? "Loading..."}
              </span>
            </div>
          </div>

          <div className="info-card mt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-warning" />
                  <h4 className="panel-title">Developer diagnostics</h4>
                </div>
                <p className="panel-copy">
                  Show low-level support data such as selected serial, rules
                  version, and ADB diagnostics in this page.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-text">
                <input
                  checked={developerMode}
                  className="h-4 w-4 accent-sky-500"
                  onChange={(event) => setDeveloperMode(event.target.checked)}
                  type="checkbox"
                />
                Enabled
              </label>
            </div>
          </div>

          <div className="inline-actions mt-6">
            {saveMessage ? (
              <span className="text-sm text-text-muted">{saveMessage}</span>
            ) : null}
          </div>
        </section>

        <section className="workbench-panel">
          <p className="section-kicker">Workbench status</p>
          <h3 className="panel-title mt-3">Runtime and diagnostics</h3>
          <div className="package-list mt-4">
            <div className="settings-card text-sm text-text-muted">
              <div className="info-card__label">Rules database version</div>
              <div className="mt-2 text-lg font-semibold text-text">
                {bootstrap?.app.rulesVersion ?? "Unknown"}
              </div>
            </div>
            <div className="settings-card text-sm text-text-muted">
              <div className="info-card__label">Active ADB path</div>
              <div className="mt-2 break-all text-sm text-text">
                {bootstrap?.app.adbPath ?? "ADB not detected"}
              </div>
            </div>
            {developerMode ? (
              <div className="settings-card border-warning/30 bg-warning/8 text-sm text-text-muted">
                <div className="flex items-center gap-2 text-text">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  Developer diagnostics
                </div>
                <div className="mt-3 grid gap-2">
                  <div>Selected device serial: {activeDeviceSerial ?? "None"}</div>
                  <div>Connected devices: {bootstrap?.app.deviceCount ?? 0}</div>
                  <div>Platform: {bootstrap?.app.platform ?? "Unknown"}</div>
                  <div>ADB mode: {adbStrategy}</div>
                </div>
              </div>
            ) : (
              <div className="settings-card text-sm text-text-muted">
                Developer diagnostics are hidden on this workstation.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
