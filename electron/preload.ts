import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("cleanroom", {
  invoke: <T>(method: string, params?: Record<string, unknown>) =>
    ipcRenderer.invoke("cleanroom:invoke", method, params) as Promise<T>,
  onDeviceStateChanged: async (listener: () => void) => {
    const wrapped = () => listener();
    ipcRenderer.on("cleanroom:device-state-changed", wrapped);
    return () => {
      ipcRenderer.removeListener("cleanroom:device-state-changed", wrapped);
    };
  },
  openPath: async (targetPath: string) => {
    await ipcRenderer.invoke("cleanroom:open-path", targetPath);
  },
  revealItemInDir: async (targetPath: string) => {
    await ipcRenderer.invoke("cleanroom:reveal-item-in-dir", targetPath);
  },
  window: {
    close: async () => {
      await ipcRenderer.invoke("cleanroom:window:close");
    },
    isMaximized: async () => {
      return ipcRenderer.invoke("cleanroom:window:is-maximized") as Promise<boolean>;
    },
    minimize: async () => {
      await ipcRenderer.invoke("cleanroom:window:minimize");
    },
    onResized: async (listener: () => void) => {
      const wrapped = () => listener();
      ipcRenderer.on("cleanroom:window-resized", wrapped);
      return () => {
        ipcRenderer.removeListener("cleanroom:window-resized", wrapped);
      };
    },
    startDragging: async () => {
      return;
    },
    toggleMaximize: async () => {
      await ipcRenderer.invoke("cleanroom:window:toggle-maximize");
    },
  },
});
