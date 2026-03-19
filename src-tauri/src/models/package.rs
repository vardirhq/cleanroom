use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Clone, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ContaminantCategory {
    AdSpamUtility,
    DuplicateJunkUtility,
    FakeBooster,
    FakeCleaner,
    FakeLauncher,
    FakeOptimizer,
    FakeSecurityApp,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContaminantRecord {
    pub name: String,
    pub package_name: String,
    pub category: ContaminantCategory,
    pub icon_data_url: Option<String>,
    pub risk_score: usize,
    pub launcher_risk: bool,
    pub reasons: Vec<String>,
}

#[allow(dead_code)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PackageScope {
    User,
    System,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPackageRecord {
    pub active_notification_count: usize,
    pub aggressive_channel_count: usize,
    #[serde(skip_serializing)]
    pub candidate_signal_count: usize,
    pub high_importance_notification_count: usize,
    pub icon_data_url: Option<String>,
    #[serde(skip_serializing)]
    pub exact_match: bool,
    #[serde(skip_serializing)]
    pub is_home_package: bool,
    pub metadata_resolved: bool,
    pub protected_package: bool,
    #[serde(skip_serializing)]
    pub signal_count: usize,
    #[serde(skip_serializing)]
    pub suspected_category: Option<ContaminantCategory>,
    pub name: String,
    pub notification_spam_risk: bool,
    pub package_name: String,
    pub scope: PackageScope,
    pub suspicion_score: usize,
    #[serde(skip_serializing)]
    pub trusted_match: bool,
    pub launcher_candidate: bool,
    pub reasons: Vec<String>,
    pub contaminant: Option<ContaminantRecord>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSummary {
    pub active_notification_count: usize,
    pub aggressive_channel_count: usize,
    pub flagged_count: usize,
    pub high_importance_notification_count: usize,
    pub launcher_risk_count: usize,
    pub notification_suspect_count: usize,
    pub protected_count: usize,
    pub scanned_package_count: usize,
    pub system_package_count: usize,
    pub user_package_count: usize,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageMetadataRecord {
    pub package_name: String,
    pub name: Option<String>,
    pub icon_data_url: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResultRecord {
    pub message: String,
    pub package_name: String,
    pub rollback_guidance: Option<String>,
    pub success: bool,
}
