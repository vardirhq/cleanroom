import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSidecarClient } from "./sidecar.js";
import { writeDiagnosticLog } from "./diagnostics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sidecar = createSidecarClient();

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    title: "Cleanroom",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
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
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  void sidecar.dispose();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
