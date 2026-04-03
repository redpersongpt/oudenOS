// ─── PowerShell Bridge ──────────────────────────────────────────────────────
// Executes audited PowerShell commands for tasks where PS is the clearest
// and most auditable approach (bulk registry ops, service management).
// Every command is logged. No undocumented PS spaghetti.

use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Windows flag to prevent console window from flashing during PowerShell execution.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct PsResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Escape a string for safe interpolation inside a PowerShell single-quoted string.
/// Single quotes inside the value are doubled (`'` -> `''`) which is the PS escape
/// for literal single quotes within `'...'` strings.
pub fn escape_ps_string(s: &str) -> String {
    s.replace('\'', "''")
}

/// Validate that a string is safe to use as a PowerShell argument (no injection).
/// Rejects strings containing characters that could break out of quoting context.
pub fn validate_safe_arg<'a>(s: &'a str, context: &str) -> anyhow::Result<&'a str> {
    const DANGEROUS: &[char] = &[';', '`', '$', '|', '&', '(', ')', '\n', '\r'];
    for ch in DANGEROUS {
        if s.contains(*ch) {
            anyhow::bail!(
                "Unsafe character '{}' in {} value '{}' — possible injection attempt",
                ch,
                context,
                &s[..s.len().min(80)]
            );
        }
    }
    Ok(s)
}

/// Build a PowerShell command with platform-appropriate flags.
fn build_ps_command(script: &str) -> Command {
    let mut cmd = Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle", "Hidden",
        "-ExecutionPolicy", "Bypass",
        "-Command", script,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd
}

/// Execute a PowerShell command and return the result.
/// All commands are logged to the audit trail.
pub fn execute(script: &str) -> anyhow::Result<PsResult> {
    tracing::info!("PowerShell exec: {}", &script[..script.len().min(200)]);

    let output = build_ps_command(script).output()?;

    let result = PsResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    };

    if !result.success {
        tracing::warn!(
            "PowerShell command failed (exit {}): {}",
            result.exit_code,
            result.stderr.trim()
        );
    }

    Ok(result)
}

/// Execute a PowerShell command with elevated privileges via MinSudo.
#[allow(dead_code)]
pub fn execute_elevated(script: &str, minsudo_path: &str) -> anyhow::Result<PsResult> {
    tracing::info!("PowerShell elevated exec: {}", &script[..script.len().min(200)]);

    let mut cmd = Command::new(minsudo_path);
    cmd.args([
        "--TrustedInstaller",
        "powershell.exe",
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle", "Hidden",
        "-ExecutionPolicy", "Bypass",
        "-Command", script,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output()?;

    Ok(PsResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
