// ─── Native Service Control ─────────────────────────────────────────────────
// Start-type queries/changes through the Service Control Manager
// (OpenSCManagerW / QueryServiceConfigW / ChangeServiceConfigW). Errors are
// classified by Win32 code, never by (localized) message text.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceState {
    /// "Boot" | "System" | "Automatic" | "Manual" | "Disabled"
    pub start_type: String,
    #[serde(default)]
    pub delayed_auto_start: bool,
    #[serde(default)]
    pub running: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SvcError {
    NotFound,
    AccessDenied,
    Other(String),
}

impl std::fmt::Display for SvcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SvcError::NotFound => write!(f, "service not found"),
            SvcError::AccessDenied => write!(f, "access denied"),
            SvcError::Other(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for SvcError {}

pub const ERROR_SERVICE_DOES_NOT_EXIST: u32 = 1060;

pub fn classify_win32(code: u32) -> SvcError {
    match code {
        ERROR_SERVICE_DOES_NOT_EXIST => SvcError::NotFound,
        5 => SvcError::AccessDenied,
        other => SvcError::Other(format!("Win32 error {}", other)),
    }
}

/// Normalize the start-type spellings used by playbooks, PowerShell
/// (`Get-Service.StartType`) and WMI (`Win32_Service.StartMode` = "Auto").
pub fn normalize_start_type(raw: &str) -> Option<&'static str> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "auto" | "automatic" => Some("Automatic"),
        "automaticdelayedstart" | "delayed" | "automatic (delayed start)" => Some("AutomaticDelayedStart"),
        "manual" | "demand" => Some("Manual"),
        "disabled" => Some("Disabled"),
        "boot" => Some("Boot"),
        "system" => Some("System"),
        _ => None,
    }
}

impl ServiceState {
    /// True if this state already satisfies the requested start type.
    pub fn matches(&self, desired: &str) -> bool {
        match normalize_start_type(desired) {
            Some("AutomaticDelayedStart") => self.start_type == "Automatic" && self.delayed_auto_start,
            Some("Automatic") => self.start_type == "Automatic" && !self.delayed_auto_start,
            Some(other) => self.start_type == other,
            None => false,
        }
    }
}

#[cfg(windows)]
mod backend {
    use super::{classify_win32, ServiceState, SvcError};
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::System::Services::{
        ChangeServiceConfig2W, ChangeServiceConfigW, CloseServiceHandle, ControlService,
        OpenSCManagerW, OpenServiceW, QueryServiceConfig2W, QueryServiceConfigW,
        QueryServiceStatus, StartServiceW, ENUM_SERVICE_TYPE, QUERY_SERVICE_CONFIGW, SC_HANDLE,
        SC_MANAGER_CONNECT, SERVICE_AUTO_START, SERVICE_BOOT_START, SERVICE_CHANGE_CONFIG,
        SERVICE_CONFIG_DELAYED_AUTO_START_INFO, SERVICE_CONTROL_STOP,
        SERVICE_DELAYED_AUTO_START_INFO, SERVICE_DEMAND_START, SERVICE_DISABLED, SERVICE_ERROR,
        SERVICE_NO_CHANGE, SERVICE_QUERY_CONFIG, SERVICE_QUERY_STATUS, SERVICE_RUNNING,
        SERVICE_START, SERVICE_START_TYPE, SERVICE_STATUS, SERVICE_STOP, SERVICE_SYSTEM_START,
    };

    struct Handle(SC_HANDLE);
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseServiceHandle(self.0);
            }
        }
    }

    fn win32_code(e: &windows::core::Error) -> u32 {
        let hr = e.code().0 as u32;
        if hr & 0xFFFF_0000 == 0x8007_0000 {
            hr & 0xFFFF
        } else {
            hr
        }
    }

    fn map(e: windows::core::Error) -> SvcError {
        classify_win32(win32_code(&e))
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn open(name: &str, access: u32) -> Result<Handle, SvcError> {
        unsafe {
            let scm = Handle(OpenSCManagerW(PCWSTR::null(), PCWSTR::null(), SC_MANAGER_CONNECT).map_err(map)?);
            let w = wide(name);
            let svc = OpenServiceW(scm.0, PCWSTR(w.as_ptr()), access).map_err(map)?;
            Ok(Handle(svc))
        }
    }

    pub fn query(name: &str) -> Result<Option<ServiceState>, SvcError> {
        let svc = match open(name, SERVICE_QUERY_CONFIG | SERVICE_QUERY_STATUS) {
            Ok(h) => h,
            Err(SvcError::NotFound) => return Ok(None),
            Err(e) => return Err(e),
        };
        unsafe {
            let mut needed = 0u32;
            let _ = QueryServiceConfigW(svc.0, None, 0, &mut needed);
            let mut buf = vec![0u64; (needed as usize / 8) + 2];
            let config_ptr = buf.as_mut_ptr() as *mut QUERY_SERVICE_CONFIGW;
            QueryServiceConfigW(svc.0, Some(config_ptr), (buf.len() * 8) as u32, &mut needed)
                .map_err(map)?;
            let start = (*config_ptr).dwStartType;
            let start_type = match start {
                s if s == SERVICE_BOOT_START => "Boot",
                s if s == SERVICE_SYSTEM_START => "System",
                s if s == SERVICE_AUTO_START => "Automatic",
                s if s == SERVICE_DEMAND_START => "Manual",
                s if s == SERVICE_DISABLED => "Disabled",
                _ => "Manual",
            };

            let mut delayed = false;
            let mut info_buf = [0u8; 64];
            let mut info_needed = 0u32;
            if QueryServiceConfig2W(
                svc.0,
                SERVICE_CONFIG_DELAYED_AUTO_START_INFO,
                Some(&mut info_buf),
                &mut info_needed,
            )
            .is_ok()
            {
                let info = &*(info_buf.as_ptr() as *const SERVICE_DELAYED_AUTO_START_INFO);
                delayed = info.fDelayedAutostart.as_bool();
            }

            let mut status = SERVICE_STATUS::default();
            let running = QueryServiceStatus(svc.0, &mut status).is_ok()
                && status.dwCurrentState == SERVICE_RUNNING;

            Ok(Some(ServiceState {
                start_type: start_type.to_string(),
                delayed_auto_start: delayed && start_type == "Automatic",
                running,
            }))
        }
    }

    pub fn set_start_type(name: &str, start_type: &str, delayed: bool) -> Result<(), SvcError> {
        let start = match start_type {
            "Automatic" | "AutomaticDelayedStart" => SERVICE_AUTO_START,
            "Manual" => SERVICE_DEMAND_START,
            "Disabled" => SERVICE_DISABLED,
            "Boot" => SERVICE_BOOT_START,
            "System" => SERVICE_SYSTEM_START,
            other => return Err(SvcError::Other(format!("Unsupported start type '{}'", other))),
        };
        let svc = open(name, SERVICE_CHANGE_CONFIG | SERVICE_QUERY_CONFIG)?;
        unsafe {
            ChangeServiceConfigW(
                svc.0,
                ENUM_SERVICE_TYPE(SERVICE_NO_CHANGE),
                SERVICE_START_TYPE(start.0),
                SERVICE_ERROR(SERVICE_NO_CHANGE),
                PCWSTR::null(),
                PCWSTR::null(),
                None,
                PCWSTR::null(),
                PCWSTR::null(),
                PCWSTR::null(),
                PCWSTR::null(),
            )
            .map_err(map)?;
            if start == SERVICE_AUTO_START {
                let info = SERVICE_DELAYED_AUTO_START_INFO {
                    fDelayedAutostart: BOOL::from(delayed),
                };
                let _ = ChangeServiceConfig2W(
                    svc.0,
                    SERVICE_CONFIG_DELAYED_AUTO_START_INFO,
                    Some(&info as *const _ as *const core::ffi::c_void),
                );
            }
        }
        Ok(())
    }

    /// Ask the service to stop without waiting for it.
    pub fn request_stop(name: &str) -> Result<(), SvcError> {
        let svc = open(name, SERVICE_STOP)?;
        let mut status = SERVICE_STATUS::default();
        unsafe { ControlService(svc.0, SERVICE_CONTROL_STOP, &mut status).map_err(map) }
    }

    pub fn start(name: &str) -> Result<(), SvcError> {
        let svc = open(name, SERVICE_START)?;
        unsafe { StartServiceW(svc.0, None).map_err(map) }
    }
}

#[cfg(not(windows))]
mod backend {
    use super::{ServiceState, SvcError};
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};

    fn store() -> &'static Mutex<HashMap<String, ServiceState>> {
        static STORE: OnceLock<Mutex<HashMap<String, ServiceState>>> = OnceLock::new();
        STORE.get_or_init(|| Mutex::new(HashMap::new()))
    }

    pub fn query(name: &str) -> Result<Option<ServiceState>, SvcError> {
        let guard = store().lock().unwrap_or_else(|e| e.into_inner());
        Ok(Some(guard.get(&name.to_ascii_lowercase()).cloned().unwrap_or(ServiceState {
            start_type: "Automatic".into(),
            delayed_auto_start: false,
            running: true,
        })))
    }

    pub fn set_start_type(name: &str, start_type: &str, delayed: bool) -> Result<(), SvcError> {
        let mut guard = store().lock().unwrap_or_else(|e| e.into_inner());
        let normalized = if start_type == "AutomaticDelayedStart" { "Automatic" } else { start_type };
        let entry = guard.entry(name.to_ascii_lowercase()).or_insert(ServiceState {
            start_type: "Automatic".into(),
            delayed_auto_start: false,
            running: true,
        });
        entry.start_type = normalized.to_string();
        entry.delayed_auto_start = normalized == "Automatic" && delayed;
        Ok(())
    }

    pub fn request_stop(name: &str) -> Result<(), SvcError> {
        let mut guard = store().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(entry) = guard.get_mut(&name.to_ascii_lowercase()) {
            entry.running = false;
        }
        Ok(())
    }

    pub fn start(name: &str) -> Result<(), SvcError> {
        let mut guard = store().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(entry) = guard.get_mut(&name.to_ascii_lowercase()) {
            entry.running = true;
        }
        Ok(())
    }
}

pub use backend::{query, request_stop, set_start_type, start};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn start_type_spellings_normalize() {
        assert_eq!(normalize_start_type("Auto"), Some("Automatic"));
        assert_eq!(normalize_start_type("automatic"), Some("Automatic"));
        assert_eq!(normalize_start_type("Disabled"), Some("Disabled"));
        assert_eq!(normalize_start_type("Demand"), Some("Manual"));
        assert_eq!(normalize_start_type("bogus"), None);
    }

    #[test]
    fn already_configured_respects_delayed_flag() {
        let state = ServiceState {
            start_type: "Automatic".into(),
            delayed_auto_start: true,
            running: true,
        };
        assert!(state.matches("AutomaticDelayedStart"));
        assert!(!state.matches("Automatic"));
        assert!(!state.matches("Disabled"));
    }

    #[test]
    fn win32_codes_classify_locale_independently() {
        assert_eq!(classify_win32(1060), SvcError::NotFound);
        assert_eq!(classify_win32(5), SvcError::AccessDenied);
        assert!(matches!(classify_win32(1051), SvcError::Other(_)));
    }

    #[cfg(windows)]
    #[test]
    fn native_query_reads_a_real_service_and_reports_missing() {
        // Read-only: querying config works unelevated.
        let state = query("EventLog").expect("query EventLog");
        assert!(state.is_some());
        assert_eq!(query("OudenOSDefinitelyMissingSvc").unwrap(), None);
    }
}
