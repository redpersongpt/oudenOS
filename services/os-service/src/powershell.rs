// ─── PowerShell Bridge ──────────────────────────────────────────────────────
// Executes audited PowerShell commands for the few operations that still need
// PowerShell (AppX, scheduled tasks, placeholder discovery, playbook-authored
// commands). Registry and service changes use native APIs (registry.rs /
// services.rs).
//
// Every script:
//   * runs with -NoProfile -NonInteractive -ExecutionPolicy Bypass;
//   * gets a UTF-8 output-encoding prefix (PowerShell 5.1 otherwise writes in
//     the OEM code page, e.g. CP857 on Turkish systems) and progress disabled;
//   * runs under a hard timeout — on expiry the whole process tree is killed;
//   * if it mutates the system (`execute_mutation*`), starts with
//     `$ErrorActionPreference='Stop'` so the first error fails the script.

use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Windows flag to prevent console window from flashing during PowerShell execution.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Default timeout for a single PowerShell invocation.
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(60);
/// Timeout for long-running operations (AppX removal, restore points).
pub const LONG_TIMEOUT: Duration = Duration::from_secs(300);

const OUTPUT_PREFIX: &str = "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false; \
$OutputEncoding = [Console]::OutputEncoding; $ProgressPreference = 'SilentlyContinue'; ";
const MUTATION_PREFIX: &str = "$ErrorActionPreference = 'Stop'; ";

pub struct PsResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Escape a string for safe interpolation inside a PowerShell single-quoted
/// string. PowerShell treats the typographic quotes U+2018/U+2019/U+201A/U+201B
/// exactly like `'`, so they are doubled too. Control characters (newlines,
/// NUL, …) are rejected outright.
pub fn escape_ps_string(s: &str) -> anyhow::Result<String> {
    if let Some(bad) = s.chars().find(|c| c.is_control()) {
        anyhow::bail!(
            "Control character U+{:04X} is not allowed in a PowerShell argument",
            bad as u32
        );
    }
    let mut out = String::with_capacity(s.len() + 2);
    for ch in s.chars() {
        match ch {
            '\'' | '\u{2018}' | '\u{2019}' | '\u{201A}' | '\u{201B}' => {
                out.push(ch);
                out.push(ch);
            }
            other => out.push(other),
        }
    }
    Ok(out)
}

/// `escape_ps_string` wrapped in single quotes.
pub fn ps_quote(s: &str) -> anyhow::Result<String> {
    Ok(format!("'{}'", escape_ps_string(s)?))
}

/// Validate that a string is safe to use as a bare (unquoted) PowerShell /
/// command-line argument. Rejects anything that could break out of the token.
pub fn validate_safe_arg<'a>(s: &'a str, context: &str) -> anyhow::Result<&'a str> {
    const DANGEROUS: &[char] = &[
        ';', '`', '$', '|', '&', '(', ')', '{', '}', '<', '>', '\'', '"', '\u{2018}', '\u{2019}',
        '\u{201A}', '\u{201B}', '\u{201C}', '\u{201D}',
    ];
    if s.chars().any(|c| c.is_control() || DANGEROUS.contains(&c)) {
        anyhow::bail!(
            "Unsafe character in {} value '{}' — possible injection attempt",
            context,
            s.chars().take(80).collect::<String>()
        );
    }
    Ok(s)
}

/// Build the full script text with the standard prefixes.
pub(crate) fn wrap_script(script: &str, mutation: bool) -> String {
    let mut full = String::with_capacity(script.len() + 200);
    full.push_str(OUTPUT_PREFIX);
    if mutation {
        full.push_str(MUTATION_PREFIX);
    }
    full.push_str(script);
    full
}

fn build_command(program: &str, leading: &[&str], script: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.args(leading);
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// Kill a process and all of its children.
fn kill_tree(child: &mut std::process::Child) {
    #[cfg(windows)]
    {
        let pid = child.id().to_string();
        let mut killer = Command::new("taskkill.exe");
        killer
            .args(["/PID", &pid, "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        killer.creation_flags(CREATE_NO_WINDOW);
        let _ = killer.status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

/// Run a command, capturing output, with a hard timeout.
pub(crate) fn run_with_timeout(mut cmd: Command, timeout: Duration, label: &str) -> anyhow::Result<PsResult> {
    let mut child = cmd.spawn()?;
    let mut stdout_pipe = child.stdout.take();
    let mut stderr_pipe = child.stderr.take();
    let out_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(pipe) = stdout_pipe.as_mut() {
            let _ = pipe.read_to_end(&mut buf);
        }
        buf
    });
    let err_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(pipe) = stderr_pipe.as_mut() {
            let _ = pipe.read_to_end(&mut buf);
        }
        buf
    });

    let started = Instant::now();
    let mut sleep = Duration::from_millis(2);
    let status = loop {
        if let Some(status) = child.try_wait()? {
            break status;
        }
        if started.elapsed() >= timeout {
            kill_tree(&mut child);
            let _ = out_thread.join();
            let _ = err_thread.join();
            tracing::error!(label = label, timeout_secs = timeout.as_secs(), "Process timed out — killed");
            anyhow::bail!("{} timed out after {}s and was terminated", label, timeout.as_secs());
        }
        std::thread::sleep(sleep);
        sleep = (sleep * 2).min(Duration::from_millis(25));
    };

    let stdout = out_thread.join().unwrap_or_default();
    let stderr = err_thread.join().unwrap_or_default();
    Ok(PsResult {
        success: status.success(),
        stdout: String::from_utf8_lossy(&stdout).to_string(),
        stderr: String::from_utf8_lossy(&stderr).to_string(),
        exit_code: status.code().unwrap_or(-1),
    })
}

fn execute_inner(script: &str, mutation: bool, timeout: Duration) -> anyhow::Result<PsResult> {
    tracing::info!(
        mutation = mutation,
        "PowerShell exec: {}",
        script.chars().take(200).collect::<String>()
    );
    let full = wrap_script(script, mutation);
    let result = run_with_timeout(build_command("powershell.exe", &[], &full), timeout, "PowerShell")?;
    if !result.success {
        tracing::warn!(
            "PowerShell command failed (exit {}): {}",
            result.exit_code,
            result.stderr.trim()
        );
    }
    Ok(result)
}

/// Execute a read-only PowerShell script (60 s timeout).
pub fn execute(script: &str) -> anyhow::Result<PsResult> {
    execute_inner(script, false, DEFAULT_TIMEOUT)
}

/// Execute a read-only PowerShell script with a custom timeout.
pub fn execute_with_timeout(script: &str, timeout: Duration) -> anyhow::Result<PsResult> {
    execute_inner(script, false, timeout)
}

/// Execute a system-mutating script: `$ErrorActionPreference='Stop'` prefix.
pub fn execute_mutation(script: &str) -> anyhow::Result<PsResult> {
    execute_inner(script, true, DEFAULT_TIMEOUT)
}

pub fn execute_mutation_with_timeout(script: &str, timeout: Duration) -> anyhow::Result<PsResult> {
    execute_inner(script, true, timeout)
}

/// Returns `true` if this process is running with administrator privileges
/// (token elevation, queried natively). Cached for the process lifetime.
#[cfg(windows)]
pub fn is_elevated() -> bool {
    use std::sync::OnceLock;
    static ELEVATED: OnceLock<bool> = OnceLock::new();
    *ELEVATED.get_or_init(|| {
        use windows::Win32::Foundation::{CloseHandle, HANDLE};
        use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
        unsafe {
            let mut token = HANDLE::default();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
                return false;
            }
            let mut elevation = TOKEN_ELEVATION::default();
            let mut returned = 0u32;
            let ok = GetTokenInformation(
                token,
                TokenElevation,
                Some(&mut elevation as *mut _ as *mut core::ffi::c_void),
                std::mem::size_of::<TOKEN_ELEVATION>() as u32,
                &mut returned,
            )
            .is_ok();
            let _ = CloseHandle(token);
            ok && elevation.TokenIsElevated != 0
        }
    })
}

/// On non-Windows hosts (simulated/demo builds) there is no Windows elevation
/// concept; treat as elevated so the simulated apply flow is not blocked.
#[cfg(not(windows))]
pub fn is_elevated() -> bool {
    true
}

pub fn resolve_minsudo_path() -> Option<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(from_env) = std::env::var("OUDENOS_MINSUDO_PATH") {
        candidates.push(PathBuf::from(from_env));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("MinSudo.exe"));
            candidates.push(parent.join("tools").join("MinSudo.exe"));
            candidates.push(parent.join("resources").join("MinSudo.exe"));
        }
    }

    // The repo-relative path is only meaningful for development builds.
    #[cfg(debug_assertions)]
    {
        let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(|path| path.parent())
            .map(|path| path.to_path_buf());
        if let Some(root) = repo_root {
            candidates.push(
                root.join("third_party")
                    .join("windows-backend")
                    .join("pc-tuning")
                    .join("bin")
                    .join("MinSudo.exe"),
            );
        }
    }

    candidates.into_iter().find(|candidate| candidate.exists())
}

pub fn execute_with_privilege(
    script: &str,
    requires_trusted_installer: bool,
) -> anyhow::Result<PsResult> {
    if requires_trusted_installer {
        let minsudo_path = resolve_minsudo_path().ok_or_else(|| {
            anyhow::anyhow!("MinSudo.exe not found for TrustedInstaller execution")
        })?;
        return execute_elevated(script, &minsudo_path.to_string_lossy());
    }

    execute_mutation(script)
}

/// Execute a mutating PowerShell command as TrustedInstaller via MinSudo.
pub fn execute_elevated(script: &str, minsudo_path: &str) -> anyhow::Result<PsResult> {
    tracing::info!(
        "PowerShell TrustedInstaller exec: {}",
        script.chars().take(200).collect::<String>()
    );
    let full = wrap_script(script, true);
    let cmd = build_command(minsudo_path, &["--TrustedInstaller", "powershell.exe"], &full);
    run_with_timeout(cmd, DEFAULT_TIMEOUT, "PowerShell (TrustedInstaller)")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escape_doubles_ascii_and_typographic_quotes() {
        assert_eq!(escape_ps_string("it's").unwrap(), "it''s");
        assert_eq!(escape_ps_string("a\u{2019}b").unwrap(), "a\u{2019}\u{2019}b");
        assert_eq!(
            escape_ps_string("\u{2018}\u{201A}\u{201B}").unwrap(),
            "\u{2018}\u{2018}\u{201A}\u{201A}\u{201B}\u{201B}"
        );
        assert!(escape_ps_string("line\nbreak").is_err());
        assert!(escape_ps_string("nul\0").is_err());
    }

    #[test]
    fn safe_arg_rejects_quotes_and_operators() {
        assert!(validate_safe_arg("SysMain", "service").is_ok());
        assert!(validate_safe_arg("54533251-82be-4824-96c1-47b60b740d00", "guid").is_ok());
        for bad in ["a;b", "a'b", "a\u{2019}b", "a$b", "a\nb", "a\"b"] {
            assert!(validate_safe_arg(bad, "x").is_err(), "{bad:?} must be rejected");
        }
    }

    #[test]
    fn mutation_scripts_stop_on_first_error_and_force_utf8() {
        let wrapped = wrap_script("Set-Thing", true);
        assert!(wrapped.contains("$ErrorActionPreference = 'Stop'"));
        assert!(wrapped.contains("UTF8Encoding"));
        assert!(wrapped.contains("$ProgressPreference = 'SilentlyContinue'"));
        assert!(!wrap_script("Get-Thing", false).contains("ErrorActionPreference"));
    }
}
