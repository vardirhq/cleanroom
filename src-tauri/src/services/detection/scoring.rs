use crate::models::package::{
    ContaminantCategory, ContaminantRecord, InstalledPackageRecord, PackageScope,
};
use std::collections::BTreeMap;

use super::rules::{DetectionRules, RuleType};

pub fn classify_package(
    package_name: &str,
    display_label: Option<&str>,
    home_package: Option<&str>,
    scope: PackageScope,
    active_notification_count: usize,
    aggressive_channel_count: usize,
    high_importance_notification_count: usize,
    rules: &DetectionRules,
) -> InstalledPackageRecord {
    let lower = package_name.to_ascii_lowercase();
    let segments = package_segments(package_name);
    let cached_label = display_label
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let display_name = cached_label
        .map(ToString::to_string)
        .unwrap_or_else(|| prettify_package_name(package_name));
    let label_lower = cached_label.map(str::to_ascii_lowercase);
    let launcher_branding = if matches!(scope, PackageScope::User) {
        launcher_branding_score(&segments, label_lower.as_deref())
    } else {
        0
    };

    let mut reasons = Vec::new();
    let mut risk_score = 0usize;
    let mut signal_count = 0usize;
    let mut candidate_signal_count = 0usize;
    let mut exact_match = false;
    let mut category_scores = BTreeMap::new();
    let is_home_package = home_package.is_some_and(|value| value == package_name);
    let launcher_candidate =
        is_home_package || segments.iter().any(|segment| is_launcher_segment(segment));
    let launcher_risk = is_home_package || (launcher_candidate && launcher_branding >= 3);
    let trusted = is_trusted_package(&lower, rules);
    let protected_package = trusted || is_home_package || matches!(scope, PackageScope::System);

    for rule in &rules.keyword_rules {
        match rule.r#type {
            RuleType::NameKeyword => {
                if let Some(label_lower) = &label_lower {
                    if label_lower.contains(&rule.value) {
                        risk_score += rule.score;
                        add_category_score(&mut category_scores, &rule.category, rule.score);
                        reasons.push(label_reason(&rule.reason));
                        signal_count += 1;
                        candidate_signal_count += 1;
                    }
                }
            }
            RuleType::PackageKeyword => {
                if matches_keyword(&lower, &segments, &rule.value) {
                    risk_score += rule.score;
                    add_category_score(&mut category_scores, &rule.category, rule.score);
                    reasons.push(rule.reason.clone());
                    signal_count += 1;
                    candidate_signal_count += 1;
                }
            }
        }
    }

    for rule in &rules.known_bad_packages {
        if lower == rule.package {
            risk_score += rule.score;
            add_category_score(&mut category_scores, &rule.category, rule.score);
            reasons.push(rule.reason.clone());
            signal_count += 1;
            candidate_signal_count += 1;
            exact_match = true;
        }
    }

    if is_home_package {
        risk_score += 5;
        add_category_score(&mut category_scores, &ContaminantCategory::FakeLauncher, 5);
        reasons.push("Package currently resolves as the device home launcher.".to_string());
        signal_count += 1;
        candidate_signal_count += 1;
    }

    if launcher_candidate && launcher_branding >= 3 {
        let launcher_score = if launcher_branding >= 4 { 4 } else { 3 };
        risk_score += launcher_score;
        add_category_score(
            &mut category_scores,
            &ContaminantCategory::FakeLauncher,
            launcher_score,
        );
        reasons.push(
            "Package presents itself like an alternate home or launcher app on a user-installed package."
                .to_string(),
        );
        signal_count += 1;
        candidate_signal_count += 1;
    } else if launcher_candidate {
        reasons.push(
            "Package appears launcher-capable and should be reviewed before removal."
                .to_string(),
        );
        signal_count += 1;
    }

    let is_candidate = exact_match || candidate_signal_count > 0 || is_home_package;

    if is_candidate && active_notification_count >= 3 {
        let notification_score = if active_notification_count >= 8 {
            2
        } else if active_notification_count >= 5 {
            1
        } else {
            0
        };
        risk_score += notification_score;
        if notification_score > 0 {
            add_category_score(
                &mut category_scores,
                &ContaminantCategory::AdSpamUtility,
                notification_score,
            );
        }
        reasons.push(if active_notification_count >= 5 {
            format!(
                "App currently has {active_notification_count} active notifications. Review whether these are expected."
            )
        } else {
            format!(
                "App currently has {active_notification_count} active notifications."
            )
        });
        signal_count += 1;
    }

    if is_candidate && high_importance_notification_count > 0 {
        let notification_score = if high_importance_notification_count >= 4 {
            2
        } else if high_importance_notification_count >= 2 {
            1
        } else {
            0
        };
        risk_score += notification_score;
        if notification_score > 0 {
            add_category_score(
                &mut category_scores,
                &ContaminantCategory::AdSpamUtility,
                notification_score,
            );
        }
        reasons.push(if high_importance_notification_count >= 3 {
            format!(
                "App currently has {high_importance_notification_count} high-importance notifications."
            )
        } else {
            format!(
                "App currently has {high_importance_notification_count} high-importance notification active."
            )
        });
        signal_count += 1;
    }

    if is_candidate && aggressive_channel_count > 0 {
        let notification_score = if aggressive_channel_count >= 4 {
            2
        } else if aggressive_channel_count >= 2 {
            1
        } else {
            0
        };
        risk_score += notification_score;
        if notification_score > 0 {
            add_category_score(
                &mut category_scores,
                &ContaminantCategory::AdSpamUtility,
                notification_score,
            );
        }
        reasons.push(if aggressive_channel_count >= 3 {
            format!("App defines {aggressive_channel_count} high-importance notification channels.")
        } else {
            format!("App defines {aggressive_channel_count} high-importance notification channel.")
        });
        signal_count += 1;
    }

    if trusted && !exact_match {
        risk_score = risk_score.saturating_sub(8);
        reasons.push("Package matches a trusted package or vendor prefix.".to_string());
    }

    let notification_spam_risk =
        is_candidate && (active_notification_count >= 6 || high_importance_notification_count >= 4);
    if is_candidate
        && !trusted
        && (active_notification_count >= 3
            || high_importance_notification_count >= 2
            || aggressive_channel_count >= 2)
    {
        add_category_score(&mut category_scores, &ContaminantCategory::AdSpamUtility, 1);
    }

    let category = dominant_category(&category_scores);

    let contaminant = if should_flag_as_contaminant(
        exact_match,
        is_home_package,
        trusted,
        notification_spam_risk,
        candidate_signal_count,
        risk_score,
        signal_count,
    ) {
        category.clone().map(|category| ContaminantRecord {
            name: display_name.clone(),
            package_name: package_name.to_string(),
            category,
            icon_data_url: None,
            risk_score,
            launcher_risk,
            reasons: reasons.clone(),
        })
    } else {
        None
    };

    InstalledPackageRecord {
        active_notification_count,
        aggressive_channel_count,
        candidate_signal_count,
        high_importance_notification_count,
        icon_data_url: None,
        exact_match,
        is_home_package,
        launcher_risk,
        metadata_resolved: false,
        protected_package,
        signal_count,
        suspected_category: category.clone(),
        name: display_name,
        notification_spam_risk,
        package_name: package_name.to_string(),
        scope,
        suspicion_score: risk_score,
        trusted_match: trusted,
        launcher_candidate,
        reasons,
        contaminant,
    }
}

pub fn apply_session_signals(installed_packages: &mut [InstalledPackageRecord]) {
    let mut category_counts = BTreeMap::<ContaminantCategory, usize>::new();

    for package in installed_packages.iter() {
        if package.candidate_signal_count == 0 {
            continue;
        }

        if let Some(category) = &package.suspected_category {
            *category_counts.entry(category.clone()).or_default() += 1;
        }
    }

    let suspicious_combo_categories = [
        ContaminantCategory::FakeCleaner,
        ContaminantCategory::FakeBooster,
        ContaminantCategory::FakeOptimizer,
        ContaminantCategory::FakeSecurityApp,
        ContaminantCategory::FakeLauncher,
    ];
    let active_combo_categories: Vec<ContaminantCategory> = suspicious_combo_categories
        .iter()
        .filter(|category| category_counts.get(*category).copied().unwrap_or(0) > 0)
        .cloned()
        .collect();
    let combo_score = if active_combo_categories.len() >= 3 {
        3
    } else if active_combo_categories.len() >= 2 {
        2
    } else {
        0
    };
    let combo_reason = if combo_score > 0 {
        Some(format!(
            "Device has a suspicious utility mix across {}.",
            join_category_labels(&active_combo_categories)
        ))
    } else {
        None
    };

    for package in installed_packages.iter_mut() {
        let Some(category) = package.suspected_category.clone() else {
            package.contaminant = build_contaminant(package);
            continue;
        };

        let duplicate_score = duplicate_category_score(&category, &category_counts);
        if duplicate_score > 0 {
            let count = category_counts.get(&category).copied().unwrap_or(0);
            package.suspicion_score += duplicate_score;
            package.signal_count += 1;
            package.reasons.push(format!(
                "Device has {count} packages matching {} patterns, which strengthens duplicate-junk suspicion.",
                category_label(&category)
            ));
        }

        if combo_score > 0 && active_combo_categories.contains(&category) {
            package.suspicion_score += combo_score;
            package.signal_count += 1;
            if let Some(reason) = &combo_reason {
                package.reasons.push(reason.clone());
            }
        }

        package.contaminant = build_contaminant(package);
    }
}

fn prettify_package_name(package_name: &str) -> String {
    let selected_segment = package_name
        .split('.')
        .filter(|segment| !segment.is_empty())
        .rev()
        .find(|segment| !is_generic_display_segment(segment))
        .unwrap_or(package_name);

    selected_segment
        .split(['_', '-'])
        .flat_map(|segment| segment.split_whitespace())
        .map(|segment| {
            let mut chars = segment.chars();
            match chars.next() {
                Some(first) => {
                    let head = first.to_uppercase().to_string();
                    format!("{head}{}", chars.as_str())
                }
                None => String::new(),
            }
        })
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_generic_display_segment(segment: &str) -> bool {
    matches!(
        segment,
        "android"
            | "app"
            | "apps"
            | "client"
            | "debug"
            | "free"
            | "internal"
            | "lite"
            | "mobile"
            | "prod"
            | "release"
            | "tablet"
    )
}

fn launcher_branding_score(segments: &[String], label_lower: Option<&str>) -> usize {
    let mut score = 0usize;

    let strong_terms = ["launcher", "home", "homescreen"];
    let medium_terms = ["easy", "simple", "senior", "kids", "elder", "big"];

    for term in strong_terms {
        if label_lower.is_some_and(|label| label.contains(term)) {
            score += 2;
        }
    }

    for term in medium_terms {
        if segments.iter().any(|segment| segment == term)
            || label_lower.is_some_and(|label| label.contains(term))
        {
            score += 1;
        }
    }

    score
}

fn package_segments(package_name: &str) -> Vec<String> {
    package_name
        .to_ascii_lowercase()
        .split(['.', '_', '-'])
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn matches_keyword(lower: &str, segments: &[String], value: &str) -> bool {
    match value {
        "launcher" | "home" => segments.iter().any(|segment| segment == value),
        _ => lower.contains(value),
    }
}

fn label_reason(reason: &str) -> String {
    reason.replace("Package name", "App name")
}

fn is_launcher_segment(segment: &str) -> bool {
    matches!(
        segment,
        "launcher" | "home" | "homescreen" | "defaultlauncher"
    )
}

fn is_trusted_package(package_name: &str, rules: &DetectionRules) -> bool {
    rules
        .trusted_exact_packages
        .iter()
        .any(|value| value == package_name)
        || rules
            .trusted_package_prefixes
            .iter()
            .any(|prefix| package_name.starts_with(prefix))
}

fn add_category_score(
    category_scores: &mut BTreeMap<ContaminantCategory, usize>,
    category: &ContaminantCategory,
    score: usize,
) {
    *category_scores.entry(category.clone()).or_default() += score;
}

fn dominant_category(
    category_scores: &BTreeMap<ContaminantCategory, usize>,
) -> Option<ContaminantCategory> {
    category_scores
        .iter()
        .max_by(
            |(left_category, left_score), (right_category, right_score)| {
                left_score
                    .cmp(right_score)
                    .then_with(|| left_category.cmp(right_category))
            },
        )
        .map(|(category, _)| category.clone())
}

fn build_contaminant(package: &InstalledPackageRecord) -> Option<ContaminantRecord> {
    if should_flag_as_contaminant(
        package.exact_match,
        package.is_home_package,
        package.trusted_match,
        package.notification_spam_risk,
        package.candidate_signal_count,
        package.suspicion_score,
        package.signal_count,
    ) {
        package
            .suspected_category
            .clone()
            .map(|category| ContaminantRecord {
                name: package.name.clone(),
                package_name: package.package_name.clone(),
                category,
                icon_data_url: package.icon_data_url.clone(),
                risk_score: package.suspicion_score,
                launcher_risk: package.launcher_risk,
                reasons: package.reasons.clone(),
            })
    } else {
        None
    }
}

fn duplicate_category_score(
    category: &ContaminantCategory,
    category_counts: &BTreeMap<ContaminantCategory, usize>,
) -> usize {
    let count = category_counts.get(category).copied().unwrap_or(0);
    let supports_duplicate_signal = matches!(
        category,
        ContaminantCategory::FakeCleaner
            | ContaminantCategory::FakeBooster
            | ContaminantCategory::FakeOptimizer
            | ContaminantCategory::FakeSecurityApp
            | ContaminantCategory::AdSpamUtility
    );

    if !supports_duplicate_signal || count < 2 {
        return 0;
    }

    if count >= 3 {
        3
    } else {
        2
    }
}

fn category_label(category: &ContaminantCategory) -> &'static str {
    match category {
        ContaminantCategory::AdSpamUtility => "ad-spam utility",
        ContaminantCategory::DuplicateJunkUtility => "duplicate junk utility",
        ContaminantCategory::FakeBooster => "fake booster",
        ContaminantCategory::FakeCleaner => "fake cleaner",
        ContaminantCategory::FakeLauncher => "fake launcher",
        ContaminantCategory::FakeOptimizer => "fake optimizer",
        ContaminantCategory::FakeSecurityApp => "fake security app",
    }
}

fn join_category_labels(categories: &[ContaminantCategory]) -> String {
    categories
        .iter()
        .map(category_label)
        .collect::<Vec<_>>()
        .join(", ")
}

fn should_flag_as_contaminant(
    exact_match: bool,
    is_home_package: bool,
    trusted: bool,
    notification_spam_risk: bool,
    candidate_signal_count: usize,
    risk_score: usize,
    signal_count: usize,
) -> bool {
    if exact_match || is_home_package {
        return true;
    }

    if trusted {
        return false;
    }

    if candidate_signal_count == 0 {
        return false;
    }

    (notification_spam_risk && candidate_signal_count > 0)
        || (risk_score >= 5 && signal_count >= 2)
        || risk_score >= 7
}

#[cfg(test)]
mod tests {
    use super::{classify_package, prettify_package_name};
    use crate::models::package::{ContaminantCategory, PackageScope};
    use crate::services::detection::rules::{DetectionRules, KeywordRule, RuleType};

    fn cleaner_rules() -> DetectionRules {
        DetectionRules {
            known_bad_packages: vec![],
            keyword_rules: vec![
                KeywordRule {
                    r#type: RuleType::NameKeyword,
                    value: "cleaner".into(),
                    score: 4,
                    category: ContaminantCategory::FakeCleaner,
                    reason: "Package name matches cleaner-related keywords.".into(),
                },
                KeywordRule {
                    r#type: RuleType::NameKeyword,
                    value: "clean".into(),
                    score: 2,
                    category: ContaminantCategory::FakeCleaner,
                    reason: "Package name contains a cleaning-related stem.".into(),
                },
            ],
            trusted_exact_packages: vec![],
            trusted_package_prefixes: vec![],
            version: "test".into(),
        }
    }

    #[test]
    fn skips_generic_app_suffixes_when_building_display_name() {
        assert_eq!(prettify_package_name("com.arlo.app"), "Arlo");
        assert_eq!(prettify_package_name("net.easypark.android"), "Easypark");
        assert_eq!(prettify_package_name("no.finn.android"), "Finn");
    }

    #[test]
    fn still_prefers_specific_tail_segment_when_it_is_meaningful() {
        assert_eq!(prettify_package_name("com.threads.homebyme"), "Homebyme");
        assert_eq!(
            prettify_package_name("com.party.rocketcleaner.lite"),
            "Rocketcleaner"
        );
    }

    #[test]
    fn classifies_cleaner_apps_from_display_label() {
        let installed = classify_package(
            "com.symantec.cleansweep",
            Some("Norton Cleaner"),
            None,
            PackageScope::User,
            0,
            0,
            0,
            &cleaner_rules(),
        );

        assert_eq!(installed.suspicion_score, 6);
        assert_eq!(
            installed.suspected_category,
            Some(ContaminantCategory::FakeCleaner)
        );
        assert!(installed
            .reasons
            .iter()
            .any(|reason| reason.contains("App name matches cleaner-related keywords.")));
    }

    #[test]
    fn marks_trusted_packages_as_protected() {
        let mut rules = cleaner_rules();
        rules.trusted_exact_packages = vec!["com.safe.cleaner".into()];

        let installed = classify_package(
            "com.safe.cleaner",
            Some("Safe Cleaner"),
            None,
            PackageScope::User,
            0,
            0,
            0,
            &rules,
        );

        assert!(installed.protected_package);
        assert!(installed.trusted_match);
        assert!(installed.contaminant.is_none());
    }

    #[test]
    fn elevates_user_installed_launcher_branding_into_launcher_risk() {
        let installed = classify_package(
            "com.example.easyhome.launcher",
            Some("Easy Home Launcher"),
            None,
            PackageScope::User,
            0,
            0,
            0,
            &cleaner_rules(),
        );

        assert!(installed.launcher_candidate);
        assert!(installed.launcher_risk);
        assert_eq!(
            installed.suspected_category,
            Some(ContaminantCategory::FakeLauncher)
        );
        assert!(installed.suspicion_score >= 3);
    }

    #[test]
    fn does_not_treat_every_launcher_capable_package_as_launcher_risk() {
        let installed = classify_package(
            "com.example.launcher",
            Some("Launcher Switch"),
            None,
            PackageScope::User,
            0,
            0,
            0,
            &cleaner_rules(),
        );

        assert!(installed.launcher_candidate);
        assert!(!installed.launcher_risk);
    }
}
