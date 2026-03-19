import { describe, expect, it } from "vitest";
import { buildCleanupPlan, getVisiblePackages } from "./scanReview";
import type { InstalledPackageRecord } from "../types/package";

function makePackage(
  overrides: Partial<InstalledPackageRecord> = {},
): InstalledPackageRecord {
  return {
    activeNotificationCount: 0,
    aggressiveChannelCount: 0,
    contaminant: null,
    highImportanceNotificationCount: 0,
    iconDataUrl: null,
    launcherCandidate: false,
    metadataResolved: true,
    name: "Example",
    notificationSpamRisk: false,
    packageName: "com.example.app",
    protectedPackage: false,
    reasons: [],
    scope: "user",
    suspicionScore: 0,
    ...overrides,
  };
}

describe("scan review helpers", () => {
  it("filters visible packages by quick filter, category, and search query", () => {
    const items = [
      makePackage({
        contaminant: {
          category: "fake_cleaner",
          iconDataUrl: null,
          launcherRisk: false,
          name: "Phone Cleaner",
          packageName: "com.cleaner.app",
          reasons: ["Cleaner keyword"],
          riskScore: 6,
        },
        name: "Phone Cleaner",
        packageName: "com.cleaner.app",
        reasons: ["Cleaner keyword"],
        suspicionScore: 6,
      }),
      makePackage({
        launcherCandidate: true,
        name: "Simple Home",
        packageName: "com.launcher.home",
        reasons: ["Launcher package"],
        suspicionScore: 3,
      }),
      makePackage({
        name: "Trusted Tool",
        packageName: "com.safe.tool",
        protectedPackage: true,
      }),
    ];

    const visible = getVisiblePackages(
      items,
      "cleaner",
      "flagged",
      "user",
      "fake_cleaner",
      [],
    );

    expect(visible).toHaveLength(1);
    expect(visible[0]?.packageName).toBe("com.cleaner.app");
  });

  it("builds cleanup plan counts from selected package ids", () => {
    const items = [
      makePackage({ packageName: "com.cleaner.app" }),
      makePackage({
        launcherCandidate: true,
        packageName: "com.launcher.home",
      }),
      makePackage({ packageName: "com.safe.tool", protectedPackage: true }),
    ];

    expect(
      buildCleanupPlan(items, ["com.launcher.home", "com.safe.tool"]),
    ).toEqual({
      launcherWarnings: 1,
      protectedCount: 1,
      selectedCount: 2,
    });
  });

  it("filters system packages out by default review scope", () => {
    const items = [
      makePackage({
        name: "User App",
        packageName: "com.example.user",
        scope: "user",
      }),
      makePackage({
        name: "System App",
        packageName: "com.android.systemui",
        protectedPackage: true,
        scope: "system",
      }),
    ];

    expect(
      getVisiblePackages(items, "", "all", "user", "all", []).map(
        (item) => item.packageName,
      ),
    ).toEqual(["com.example.user"]);
    expect(
      getVisiblePackages(items, "", "all", "system", "all", []).map(
        (item) => item.packageName,
      ),
    ).toEqual(["com.android.systemui"]);
  });
});
