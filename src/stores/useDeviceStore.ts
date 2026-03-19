import { create } from "zustand";
import { getAppBootstrap, setActiveDevice } from "../lib/api";
import type { AppBootstrap } from "../types/app";
import type { DeviceSummary } from "../types/device";

type DeviceStore = {
  activeDeviceSerial: string | null;
  bootstrap: AppBootstrap | null;
  bootstrapError: string | null;
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  device: DeviceSummary | null;
  devices: DeviceSummary[];
  loadBootstrap: (onLoaded: (bootstrap: AppBootstrap) => void) => Promise<void>;
  selectDevice: (
    serial: string | null,
    onLoaded: (bootstrap: AppBootstrap) => void,
  ) => Promise<void>;
  selectionRequired: boolean;
};

export const useDeviceStore = create<DeviceStore>((set) => ({
  activeDeviceSerial: null,
  bootstrap: null,
  bootstrapError: null,
  bootstrapStatus: "idle",
  device: null,
  devices: [],
  loadBootstrap: async (onLoaded) => {
    set({ bootstrapError: null, bootstrapStatus: "loading" });

    try {
      const bootstrap = await getAppBootstrap();

      set({
        activeDeviceSerial: bootstrap.activeDeviceSerial,
        bootstrap,
        bootstrapStatus: "ready",
        device: bootstrap.device,
        devices: bootstrap.devices,
        selectionRequired: bootstrap.deviceSelectionRequired,
      });
      onLoaded(bootstrap);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown bootstrap failure";

      set({
        bootstrapError: message,
        bootstrapStatus: "error",
      });
    }
  },
  selectDevice: async (serial, onLoaded) => {
    await setActiveDevice(serial);
    await useDeviceStore.getState().loadBootstrap(onLoaded);
  },
  selectionRequired: false,
}));
