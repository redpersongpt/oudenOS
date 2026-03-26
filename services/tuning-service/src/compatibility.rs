// ─── Compatibility Engine ────────────────────────────────────────────────────
// Evaluates whether a tuning action is safe to apply on the current machine.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompatibilityCheck {
    pub action_id: String,
    pub compatible: bool,
    pub reasons: Vec<String>,
    pub warnings: Vec<String>,
}

/// Check if an action is compatible with the current device profile.
pub fn check_action(
    action_id: &str,
    min_build: Option<u32>,
    max_build: Option<u32>,
    current_build: u32,
    current_edition: &str,
    allowed_editions: Option<&[String]>,
) -> CompatibilityCheck {
    let mut reasons = Vec::new();
    let mut warnings = Vec::new();
    let mut compatible = true;

    // Build range check
    if let Some(min) = min_build {
        if current_build < min {
            compatible = false;
            reasons.push(format!(
                "Requires Windows build {} or later (current: {})",
                min, current_build
            ));
        }
    }

    if let Some(max) = max_build {
        if current_build > max {
            compatible = false;
            reasons.push(format!(
                "Not supported on builds after {} (current: {})",
                max, current_build
            ));
        }
    }

    // Edition check
    if let Some(editions) = allowed_editions {
        if !editions.iter().any(|e| e.eq_ignore_ascii_case(current_edition)) {
            compatible = false;
            reasons.push(format!(
                "Not supported on {} edition (requires: {})",
                current_edition,
                editions.join(", ")
            ));
        }
    }

    CompatibilityCheck {
        action_id: action_id.to_string(),
        compatible,
        reasons,
        warnings,
    }
}
