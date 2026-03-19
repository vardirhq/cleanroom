use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;

use crate::models::package::ContaminantCategory;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleType {
    NameKeyword,
    PackageKeyword,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordRule {
    pub r#type: RuleType,
    pub value: String,
    pub score: usize,
    pub category: ContaminantCategory,
    pub reason: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnownBadPackageRule {
    pub package: String,
    pub score: usize,
    pub category: ContaminantCategory,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
struct KeywordRuleFile {
    version: String,
    rules: Vec<KeywordRule>,
}

#[derive(Debug, Deserialize)]
struct KnownBadPackageFile {
    version: String,
    packages: Vec<KnownBadPackageRule>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VendorWhitelistFile {
    version: String,
    #[serde(default)]
    exact_packages: Vec<String>,
    #[serde(default)]
    package_prefixes: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct DetectionRules {
    pub known_bad_packages: Vec<KnownBadPackageRule>,
    pub keyword_rules: Vec<KeywordRule>,
    pub trusted_exact_packages: Vec<String>,
    pub trusted_package_prefixes: Vec<String>,
    pub version: String,
}

impl DetectionRules {
    pub fn load() -> Self {
        Self::load_from_dir(&rules_dir())
    }

    fn load_from_dir(directory: &Path) -> Self {
        let keyword_file =
            load_json::<KeywordRuleFile>(directory, "keywords.json").unwrap_or(KeywordRuleFile {
                version: "missing".into(),
                rules: vec![],
            });
        let known_bad_file = load_json::<KnownBadPackageFile>(directory, "known_bad_packages.json")
            .unwrap_or(KnownBadPackageFile {
                version: keyword_file.version.clone(),
                packages: vec![],
            });
        let whitelist_file = load_json::<VendorWhitelistFile>(directory, "vendor_whitelist.json")
            .unwrap_or(VendorWhitelistFile {
                version: keyword_file.version.clone(),
                exact_packages: vec![],
                package_prefixes: vec![],
            });

        Self {
            known_bad_packages: known_bad_file.packages,
            keyword_rules: keyword_file.rules,
            trusted_exact_packages: whitelist_file.exact_packages,
            trusted_package_prefixes: whitelist_file.package_prefixes,
            version: format!(
                "keywords:{}|known-bad:{}|whitelist:{}",
                keyword_file.version, known_bad_file.version, whitelist_file.version
            ),
        }
    }
}

fn load_json<T>(directory: &Path, filename: &str) -> Option<T>
where
    T: for<'de> Deserialize<'de>,
{
    let path = directory.join(filename);
    let contents = fs::read_to_string(path).ok()?;
    serde_json::from_str(&contents).ok()
}

fn rules_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("data")
        .join("rules")
}

#[cfg(test)]
mod tests {
    use std::{env, fs};

    use super::DetectionRules;

    #[test]
    fn loads_rules_from_directory() {
        let unique = format!(
            "cleanroom-rules-test-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let directory = env::temp_dir().join(unique);
        fs::create_dir_all(&directory).unwrap();

        fs::write(
            directory.join("keywords.json"),
            r#"{"version":"1","rules":[{"type":"name_keyword","value":"cleaner","score":2,"category":"fake_cleaner","reason":"Cleaner keyword"}]}"#,
        )
        .unwrap();
        fs::write(
            directory.join("known_bad_packages.json"),
            r#"{"version":"2","packages":[{"package":"com.bad.cleaner","score":10,"category":"fake_cleaner","reason":"Known bad package"}]}"#,
        )
        .unwrap();
        fs::write(
            directory.join("vendor_whitelist.json"),
            r#"{"version":"3","exactPackages":["com.safe.tool"],"packagePrefixes":["com.safe."]}"#,
        )
        .unwrap();

        let rules = DetectionRules::load_from_dir(&directory);

        assert_eq!(rules.keyword_rules.len(), 1);
        assert_eq!(rules.known_bad_packages.len(), 1);
        assert_eq!(
            rules.trusted_exact_packages,
            vec!["com.safe.tool".to_string()]
        );
        assert_eq!(
            rules.trusted_package_prefixes,
            vec!["com.safe.".to_string()]
        );
        assert_eq!(rules.version, "keywords:1|known-bad:2|whitelist:3");

        let _ = fs::remove_dir_all(directory);
    }
}
