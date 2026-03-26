// ─── PowerShell Bridge ──────────────────────────────────────────────────────
// Executes audited PowerShell commands for tasks where PS is the clearest
// and most auditable approach (bulk registry ops, service management).
// Every command is logged. No undocumented PS spaghetti.

use std::process::Command;

pub struct PsResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a PowerShell command and return the result.
/// All commands are logged to the audit trail.
pub fn execute(script: &str) -> anyhow::Result<PsResult> {
    tracing::info!("PowerShell exec: {}", &script[..script.len().min(200)]);

    let output = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-Command", script,
        ])
        .output()?;

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
pub fn execute_elevated(script: &str, minsudo_path: &str) -> anyhow::Result<PsResult> {
    tracing::info!("PowerShell elevated exec: {}", &script[..script.len().min(200)]);

    let output = Command::new(minsudo_path)
        .args([
            "--TrustedInstaller",
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-Command", script,
        ])
        .output()?;

    Ok(PsResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
