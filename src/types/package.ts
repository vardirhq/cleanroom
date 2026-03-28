export type ContaminantCategory =
  | "ad_spam_utility"
  | "duplicate_junk_utility"
  | "fake_booster"
  | "fake_cleaner"
  | "fake_launcher"
  | "fake_optimizer"
  | "fake_security_app";

export type ContaminantRecord = {
  category: ContaminantCategory;
  iconDataUrl: string | null;
  launcherRisk: boolean;
  name: string;
  packageName: string;
  reasons: string[];
  riskScore: number;
};

export type PackageScope = "user" | "system";
export type ScanSnapshotSource = "live" | "session_cache";

export type InstalledPackageRecord = {
  activeNotificationCount: number;
  aggressiveChannelCount: number;
  contaminant: ContaminantRecord | null;
  highImportanceNotificationCount: number;
  iconDataUrl: string | null;
  launcherCandidate: boolean;
  launcherRisk: boolean;
  metadataResolved: boolean;
  name: string;
  notificationSpamRisk: boolean;
  packageName: string;
  protectedPackage: boolean;
  reasons: string[];
  scope: PackageScope;
  suspicionScore: number;
};

export type ScanSummary = {
  activeNotificationCount: number;
  aggressiveChannelCount: number;
  flaggedCount: number;
  highImportanceNotificationCount: number;
  launcherRiskCount: number;
  notificationSuspectCount: number;
  protectedCount: number;
  scannedPackageCount: number;
  snapshotSource: ScanSnapshotSource;
  systemPackageCount: number;
  userPackageCount: number;
};

export type CleanupPlanSummary = {
  launcherWarnings: number;
  protectedCount: number;
  selectedCount: number;
};

export type PackageMetadataRecord = {
  iconDataUrl: string | null;
  name: string | null;
  packageName: string;
};

export type CleanupResultRecord = {
  message: string;
  packageName: string;
  rollbackGuidance: string | null;
  success: boolean;
};
