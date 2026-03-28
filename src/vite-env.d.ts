/// <reference types="vite/client" />

type CleanroomWindowControls = {
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  minimize: () => Promise<void>;
  onResized: (listener: () => void) => Promise<() => void>;
  startDragging: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
};

type CleanroomElectronBridge = {
  invoke: <T>(
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<T>;
  onDeviceStateChanged: (listener: () => void) => Promise<() => void>;
  openPath: (path: string) => Promise<void>;
  revealItemInDir: (path: string) => Promise<void>;
  window: CleanroomWindowControls;
};

interface Window {
  cleanroom?: CleanroomElectronBridge;
}
