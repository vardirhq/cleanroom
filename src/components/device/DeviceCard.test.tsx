import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeviceCard } from "./DeviceCard";
import type { DeviceSummary } from "../../types/device";

function makeDevice(overrides: Partial<DeviceSummary> = {}): DeviceSummary {
  return {
    androidVersion: "16",
    manufacturer: "Google",
    model: "Pixel 8",
    serial: "ABC123456",
    serialMasked: "ABC1****56",
    status: "ready",
    ...overrides,
  };
}

describe("DeviceCard", () => {
  it("renders explicit selection guidance when multiple devices require a choice", () => {
    render(
      <DeviceCard
        activeDeviceSerial={null}
        connectionMessage="2 devices detected. Select a single device before scanning or cleanup."
        device={null}
        devices={[
          makeDevice(),
          makeDevice({
            model: "Pixel 7",
            serial: "XYZ123456",
            serialMasked: "XYZ1****56",
            status: "unauthorized",
          }),
        ]}
        onSelectDevice={vi.fn()}
        selectionRequired
      />,
    );

    expect(
      screen.getByText("Select a device before scanning"),
    ).toBeInTheDocument();
    expect(screen.getByText("Pixel 8")).toBeInTheDocument();
    expect(screen.getByText("Pixel 7")).toBeInTheDocument();
    expect(screen.getAllByText("Select")).toHaveLength(2);
  });
});
