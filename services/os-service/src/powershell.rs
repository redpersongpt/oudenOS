
use std::process::Command;

pub struct PsResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

pub fn escape_ps_string(s: &str) -> String {
    s.replace('\'', "''")
}

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

#[allow(dead_code)]
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
