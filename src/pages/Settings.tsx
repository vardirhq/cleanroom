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
    <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <section className="glass-panel rounded-[28px] p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
          Workbench settings
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-text">
          Operational controls
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Keep the support disk predictable: choose how Cleanroom resolves ADB,
          where it writes reports, and whether developer diagnostics are visible
          on this workstation.
        </p>

        <div className="mt-6">
          <h4 className="text-base font-semibold text-text">Theme mode</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(["dark", "light", "system"] as const).map((option) => (
              <button
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  themeMode === option
                    ? "border-primary bg-primary-strong/12 text-text"
                    : "border-line bg-surface-soft text-text-muted hover:bg-panel-soft"
                }`}
                key={option}
                onClick={() => setThemeMode(option)}
                type="button"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.16em]">
                  {option}
                </div>
                <div className="mt-2 text-sm leading-6">
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
          <h4 className="text-base font-semibold text-text">ADB strategy</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(["system", "bundled"] as const).map((option) => (
              <button
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  adbStrategy === option
                    ? "border-primary bg-primary-strong/12 text-text"
                    : "border-line bg-surface-soft text-text-muted hover:bg-panel-soft"
                }`}
                key={option}
                onClick={() => setAdbStrategy(option)}
                type="button"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.18em]">
                  {option}
                </div>
                <div className="mt-2 text-sm leading-6">
                  {option === "system"
                    ? "Use the workstation Platform-Tools installation. This is the current effective path."
                    : "Persist a preference for packaged sidecars once bundled ADB is enabled."}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2">
            <FolderCog className="h-4 w-4 text-info" />
            <h4 className="text-base font-semibold text-text">
              Export directory
            </h4>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Reports, text exports, and PDFs are written here. Leave blank to use
            the default Cleanroom reports folder.
          </p>
          <input
            className="mt-4 w-full rounded-[16px] border border-line bg-surface-soft px-4 py-3 text-sm text-text outline-none transition focus:border-primary"
            onChange={(event) => setExportDirectory(event.target.value)}
            placeholder="Default reports directory"
            type="text"
            value={exportDirectory}
          />
          <div className="mt-3 rounded-[16px] border border-line bg-surface-soft px-4 py-3 text-sm text-text-muted">
            Effective directory:{" "}
            <span className="text-text">
              {effectiveExportDirectory ?? "Loading..."}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-[22px] border border-line bg-surface-soft p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-warning" />
                <h4 className="text-base font-semibold text-text">
                  Developer diagnostics
                </h4>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-line bg-panel px-4 py-2.5 text-sm font-medium text-text transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void persistOperationalSettings()}
            type="button"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving" : "Save operational settings"}
          </button>
          {saveMessage ? (
            <span className="text-sm text-text-muted">{saveMessage}</span>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-6">
        <h3 className="text-lg font-semibold text-text">Workbench status</h3>
        <div className="mt-4 grid gap-3">
          <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
            Rules database version
            <div className="mt-2 text-lg font-semibold text-text">
              {bootstrap?.app.rulesVersion ?? "Unknown"}
            </div>
          </div>
          <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
            Active ADB path
            <div className="mt-2 break-all text-sm text-text">
              {bootstrap?.app.adbPath ?? "ADB not detected"}
            </div>
          </div>
          {developerMode ? (
            <div className="rounded-[18px] border border-warning/30 bg-warning/8 p-4 text-sm text-text-muted">
              <div className="flex items-center gap-2 text-text">
                <ShieldAlert className="h-4 w-4 text-warning" />
                Developer diagnostics
              </div>
              <div className="mt-3 grid gap-2">
                <div>
                  Selected device serial: {activeDeviceSerial ?? "None"}
                </div>
                <div>Connected devices: {bootstrap?.app.deviceCount ?? 0}</div>
                <div>Platform: {bootstrap?.app.platform ?? "Unknown"}</div>
                <div>ADB mode preference: {adbStrategy}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-line bg-surface-soft p-4 text-sm text-text-muted">
              Developer diagnostics are hidden on this workstation.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
