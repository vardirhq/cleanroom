import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  shell,
} from "electron";
import { SidecarClient } from "./sidecarClient.js";

const sidecar = new SidecarClient();
let mainWindow: BrowserWindow | null = null;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function createMainWindow() {
  const window = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: "#0f172a",
    frame: false,
    height: 960,
    icon: resolveWindowIcon(),
    minHeight: 760,
    minWidth: 1180,
    show: false,
    title: "Cleanroom",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(moduleDir, "preload.js"),
      sandbox: false,
    },
    width: 1440,
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      writeDiagnosticLog(
        `Renderer console [${level}] ${message} (${sourceId}:${line})`,
      );
    },
  );

  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      writeDiagnosticLog(
        `Renderer failed to load (${errorCode}) ${errorDescription}; url=${validatedURL}; mainFrame=${String(isMainFrame)}`,
      );
    },
  );

  window.webContents.on("did-finish-load", () => {
    writeDiagnosticLog("Renderer finished loading.");
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    writeDiagnosticLog(
      `Renderer process gone: reason=${details.reason}; exitCode=${details.exitCode}`,
    );
  });

  window.on("unresponsive", () => {
    writeDiagnosticLog("Main window became unresponsive.");
  });

  const broadcastWindowState = () => {
    window.webContents.send("cleanroom:window-resized");
  };

  window.on("resize", broadcastWindowState);
  window.on("maximize", broadcastWindowState);
  window.on("unmaximize", broadcastWindowState);

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    writeDiagnosticLog(`Loading renderer URL ${rendererUrl}`);
    void window.loadURL(rendererUrl).catch((error: unknown) => {
      writeDiagnosticLog(
        `Failed to load renderer URL: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
      );
    });
  } else {
    const rendererPath = path.join(resolveAppRoot(), "dist", "index.html");
    writeDiagnosticLog(`Loading renderer file ${rendererPath}`);
    void window.loadFile(rendererPath).catch((error: unknown) => {
      writeDiagnosticLog(
        `Failed to load renderer file: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
      );
    });
  }

  return window;
}

function resolveWindowIcon() {
  const iconPath =
    process.platform === "win32"
      ? path.join(resolveIconsRoot(), "icon.ico")
      : path.join(resolveIconsRoot(), "128x128.png");

  writeDiagnosticLog(`Resolving window icon from ${iconPath}`);

  return nativeImage.createFromPath(iconPath);
}

function resolveAppRoot() {
  return app.isPackaged ? app.getAppPath() : process.cwd();
}

function resolveIconsRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icons");
  }

  return path.join(process.cwd(), "src-tauri", "icons");
}

function resolveLogPath() {
  return path.join(app.getPath("userData"), "cleanroom-electron.log");
}

function writeDiagnosticLog(message: string) {
  try {
    fs.mkdirSync(path.dirname(resolveLogPath()), { recursive: true });
    fs.appendFileSync(
      resolveLogPath(),
      `[${new Date().toISOString()}] ${message}\n`,
      "utf8",
    );
  } catch {
    // Ignore logging failures.
  }
}

function registerIpc() {
  ipcMain.handle("cleanroom:invoke", async (_event, method, params) => {
    try {
      return await sidecar.invoke(
        method as string,
        params as Record<string, unknown>,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown sidecar invocation failure";
      writeDiagnosticLog(`IPC invoke failed for ${String(method)}: ${message}`);
      throw new Error(message, { cause: error });
    }
  });

  ipcMain.handle("cleanroom:open-path", async (_event, targetPath: string) => {
    await shell.openPath(targetPath);
  });

  ipcMain.handle(
    "cleanroom:reveal-item-in-dir",
    async (_event, targetPath: string) => {
      shell.showItemInFolder(targetPath);
    },
  );

  ipcMain.handle("cleanroom:window:minimize", async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle("cleanroom:window:toggle-maximize", async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return;
    }

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle("cleanroom:window:close", async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle("cleanroom:window:is-maximized", async (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
}

async function boot() {
  await app.whenReady();
  if (process.platform === "win32") {
    app.setAppUserModelId("dev.madsens.cleanroom");
  }
  writeDiagnosticLog("Electron app booting.");
  registerIpc();
  await sidecar.start();

  sidecar.on("sidecar-error", (payload: unknown) => {
    writeDiagnosticLog(`Sidecar error: ${String(payload)}`);
  });

  sidecar.on("sidecar-exit", (payload: unknown) => {
    writeDiagnosticLog(`Sidecar exit: ${JSON.stringify(payload)}`);
  });

  sidecar.on("device-state-changed", (payload: unknown) => {
    mainWindow?.webContents.send("cleanroom:device-state-changed", payload);
  });

  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
}

app.on("window-all-closed", async () => {
  await sidecar.stop();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

void boot().catch((error) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  writeDiagnosticLog(`Fatal boot error: ${message}`);
  throw error;
});
