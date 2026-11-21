// ─── Playbook Catalog Cache ─────────────────────────────────────────────────
// The playbook YAML is parsed once per process (per directory) instead of on
// every execute.applyAction. The action index maps every resolvable action id
// (playbook modules, guide advisories, translated catalog) to its execution
// JSON, with the optional `maxWindowsBuild` / `requires` fields merged in so
// apply-time gating sees them.

use crate::playbook::{self, LoadedPlaybook};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

pub struct CatalogEntry {
    pub playbook: Arc<LoadedPlaybook>,
    index: OnceLock<HashMap<String, Value>>,
}

fn cache() -> &'static Mutex<HashMap<PathBuf, Arc<CatalogEntry>>> {
    static CACHE: OnceLock<Mutex<HashMap<PathBuf, Arc<CatalogEntry>>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Load (or reuse) the playbook in `dir`. Load errors are not cached, so a
/// fixed playbook directory is picked up on the next call.
pub fn entry(dir: &Path) -> anyhow::Result<Arc<CatalogEntry>> {
    let key = dir.to_path_buf();
    if let Some(found) = cache().lock().unwrap_or_else(|e| e.into_inner()).get(&key) {
        return Ok(found.clone());
    }
    let loaded = playbook::load_playbook(dir)?;
    let entry = Arc::new(CatalogEntry {
        playbook: Arc::new(loaded),
        index: OnceLock::new(),
    });
    cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(key, entry.clone());
    Ok(entry)
}

pub fn cached_playbook(dir: &Path) -> anyhow::Result<Arc<LoadedPlaybook>> {
    Ok(entry(dir)?.playbook.clone())
}

impl CatalogEntry {
    fn index(&self) -> &HashMap<String, Value> {
        self.index.get_or_init(|| {
            // The resolved plan contains every catalog action (playbook,
            // guide advisories, translated catalog); statuses are irrelevant.
            let plan = playbook::resolve_plan_with_facts(
                &self.playbook,
                "gaming_desktop",
                "balanced",
                Some(99999),
                &crate::facts::HardwareFacts::default(),
            );
            let mut map = HashMap::new();
            // Playbook module actions win over guide/translated ids (same
            // precedence as playbook::find_action_definition).
            let module_actions = self.playbook.phases.iter().flat_map(|p| p.actions.iter());
            let plan_actions = plan.phases.iter().flat_map(|p| p.actions.iter().map(|r| &r.action));
            for action in module_actions.chain(plan_actions) {
                if map.contains_key(&action.id) {
                    continue;
                }
                {
                    let resolved_action = action;
                    let mut json = playbook::playbook_action_to_execution_json(resolved_action);
                    if let (Some(obj), Some(extras)) = (
                        json.as_object_mut(),
                        self.playbook.action_extras.get(&resolved_action.id),
                    ) {
                        if let Some(max) = extras.max_windows_build {
                            obj.insert("maxWindowsBuild".into(), serde_json::json!(max));
                        }
                        if let Some(req) = &extras.requires {
                            obj.insert(
                                "requires".into(),
                                serde_json::to_value(req).unwrap_or(Value::Null),
                            );
                        }
                    }
                    map.insert(resolved_action.id.clone(), json);
                }
            }
            map
        })
    }

    pub fn find_action(&self, action_id: &str) -> Option<Value> {
        self.index().get(action_id).cloned()
    }
}

/// Execution JSON for an action id, from the cached catalog.
pub fn find_action_definition(dir: &Path, action_id: &str) -> anyhow::Result<Option<Value>> {
    Ok(entry(dir)?.find_action(action_id))
}

// ─── Playbook directory resolution ──────────────────────────────────────────

/// Resolve the playbook directory across packaged and dev layouts.
pub fn resolve_playbook_dir() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(from_env) = std::env::var("OUDENOS_PLAYBOOK_DIR") {
        candidates.push(PathBuf::from(from_env));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("playbooks"));
            candidates.push(parent.join("resources").join("playbooks"));
            candidates.push(parent.join("..").join("resources").join("playbooks"));
        }
    }

    // Development layouts only: never let a release build pick up a
    // `playbooks` folder from the current directory or a drive root.
    #[cfg(debug_assertions)]
    {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                candidates.push(parent.join("..").join("..").join("..").join("..").join("playbooks"));
            }
        }
        if let Ok(cwd) = std::env::current_dir() {
            candidates.push(cwd.join("playbooks"));
            candidates.push(cwd.join("..").join("playbooks"));
        }
        candidates.push(playbook::default_playbook_dir());
    }

    for candidate in candidates {
        if candidate.join("manifest.yaml").exists() {
            return candidate.canonicalize().ok().or(Some(candidate));
        }
    }

    None
}

/// Playbook-declared valueType for a registry target, used to restore legacy
/// snapshots that did not record the original kind.
pub fn legacy_value_type(action_id: &str, full_path: &str, value_name: &str) -> Option<String> {
    let dir = resolve_playbook_dir()?;
    let playbook = cached_playbook(&dir).ok()?;
    let wanted_path = full_path.trim().to_ascii_lowercase();
    playbook
        .phases
        .iter()
        .flat_map(|p| p.actions.iter())
        .filter(|a| a.id == action_id)
        .flat_map(|a| a.registry_changes.iter())
        .find(|c| {
            format!("{}\\{}", c.hive, c.path).to_ascii_lowercase() == wanted_path
                && c.value_name.eq_ignore_ascii_case(value_name)
                && !c.delete
        })
        .map(|c| c.value_type.clone())
}
