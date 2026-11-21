use super::PlaybookAction;
use std::collections::HashSet;
use std::path::PathBuf;

#[derive(Debug, Clone, serde::Deserialize)]
pub(crate) struct SourceCatalog {
    pub sources: Vec<SourceCatalogEntry>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub(crate) struct SourceCatalogEntry {
    pub source: String,
    #[serde(default)]
    pub actions: Vec<SourceCatalogAction>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub(crate) struct SourceCatalogAction {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub link: Option<String>,
    pub operations: SourceCatalogOperations,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub(crate) struct SourceCatalogOperations {
    #[serde(default)]
    pub registry: u32,
    #[serde(default)]
    pub service: u32,
    #[serde(default, rename = "scheduledTask")]
    pub scheduled_task: u32,
    #[serde(default, rename = "invokeScript")]
    pub invoke_script: u32,
    #[serde(default, rename = "undoScript")]
    pub undo_script: u32,
    #[serde(default)]
    pub appx: u32,
}

#[derive(Debug, Clone)]
pub(crate) struct ExternalCatalogPhase {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub categories: &'static [&'static str],
}

pub(crate) fn winutil_phase_blueprints() -> Vec<ExternalCatalogPhase> {
    vec![
        ExternalCatalogPhase {
            id: "winutil-essential",
            name: "WinUtil Essential Tweaks",
            description:
                "Translated coverage of WinUtil essential tweaks, exposed as review-first manual actions.",
            categories: &["Essential Tweaks"],
        },
        ExternalCatalogPhase {
            id: "winutil-advanced",
            name: "WinUtil Advanced Tweaks",
            description:
                "Translated coverage of WinUtil advanced and caution-heavy tweaks. These remain manual by design.",
            categories: &["z__Advanced Tweaks - CAUTION"],
        },
        ExternalCatalogPhase {
            id: "winutil-preferences",
            name: "WinUtil Preferences & Toggles",
            description:
                "Translated coverage of WinUtil preference toggles and shell customization options.",
            categories: &["Customize Preferences"],
        },
        ExternalCatalogPhase {
            id: "winutil-performance-plans",
            name: "WinUtil Performance Plans",
            description: "Translated coverage of WinUtil power and performance-plan actions.",
            // Upstream renamed "Performance Plans" to "Performance Plans - NOT FOR LAPTOPS"
            // (winutil 70c23c8); the old name is kept so older snapshots still map.
            categories: &[PERFORMANCE_PLANS_CATEGORY, LEGACY_PERFORMANCE_PLANS_CATEGORY],
        },
    ]
}

const ADVANCED_CATEGORY: &str = "z__Advanced Tweaks - CAUTION";
const PERFORMANCE_PLANS_CATEGORY: &str = "Performance Plans - NOT FOR LAPTOPS";
const LEGACY_PERFORMANCE_PLANS_CATEGORY: &str = "Performance Plans";

fn is_performance_plans(category: &str) -> bool {
    category == PERFORMANCE_PLANS_CATEGORY || category == LEGACY_PERFORMANCE_PLANS_CATEGORY
}

/// Per-action risk classification for WinUtil keys whose category alone would
/// understate (or overstate) their impact. Returns `None` to fall back to the
/// category default.
fn winutil_action_risk_override(id: &str) -> Option<&'static str> {
    match id {
        // Decrypts the system drive: security downgrade, long-running, hard to undo.
        "WPFTweaksDisableBitLocker" => Some("high"),
        // Removes the anti-phishing prompt for unsigned .rdp files.
        "WPFTweaksDisableWarningForUnsignedRdp" => Some("high"),
        // Can make feature updates fail for lack of space.
        "WPFTweaksReservedStorage" => Some("high"),
        // Removes AI appx packages (CoreAI EndOfLife) and the Recall optional feature.
        "WPFTweaksWindowsAI" => Some("high"),
        // Can leave Xbox services (XboxGipSvc) stuck on "Starting" (winutil #5115).
        "WPFTweaksSvcHostSplitting" => Some("high"),
        // Explorer/Start search becomes much slower without the index.
        "WPFTweaksDisableSearchIndexing" => Some("high"),
        // Display-driver level change; can cause or fix flicker depending on GPU.
        "WPFMultiplaneOverlay" => Some("mixed"),
        // Policy value; skips the lock screen for every user.
        "WPFToggleDisableLockscreen" => Some("low"),
        _ => None,
    }
}

fn winutil_action_warning_override(id: &str) -> Option<&'static str> {
    match id {
        "WPFTweaksDisableBitLocker" => Some(
            "Decrypts the system drive (Disable-BitLocker). This is a security downgrade, can take a long time, and re-encrypting requires Enable-BitLocker. Prefer blocking automatic device encryption instead.",
        ),
        "WPFTweaksDisableWarningForUnsignedRdp" => Some(
            "Removes the Windows warning shown when opening unsigned .rdp files, a protection against RDP-file phishing. Only apply on machines that open trusted RDP files exclusively.",
        ),
        "WPFTweaksReservedStorage" => Some(
            "Disables Reserved Storage via DISM. Windows feature updates can fail without it; re-enable before major upgrades.",
        ),
        "WPFTweaksWindowsAI" => Some(
            "Removes AI/Copilot packages, marks the CoreAI package end-of-life, and disables the Recall optional feature. Package removal is not cleanly reversible.",
        ),
        "WPFTweaksSvcHostSplitting" => Some(
            "Disables svchost service splitting. Upstream recommends it only for systems with 12 GB RAM or less; it can leave Xbox services such as XboxGipSvc stuck on Starting. Requires a restart.",
        ),
        "WPFTweaksDisableSearchIndexing" => Some(
            "Disables the Windows Search service (WSearch). File searches in Explorer and the Start menu become much slower; mainly useful on mechanical drives.",
        ),
        "WPFMultiplaneOverlay" => Some(
            "Changes Multiplane Overlay (DWM OverlayTestMode / GraphicsDrivers DisableOverlays). Use only to troubleshoot flicker or stutter; benchmark before and after.",
        ),
        _ => None,
    }
}

fn winutil_expert_override(id: &str) -> bool {
    matches!(id, "WPFTweaksDisableBitLocker")
}

pub(crate) fn load_source_catalog() -> anyhow::Result<SourceCatalog> {
    let path = source_catalog_path();
    let text = std::fs::read_to_string(&path)
        .map_err(|e| anyhow::anyhow!("Failed to read source catalog {}: {}", path.display(), e))?;
    let catalog: SourceCatalog = serde_json::from_str(&text)
        .map_err(|e| anyhow::anyhow!("Failed to parse source catalog {}: {}", path.display(), e))?;
    Ok(catalog)
}

pub(crate) fn source_catalog_ref() -> String {
    source_catalog_path().display().to_string()
}

fn source_catalog_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("artifacts")
        .join("os-source-catalog.json")
}

fn winutil_warning_message(action: &SourceCatalogAction) -> Option<String> {
    let high_impact = action.operations.service >= 10
        || action.operations.appx > 0
        || action.operations.invoke_script > 0;

    if let Some(warning) = winutil_action_warning_override(&action.id) {
        return Some(warning.to_string());
    }

    match action.category.as_str() {
        ADVANCED_CATEGORY => Some(
            "Translated from WinUtil advanced tweaks. Review the original intent and benchmark before applying any equivalent automated action.".to_string(),
        ),
        category if is_performance_plans(category) => Some(
            "Power-plan and latency changes can help or hurt depending on the machine. WinUtil marks these as not for laptops. Validate thermals, idle behavior, and frametime before adopting.".to_string(),
        ),
        _ if high_impact => Some(
            "This WinUtil item touches multiple subsystems or scripts. Keep it manual until an equivalent native implementation is fully verified.".to_string(),
        ),
        _ => None,
    }
}

fn winutil_risk(action: &SourceCatalogAction) -> &'static str {
    if let Some(risk) = winutil_action_risk_override(&action.id) {
        return risk;
    }
    match action.category.as_str() {
        "Essential Tweaks" => "low",
        "Customize Preferences" => "safe",
        category if is_performance_plans(category) => "mixed",
        ADVANCED_CATEGORY => "high",
        // Unknown future categories must not silently read as safe.
        _ => "mixed",
    }
}

fn winutil_benchmark_required(action: &SourceCatalogAction) -> bool {
    is_performance_plans(&action.category)
        || action.category == ADVANCED_CATEGORY
        || action.operations.service > 0
        || action.id == "WPFMultiplaneOverlay"
}

fn winutil_expert_only(action: &SourceCatalogAction) -> bool {
    action.category == ADVANCED_CATEGORY || winutil_expert_override(&action.id)
}

fn translate_winutil_action(action: &SourceCatalogAction) -> PlaybookAction {
    let mut tags = vec![
        "manual-only".to_string(),
        "source:winutil".to_string(),
        format!("source-category:{}", action.category),
        format!("source-action-id:{}", action.id),
        format!("source-op-registry:{}", action.operations.registry),
        format!("source-op-service:{}", action.operations.service),
        format!(
            "source-op-scheduled-task:{}",
            action.operations.scheduled_task
        ),
        format!(
            "source-op-invoke-script:{}",
            action.operations.invoke_script
        ),
        format!("source-op-undo-script:{}", action.operations.undo_script),
        format!("source-op-appx:{}", action.operations.appx),
    ];

    if let Some(link) = &action.link {
        tags.push(format!("source-link:{}", link));
    }

    if winutil_benchmark_required(action) {
        tags.push("benchmark-required".to_string());
    }

    let operation_summary = format!(
        "registry={}, service={}, scheduledTask={}, invokeScript={}, undoScript={}, appx={}",
        action.operations.registry,
        action.operations.service,
        action.operations.scheduled_task,
        action.operations.invoke_script,
        action.operations.undo_script,
        action.operations.appx
    );

    PlaybookAction {
        id: format!("winutil.{}", action.id),
        name: action.title.clone(),
        description: if action.description.trim().is_empty() {
            format!(
                "Translated WinUtil action {} with operation mix: {}.",
                action.id, operation_summary
            )
        } else {
            action.description.clone()
        },
        rationale: format!(
            "Translated from the vendored WinUtil source catalog. Original action {} in category '{}' reports {}.",
            action.id, action.category, operation_summary
        ),
        risk: winutil_risk(action).to_string(),
        tier: "free".to_string(),
        default: false,
        expert_only: winutil_expert_only(action),
        requires_reboot: false,
        reversible: action.operations.undo_script > 0 || action.operations.registry > 0,
        estimated_seconds: 0,
        blocked_profiles: Vec::new(),
        min_windows_build: None,
        registry_changes: Vec::new(),
        service_changes: Vec::new(),
        bcd_changes: Vec::new(),
        power_changes: Vec::new(),
        powershell_commands: Vec::new(),
        packages: Vec::new(),
        tasks: Vec::new(),
        file_renames: Vec::new(),
        tags,
        warning_message: winutil_warning_message(action),
    }
}

pub(crate) fn winutil_action_catalog() -> Vec<PlaybookAction> {
    let catalog = match load_source_catalog() {
        Ok(catalog) => catalog,
        Err(error) => {
            tracing::warn!(error = %error, "Unable to load WinUtil source catalog");
            return Vec::new();
        }
    };

    catalog
        .sources
        .into_iter()
        .find(|entry| entry.source == "winutil")
        .map(|entry| {
            entry
                .actions
                .into_iter()
                .map(|action| translate_winutil_action(&action))
                .collect()
        })
        .unwrap_or_default()
}

pub(crate) fn winutil_actions_for_phase(phase: &ExternalCatalogPhase) -> Vec<PlaybookAction> {
    let category_set: HashSet<&str> = phase.categories.iter().copied().collect();
    winutil_action_catalog()
        .into_iter()
        .filter(|action| {
            action.tags.iter().any(|tag| {
                tag.strip_prefix("source-category:")
                    .is_some_and(|category| category_set.contains(category))
            })
        })
        .collect()
}
