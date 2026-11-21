// ─── Native Registry Layer ──────────────────────────────────────────────────
// All registry reads, snapshots, writes, verification and rollback go through
// this module. It talks to the Win32 registry API directly (no PowerShell):
//
//   * writes use RegCreateKeyExW, which OPENS an existing key without touching
//     its other values/subkeys (the old `New-Item -Force` path deleted and
//     recreated the whole key) and reports whether the key had to be created;
//   * reads use RegQueryValueExW, which returns the raw type + bytes without
//     expanding REG_EXPAND_SZ, so snapshots are type-preserving;
//   * every handle is opened in the 64-bit view (KEY_WOW64_64KEY).
//
// On non-Windows hosts (macOS demo builds, CI) an in-memory mock registry with
// the same semantics is used so the executor/rollback logic stays testable.

use anyhow::{bail, Result};
use serde_json::Value;
use std::fmt;

// ─── Hives ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Hive {
    Hklm,
    Hkcu,
    Hkcr,
    Hku,
    Hkcc,
}

impl Hive {
    pub fn as_str(&self) -> &'static str {
        match self {
            Hive::Hklm => "HKLM",
            Hive::Hkcu => "HKCU",
            Hive::Hkcr => "HKCR",
            Hive::Hku => "HKU",
            Hive::Hkcc => "HKCC",
        }
    }
}

/// Allowlist-based hive parser. Anything that is not exactly a known hive name
/// (short or long form, optional trailing ':') is rejected — the result is the
/// only form ever interpolated into a command line or used for an API call.
pub fn normalize_hive(raw: &str) -> Result<Hive> {
    let upper = raw.trim().trim_end_matches(':').to_ascii_uppercase();
    let hive = match upper.as_str() {
        "HKLM" | "HKEY_LOCAL_MACHINE" => Hive::Hklm,
        "HKCU" | "HKEY_CURRENT_USER" => Hive::Hkcu,
        "HKCR" | "HKEY_CLASSES_ROOT" => Hive::Hkcr,
        "HKU" | "HKEY_USERS" => Hive::Hku,
        "HKCC" | "HKEY_CURRENT_CONFIG" => Hive::Hkcc,
        _ => bail!(
            "Unsupported registry hive '{}'",
            raw.chars().take(40).collect::<String>()
        ),
    };
    Ok(hive)
}

/// Normalize and validate a subkey path: trims surrounding backslashes and
/// rejects control characters / empty components that would make the path
/// ambiguous.
pub fn normalize_subkey(path: &str) -> Result<String> {
    let trimmed = path.trim().trim_matches('\\');
    if trimmed.chars().any(|c| c.is_control()) {
        bail!("Registry path contains control characters");
    }
    if trimmed.contains("\\\\") {
        bail!("Registry path contains an empty component: {}", trimmed);
    }
    if trimmed.len() > 2048 {
        bail!("Registry path is too long");
    }
    Ok(trimmed.to_string())
}

/// Validate a value name (empty = the key's default value).
pub fn validate_value_name(name: &str) -> Result<()> {
    if name.chars().any(|c| c.is_control()) {
        bail!("Registry value name contains control characters");
    }
    if name.len() > 16383 {
        bail!("Registry value name is too long");
    }
    Ok(())
}

/// Split a snapshot path such as `HKLM\SOFTWARE\X` into hive + subkey.
pub fn split_full_path(full: &str) -> Result<(Hive, String)> {
    let full = full.trim();
    let (hive_part, rest) = match full.find('\\') {
        Some(index) => (&full[..index], &full[index + 1..]),
        None => (full, ""),
    };
    let hive_part = hive_part.strip_prefix("Registry::").unwrap_or(hive_part);
    Ok((normalize_hive(hive_part)?, normalize_subkey(rest)?))
}

// ─── Value kinds / data ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RegKind {
    String,
    ExpandString,
    MultiString,
    DWord,
    QWord,
    Binary,
    /// Any other raw registry type (REG_NONE, REG_DWORD_BIG_ENDIAN, …),
    /// preserved byte-for-byte.
    Raw(u32),
}

impl RegKind {
    /// Parse a playbook / snapshot kind name (PowerShell names, REG_* names).
    pub fn parse(raw: &str) -> Result<Self> {
        let lower = raw.trim().to_ascii_lowercase();
        let kind = match lower.as_str() {
            "string" | "sz" | "reg_sz" => RegKind::String,
            "expandstring" | "expand_sz" | "reg_expand_sz" => RegKind::ExpandString,
            "multistring" | "multi_sz" | "reg_multi_sz" => RegKind::MultiString,
            "dword" | "reg_dword" => RegKind::DWord,
            "qword" | "reg_qword" => RegKind::QWord,
            "binary" | "reg_binary" => RegKind::Binary,
            other => {
                if let Some(code) = other.strip_prefix("raw:") {
                    RegKind::Raw(code.parse::<u32>()?)
                } else {
                    bail!("Unsupported registry value type '{}'", raw)
                }
            }
        };
        Ok(kind)
    }

    pub fn as_str(&self) -> String {
        match self {
            RegKind::String => "String".to_string(),
            RegKind::ExpandString => "ExpandString".to_string(),
            RegKind::MultiString => "MultiString".to_string(),
            RegKind::DWord => "DWord".to_string(),
            RegKind::QWord => "QWord".to_string(),
            RegKind::Binary => "Binary".to_string(),
            RegKind::Raw(code) => format!("Raw:{}", code),
        }
    }

    pub fn type_code(&self) -> u32 {
        match self {
            RegKind::String => 1,
            RegKind::ExpandString => 2,
            RegKind::Binary => 3,
            RegKind::DWord => 4,
            RegKind::MultiString => 7,
            RegKind::QWord => 11,
            RegKind::Raw(code) => *code,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RegData {
    Str(String),
    Multi(Vec<String>),
    DWord(u32),
    QWord(u64),
    Bytes(Vec<u8>),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RegValue {
    pub kind: RegKind,
    pub data: RegData,
}

fn json_to_u64(value: &Value, max: u64, signed_min: i64) -> Result<u64> {
    match value {
        Value::Number(n) => {
            if let Some(u) = n.as_u64() {
                if u <= max {
                    return Ok(u);
                }
                bail!("Numeric value {} is out of range", u);
            }
            if let Some(i) = n.as_i64() {
                if i >= signed_min {
                    // Two's complement wrap, e.g. -1 => 0xFFFFFFFF for a DWORD.
                    return Ok((i as u64) & max);
                }
            }
            bail!("Numeric value {} is out of range", n)
        }
        Value::Bool(flag) => Ok(u64::from(*flag)),
        Value::String(s) => {
            let t = s.trim();
            let parsed = if let Some(hex) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
                u64::from_str_radix(hex, 16)?
            } else if let Some(neg) = t.strip_prefix('-') {
                let i: i64 = -(neg.parse::<i64>()?);
                if i < signed_min {
                    bail!("Numeric value {} is out of range", t);
                }
                (i as u64) & max
            } else {
                t.parse::<u64>()?
            };
            if parsed > max {
                bail!("Numeric value {} is out of range", t);
            }
            Ok(parsed)
        }
        other => bail!("Expected a number, got {}", other),
    }
}

fn json_to_bytes(value: &Value) -> Result<Vec<u8>> {
    match value {
        Value::Array(items) => items
            .iter()
            .map(|item| {
                item.as_u64()
                    .filter(|b| *b <= 255)
                    .map(|b| b as u8)
                    .ok_or_else(|| anyhow::anyhow!("Binary array entries must be 0..=255"))
            })
            .collect(),
        Value::String(s) => {
            let cleaned: String = s
                .split(|c: char| c == ',' || c.is_whitespace())
                .map(|part| part.trim_start_matches("0x").trim_start_matches("0X"))
                .collect();
            if cleaned.len() % 2 != 0 {
                bail!("Hex binary string must have an even number of digits");
            }
            (0..cleaned.len())
                .step_by(2)
                .map(|i| Ok(u8::from_str_radix(&cleaned[i..i + 2], 16)?))
                .collect()
        }
        Value::Null => Ok(Vec::new()),
        other => bail!("Expected a byte array or hex string, got {}", other),
    }
}

fn json_to_string(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

impl RegValue {
    pub fn dword(value: u32) -> Self {
        RegValue {
            kind: RegKind::DWord,
            data: RegData::DWord(value),
        }
    }

    pub fn string(value: &str) -> Self {
        RegValue {
            kind: RegKind::String,
            data: RegData::Str(value.to_string()),
        }
    }

    /// Convert a playbook/snapshot JSON value into typed registry data.
    pub fn from_json(kind: RegKind, value: &Value) -> Result<Self> {
        let data = match kind {
            RegKind::DWord => RegData::DWord(json_to_u64(value, u32::MAX as u64, i32::MIN as i64)? as u32),
            RegKind::QWord => RegData::QWord(json_to_u64(value, u64::MAX, i64::MIN)?),
            RegKind::String | RegKind::ExpandString => RegData::Str(json_to_string(value)),
            RegKind::MultiString => match value {
                Value::Array(items) => RegData::Multi(items.iter().map(json_to_string).collect()),
                Value::Null => RegData::Multi(Vec::new()),
                other => RegData::Multi(vec![json_to_string(other)]),
            },
            RegKind::Binary | RegKind::Raw(_) => RegData::Bytes(json_to_bytes(value)?),
        };
        Ok(RegValue { kind, data })
    }

    /// JSON form stored in snapshots (`previousValue`): numbers for DWORD /
    /// QWORD, strings for SZ / EXPAND_SZ, arrays for MULTI_SZ and binary.
    pub fn to_json(&self) -> Value {
        match &self.data {
            RegData::Str(s) => Value::String(s.clone()),
            RegData::Multi(items) => Value::Array(items.iter().cloned().map(Value::String).collect()),
            RegData::DWord(v) => serde_json::json!(v),
            RegData::QWord(v) => serde_json::json!(v),
            RegData::Bytes(bytes) => Value::Array(bytes.iter().map(|b| serde_json::json!(b)).collect()),
        }
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        fn utf16z(s: &str) -> Vec<u8> {
            s.encode_utf16()
                .chain(std::iter::once(0))
                .flat_map(|unit| unit.to_le_bytes())
                .collect()
        }
        match &self.data {
            RegData::Str(s) => utf16z(s),
            RegData::Multi(items) => {
                let mut out = Vec::new();
                for item in items {
                    out.extend(utf16z(item));
                }
                out.extend([0u8, 0u8]);
                out
            }
            RegData::DWord(v) => v.to_le_bytes().to_vec(),
            RegData::QWord(v) => v.to_le_bytes().to_vec(),
            RegData::Bytes(bytes) => bytes.clone(),
        }
    }

    pub fn from_raw(type_code: u32, bytes: &[u8]) -> Self {
        fn utf16_units(bytes: &[u8]) -> Vec<u16> {
            bytes
                .chunks(2)
                .map(|chunk| u16::from_le_bytes([chunk[0], *chunk.get(1).unwrap_or(&0)]))
                .collect()
        }
        match type_code {
            1 | 2 => {
                let units = utf16_units(bytes);
                let end = units.iter().position(|u| *u == 0).unwrap_or(units.len());
                RegValue {
                    kind: if type_code == 1 {
                        RegKind::String
                    } else {
                        RegKind::ExpandString
                    },
                    data: RegData::Str(String::from_utf16_lossy(&units[..end])),
                }
            }
            7 => {
                let units = utf16_units(bytes);
                let mut items = Vec::new();
                let mut current = Vec::new();
                for unit in units {
                    if unit == 0 {
                        if current.is_empty() {
                            break;
                        }
                        items.push(String::from_utf16_lossy(&current));
                        current.clear();
                    } else {
                        current.push(unit);
                    }
                }
                if !current.is_empty() {
                    items.push(String::from_utf16_lossy(&current));
                }
                RegValue {
                    kind: RegKind::MultiString,
                    data: RegData::Multi(items),
                }
            }
            4 if bytes.len() >= 4 => RegValue::dword(u32::from_le_bytes([
                bytes[0], bytes[1], bytes[2], bytes[3],
            ])),
            11 if bytes.len() >= 8 => {
                let mut arr = [0u8; 8];
                arr.copy_from_slice(&bytes[..8]);
                RegValue {
                    kind: RegKind::QWord,
                    data: RegData::QWord(u64::from_le_bytes(arr)),
                }
            }
            3 => RegValue {
                kind: RegKind::Binary,
                data: RegData::Bytes(bytes.to_vec()),
            },
            other => RegValue {
                kind: RegKind::Raw(other),
                data: RegData::Bytes(bytes.to_vec()),
            },
        }
    }

    /// Integer view used by verification helpers (DWORD / QWORD only).
    pub fn as_u64(&self) -> Option<u64> {
        match self.data {
            RegData::DWord(v) => Some(v as u64),
            RegData::QWord(v) => Some(v),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match &self.data {
            RegData::Str(s) => Some(s.as_str()),
            _ => None,
        }
    }
}

// ─── Errors ─────────────────────────────────────────────────────────────────

pub const ERROR_FILE_NOT_FOUND: u32 = 2;
pub const ERROR_PATH_NOT_FOUND: u32 = 3;
pub const ERROR_ACCESS_DENIED: u32 = 5;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RegError {
    pub code: u32,
    pub op: &'static str,
    pub target: String,
}

impl RegError {
    pub fn is_access_denied(&self) -> bool {
        self.code == ERROR_ACCESS_DENIED
    }
    pub fn is_not_found(&self) -> bool {
        self.code == ERROR_FILE_NOT_FOUND || self.code == ERROR_PATH_NOT_FOUND
    }
}

impl fmt::Display for RegError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let reason = match self.code {
            ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND => "not found".to_string(),
            ERROR_ACCESS_DENIED => "access denied".to_string(),
            other => format!("Win32 error {}", other),
        };
        write!(f, "Registry {} failed for {}: {}", self.op, self.target, reason)
    }
}

impl std::error::Error for RegError {}

fn target(hive: Hive, path: &str, name: Option<&str>) -> String {
    match name {
        Some(n) => format!("{}\\{}\\{}", hive.as_str(), path, if n.is_empty() { "(Default)" } else { n }),
        None => format!("{}\\{}", hive.as_str(), path),
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/// Read a value. `Ok(None)` means the key or the value does not exist; any
/// other failure (access denied, I/O error) is an `Err` so callers can abort
/// instead of mistaking it for "absent".
pub fn read_value(hive: Hive, path: &str, name: &str) -> Result<Option<RegValue>, RegError> {
    backend::read_value(hive, path, name)
}

/// Write a value, creating missing keys. Never deletes or recreates an
/// existing key. Returns whether the leaf key had to be created.
pub fn write_value(hive: Hive, path: &str, name: &str, value: &RegValue) -> Result<bool, RegError> {
    #[cfg(test)]
    if test_hooks::is_denied(hive, path, name) {
        // Simulates a value-level filter such as UCPD: the key opens fine,
        // RegSetValueExW returns ERROR_ACCESS_DENIED.
        return Err(RegError {
            code: ERROR_ACCESS_DENIED,
            op: "write",
            target: target(hive, path, Some(name)),
        });
    }
    backend::write_value(hive, path, name, value)
}

/// Test-only injection of value-level write denials (UCPD-style).
#[cfg(test)]
pub(crate) mod test_hooks {
    use super::Hive;
    use std::sync::Mutex;

    static DENIED: Mutex<Vec<(Hive, String, String)>> = Mutex::new(Vec::new());

    fn key(path: &str, name: &str) -> (String, String) {
        (path.trim_matches('\\').to_ascii_lowercase(), name.to_ascii_lowercase())
    }

    pub fn deny_write(hive: Hive, path: &str, name: &str) {
        let (p, n) = key(path, name);
        DENIED.lock().unwrap_or_else(|e| e.into_inner()).push((hive, p, n));
    }

    pub fn allow_write(hive: Hive, path: &str, name: &str) {
        let (p, n) = key(path, name);
        DENIED
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .retain(|(h, dp, dn)| !(*h == hive && *dp == p && *dn == n));
    }

    pub(super) fn is_denied(hive: Hive, path: &str, name: &str) -> bool {
        let (p, n) = key(path, name);
        DENIED
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
            .any(|(h, dp, dn)| *h == hive && *dp == p && *dn == n)
    }
}

/// Delete a value. `Ok(false)` when it (or its key) did not exist.
pub fn delete_value(hive: Hive, path: &str, name: &str) -> Result<bool, RegError> {
    backend::delete_value(hive, path, name)
}

pub fn key_exists(hive: Hive, path: &str) -> Result<bool, RegError> {
    backend::key_exists(hive, path)
}

/// Delete `path` only if it exists and has no values and no subkeys.
pub fn delete_key_if_empty(hive: Hive, path: &str) -> Result<bool, RegError> {
    backend::delete_key_if_empty(hive, path)
}

/// Pre-flight: can this process set values under `path` (or create it)?
/// `Ok(false)` = access denied (TrustedInstaller-owned or ACL-protected).
pub fn can_write(hive: Hive, path: &str) -> Result<bool, RegError> {
    let components: Vec<&str> = path.split('\\').filter(|c| !c.is_empty()).collect();
    if backend::key_exists(hive, path)? {
        return backend::can_open_for_write(hive, path, false);
    }
    // Walk up to the nearest existing ancestor and check CREATE_SUB_KEY there.
    for depth in (0..components.len()).rev() {
        let ancestor = components[..depth].join("\\");
        if depth == 0 || backend::key_exists(hive, &ancestor)? {
            return backend::can_open_for_write(hive, &ancestor, true);
        }
    }
    Ok(true)
}

/// The topmost key along `path` that does not exist yet (the key a write
/// would create first), or `None` if `path` already exists.
pub fn first_missing_key(hive: Hive, path: &str) -> Result<Option<String>, RegError> {
    let components: Vec<&str> = path.split('\\').filter(|c| !c.is_empty()).collect();
    for depth in 1..=components.len() {
        let prefix = components[..depth].join("\\");
        if !backend::key_exists(hive, &prefix)? {
            return Ok(Some(prefix));
        }
    }
    Ok(None)
}

/// After a rollback deleted a value, remove the keys this apply created —
/// from the leaf up to `created_root` — but only while each one is empty.
pub fn prune_created_keys(hive: Hive, path: &str, created_root: &str) -> Result<(), RegError> {
    let root_depth = created_root.split('\\').filter(|c| !c.is_empty()).count();
    let components: Vec<&str> = path.split('\\').filter(|c| !c.is_empty()).collect();
    if root_depth == 0 || root_depth > components.len() {
        return Ok(());
    }
    for depth in (root_depth..=components.len()).rev() {
        let key = components[..depth].join("\\");
        if !backend::delete_key_if_empty(hive, &key)? {
            break;
        }
    }
    Ok(())
}

// ─── Windows backend ────────────────────────────────────────────────────────

#[cfg(windows)]
mod backend {
    use super::{target, Hive, RegError, RegValue};
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{ERROR_MORE_DATA, ERROR_SUCCESS, WIN32_ERROR};
    use windows::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyExW, RegDeleteKeyExW, RegDeleteValueW, RegOpenKeyExW,
        RegQueryInfoKeyW, RegQueryValueExW, RegSetValueExW, HKEY, HKEY_CLASSES_ROOT,
        HKEY_CURRENT_CONFIG, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, HKEY_USERS,
        KEY_CREATE_SUB_KEY, KEY_QUERY_VALUE, KEY_SET_VALUE, KEY_WOW64_64KEY,
        REG_CREATED_NEW_KEY, REG_CREATE_KEY_DISPOSITION, REG_OPTION_NON_VOLATILE,
        REG_SAM_FLAGS, REG_VALUE_TYPE,
    };

    struct Key(HKEY);
    impl Drop for Key {
        fn drop(&mut self) {
            unsafe {
                let _ = RegCloseKey(self.0);
            }
        }
    }

    fn root(hive: Hive) -> HKEY {
        match hive {
            Hive::Hklm => HKEY_LOCAL_MACHINE,
            Hive::Hkcu => HKEY_CURRENT_USER,
            Hive::Hkcr => HKEY_CLASSES_ROOT,
            Hive::Hku => HKEY_USERS,
            Hive::Hkcc => HKEY_CURRENT_CONFIG,
        }
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn err(code: WIN32_ERROR, op: &'static str, target: String) -> RegError {
        RegError {
            code: code.0,
            op,
            target,
        }
    }

    fn open(hive: Hive, path: &str, sam: REG_SAM_FLAGS) -> Result<Key, RegError> {
        let sub = wide(path);
        let mut hkey = HKEY::default();
        let status =
            unsafe { RegOpenKeyExW(root(hive), PCWSTR(sub.as_ptr()), 0, sam | KEY_WOW64_64KEY, &mut hkey) };
        if status != ERROR_SUCCESS {
            return Err(err(status, "open", target(hive, path, None)));
        }
        Ok(Key(hkey))
    }

    pub fn read_value(hive: Hive, path: &str, name: &str) -> Result<Option<RegValue>, RegError> {
        let key = match open(hive, path, KEY_QUERY_VALUE) {
            Ok(key) => key,
            Err(e) if e.is_not_found() => return Ok(None),
            Err(e) => return Err(e),
        };
        let wname = wide(name);
        let mut size: u32 = 0;
        let mut ty = REG_VALUE_TYPE(0);
        let status = unsafe {
            RegQueryValueExW(key.0, PCWSTR(wname.as_ptr()), None, Some(&mut ty), None, Some(&mut size))
        };
        if status != ERROR_SUCCESS {
            let e = err(status, "read", target(hive, path, Some(name)));
            return if e.is_not_found() { Ok(None) } else { Err(e) };
        }
        // Retry loop: the value may grow between the size query and the read.
        for _ in 0..4 {
            let mut buf = vec![0u8; (size as usize).max(1) + 2];
            let mut len = buf.len() as u32;
            let status = unsafe {
                RegQueryValueExW(
                    key.0,
                    PCWSTR(wname.as_ptr()),
                    None,
                    Some(&mut ty),
                    Some(buf.as_mut_ptr()),
                    Some(&mut len),
                )
            };
            if status == ERROR_MORE_DATA {
                size = len;
                continue;
            }
            if status != ERROR_SUCCESS {
                let e = err(status, "read", target(hive, path, Some(name)));
                return if e.is_not_found() { Ok(None) } else { Err(e) };
            }
            buf.truncate(len as usize);
            return Ok(Some(RegValue::from_raw(ty.0, &buf)));
        }
        Err(err(ERROR_MORE_DATA, "read", target(hive, path, Some(name))))
    }

    pub fn write_value(hive: Hive, path: &str, name: &str, value: &RegValue) -> Result<bool, RegError> {
        let sub = wide(path);
        let mut hkey = HKEY::default();
        let mut disposition = REG_CREATE_KEY_DISPOSITION(0);
        let status = unsafe {
            RegCreateKeyExW(
                root(hive),
                PCWSTR(sub.as_ptr()),
                0,
                PCWSTR::null(),
                REG_OPTION_NON_VOLATILE,
                KEY_SET_VALUE | KEY_QUERY_VALUE | KEY_WOW64_64KEY,
                None,
                &mut hkey,
                Some(&mut disposition),
            )
        };
        if status != ERROR_SUCCESS {
            return Err(err(status, "create/open", target(hive, path, None)));
        }
        let key = Key(hkey);
        let wname = wide(name);
        let bytes = value.to_bytes();
        let status = unsafe {
            RegSetValueExW(key.0, PCWSTR(wname.as_ptr()), 0, REG_VALUE_TYPE(value.kind.type_code()), Some(&bytes))
        };
        if status != ERROR_SUCCESS {
            return Err(err(status, "write", target(hive, path, Some(name))));
        }
        Ok(disposition == REG_CREATED_NEW_KEY)
    }

    pub fn delete_value(hive: Hive, path: &str, name: &str) -> Result<bool, RegError> {
        let key = match open(hive, path, KEY_SET_VALUE) {
            Ok(key) => key,
            Err(e) if e.is_not_found() => return Ok(false),
            Err(e) => return Err(e),
        };
        let wname = wide(name);
        let status = unsafe { RegDeleteValueW(key.0, PCWSTR(wname.as_ptr())) };
        if status == ERROR_SUCCESS {
            return Ok(true);
        }
        let e = err(status, "delete value", target(hive, path, Some(name)));
        if e.is_not_found() {
            Ok(false)
        } else {
            Err(e)
        }
    }

    pub fn key_exists(hive: Hive, path: &str) -> Result<bool, RegError> {
        if path.is_empty() {
            return Ok(true);
        }
        match open(hive, path, KEY_QUERY_VALUE) {
            Ok(_) => Ok(true),
            Err(e) if e.is_not_found() => Ok(false),
            Err(e) if e.is_access_denied() => Ok(true),
            Err(e) => Err(e),
        }
    }

    pub fn can_open_for_write(hive: Hive, path: &str, create_sub_key: bool) -> Result<bool, RegError> {
        let sam = if create_sub_key { KEY_CREATE_SUB_KEY } else { KEY_SET_VALUE };
        if path.is_empty() {
            // Opening a predefined root for write is not meaningful; HKLM/HKU
            // roots never allow creating top-level keys for normal callers.
            return Ok(hive == Hive::Hkcu);
        }
        match open(hive, path, sam) {
            Ok(_) => Ok(true),
            Err(e) if e.is_access_denied() => Ok(false),
            Err(e) => Err(e),
        }
    }

    pub fn delete_key_if_empty(hive: Hive, path: &str) -> Result<bool, RegError> {
        if path.is_empty() {
            return Ok(false);
        }
        let key = match open(hive, path, KEY_QUERY_VALUE) {
            Ok(key) => key,
            Err(e) if e.is_not_found() => return Ok(false),
            Err(e) => return Err(e),
        };
        let mut subkeys = 0u32;
        let mut values = 0u32;
        let status = unsafe {
            RegQueryInfoKeyW(
                key.0,
                windows::core::PWSTR::null(),
                None,
                None,
                Some(&mut subkeys),
                None,
                None,
                Some(&mut values),
                None,
                None,
                None,
                None,
            )
        };
        drop(key);
        if status != ERROR_SUCCESS {
            return Err(err(status, "query info", target(hive, path, None)));
        }
        if subkeys != 0 || values != 0 {
            return Ok(false);
        }
        let sub = wide(path);
        let status = unsafe { RegDeleteKeyExW(root(hive), PCWSTR(sub.as_ptr()), KEY_WOW64_64KEY.0, 0) };
        if status == ERROR_SUCCESS {
            Ok(true)
        } else {
            let e = err(status, "delete key", target(hive, path, None));
            if e.is_not_found() {
                Ok(false)
            } else {
                Err(e)
            }
        }
    }
}

// ─── In-memory mock backend (non-Windows) ───────────────────────────────────

#[cfg(not(windows))]
mod backend {
    use super::{Hive, RegError, RegValue};
    use std::collections::BTreeMap;
    use std::sync::Mutex;

    type Store = BTreeMap<(Hive, String), BTreeMap<String, RegValue>>;

    fn store() -> &'static Mutex<Store> {
        static STORE: std::sync::OnceLock<Mutex<Store>> = std::sync::OnceLock::new();
        STORE.get_or_init(|| Mutex::new(BTreeMap::new()))
    }

    fn norm(path: &str) -> String {
        path.trim_matches('\\').to_ascii_lowercase()
    }

    pub fn read_value(hive: Hive, path: &str, name: &str) -> Result<Option<RegValue>, RegError> {
        let guard = store().lock().unwrap_or_else(|e| e.into_inner());
        Ok(guard
            .get(&(hive, norm(path)))
            .and_then(|values| values.get(&name.to_ascii_lowercase()).cloned()))
    }

    pub fn write_value(hive: Hive, path: &str, name: &str, value: &RegValue) -> Result<bool, RegError> {
        let mut guard = store().lock().unwrap_or_else(|e| e.into_inner());
        let leaf = norm(path);
        let created = !guard.contains_key(&(hive, leaf.clone()));
        let parts: Vec<&str> = leaf.split('\\').filter(|p| !p.is_empty()).collect();
        for depth in 1..=parts.len() {
            guard.entry((hive, parts[..depth].join("\\"))).or_default();
        }
        guard
            .entry((hive, leaf))
            .or_default()
            .insert(name.to_ascii_lowercase(), value.clone());
        Ok(created)
    }

    pub fn delete_value(hive: Hive, path: &str, name: &str) -> Result<bool, RegError> {
        let mut guard = store().lock().unwrap_or_else(|e| e.into_inner());
        Ok(guard
            .get_mut(&(hive, norm(path)))
            .map(|values| values.remove(&name.to_ascii_lowercase()).is_some())
            .unwrap_or(false))
    }

    pub fn key_exists(hive: Hive, path: &str) -> Result<bool, RegError> {
        if path.is_empty() {
            return Ok(true);
        }
        let guard = store().lock().unwrap_or_else(|e| e.into_inner());
        Ok(guard.contains_key(&(hive, norm(path))))
    }

    pub fn can_open_for_write(_hive: Hive, _path: &str, _create: bool) -> Result<bool, RegError> {
        Ok(true)
    }

    pub fn delete_key_if_empty(hive: Hive, path: &str) -> Result<bool, RegError> {
        let mut guard = store().lock().unwrap_or_else(|e| e.into_inner());
        let key = (hive, norm(path));
        let Some(values) = guard.get(&key) else {
            return Ok(false);
        };
        let prefix = format!("{}\\", key.1);
        let has_children = guard
            .keys()
            .any(|(h, p)| *h == hive && p.starts_with(&prefix));
        if !values.is_empty() || has_children {
            return Ok(false);
        }
        guard.remove(&key);
        Ok(true)
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hive_allowlist_rejects_injection() {
        assert_eq!(normalize_hive("HKLM").unwrap(), Hive::Hklm);
        assert_eq!(normalize_hive("hkey_current_user").unwrap(), Hive::Hkcu);
        assert_eq!(normalize_hive("HKCU:").unwrap(), Hive::Hkcu);
        assert!(normalize_hive("HKCU'; calc; '").is_err());
        assert!(normalize_hive("HKCU\\Software").is_err());
        assert!(normalize_hive("").is_err());
    }

    #[test]
    fn json_conversion_handles_dword_edge_cases() {
        let big = RegValue::from_json(RegKind::DWord, &serde_json::json!(4294967295u64)).unwrap();
        assert_eq!(big.data, RegData::DWord(u32::MAX));
        let neg = RegValue::from_json(RegKind::DWord, &serde_json::json!(-1)).unwrap();
        assert_eq!(neg.data, RegData::DWord(u32::MAX));
        let hex = RegValue::from_json(RegKind::DWord, &serde_json::json!("0x80000001")).unwrap();
        assert_eq!(hex.data, RegData::DWord(0x8000_0001));
        assert!(RegValue::from_json(RegKind::DWord, &serde_json::json!(4294967296u64)).is_err());
        let q = RegValue::from_json(RegKind::QWord, &serde_json::json!(u64::MAX)).unwrap();
        assert_eq!(q.data, RegData::QWord(u64::MAX));
    }

    #[test]
    fn raw_round_trip_preserves_every_kind() {
        let samples = vec![
            RegValue::string("10"),
            RegValue {
                kind: RegKind::ExpandString,
                data: RegData::Str("%SystemRoot%\\x".into()),
            },
            RegValue {
                kind: RegKind::MultiString,
                data: RegData::Multi(vec!["a".into(), "b".into()]),
            },
            RegValue::dword(0xFFFF_FFFF),
            RegValue {
                kind: RegKind::QWord,
                data: RegData::QWord(1 << 40),
            },
            RegValue {
                kind: RegKind::Binary,
                data: RegData::Bytes(vec![1, 2, 3]),
            },
        ];
        for sample in samples {
            let round = RegValue::from_raw(sample.kind.type_code(), &sample.to_bytes());
            assert_eq!(round, sample);
            let via_json = RegValue::from_json(sample.kind, &sample.to_json()).unwrap();
            assert_eq!(via_json, sample);
            assert_eq!(RegKind::parse(&sample.kind.as_str()).unwrap(), sample.kind);
        }
    }

    #[test]
    fn split_full_path_normalizes() {
        let (hive, sub) = split_full_path("HKLM\\SOFTWARE\\X\\").unwrap();
        assert_eq!(hive, Hive::Hklm);
        assert_eq!(sub, "SOFTWARE\\X");
        assert!(split_full_path("HKXX\\SOFTWARE").is_err());
    }
}
