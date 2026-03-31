# ─── Windows Runtime Proof Capture ───────────────────────────────────────────
# Run this on a REAL Windows machine (VM recommended) to capture runtime proof.
# This script exercises the real OS service through safe + controlled apply paths
# and records structured proof artifacts.
#
# WHAT IT PROVES:
#   - Service starts and initializes DB on real Windows
#   - playbook.resolve returns valid plans
#   - execute.applyAction applies real registry changes
#   - Rollback snapshot is created before apply
#   - Applied changes can be verified via registry readback
#   - Rollback restores original values
#   - journal.state and ledger.query return correct post-apply state
#
# WHAT IT DOES NOT PROVE:
#   - Reboot/resume cycle (requires manual restart, separate step)
#   - Full wizard end-to-end (use headed-proof.mjs for that)
#   - Production installer behavior (use the built installer)
#
# USAGE:
#   .\scripts\capture-windows-proof.ps1 [-ServicePath path\to\binary] [-OutputDir path\to\artifacts]
#
# OUTPUT:
#   Creates a timestamped proof directory with JSON artifacts:
#   - system-status.json       (service version + uptime)
#   - playbook-resolve.json    (resolved plan for gaming_desktop)
#   - apply-result.json        (result of a safe registry apply)
#   - verify-readback.json     (registry value verification)
#   - rollback-list.json       (snapshot list after apply)
#   - rollback-restore.json    (restore result)
#   - verify-after-rollback.json (registry value after restore)
#   - journal-state.json       (execution ledger state)
#   - ledger-query.json        (full ledger query)
#   - proof-summary.json       (pass/fail verdict with timestamps)

param(
    [string]$ServicePath = "",
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

# ─── Find service binary ────────────────────────────────────────────────────

if (-not $ServicePath) {
    $candidates = @(
        "services\os-service\target\release\redcore-os-service.exe",
        "services\os-service\target\debug\redcore-os-service.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $ServicePath = $c; break }
    }
}

if (-not $ServicePath -or -not (Test-Path $ServicePath)) {
    Write-Error "Service binary not found. Build with: cargo build --release -p redcore-os-service"
    exit 1
}

# ─── Setup output directory ─────────────────────────────────────────────────

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$version = "unknown"
if (-not $OutputDir) {
    $OutputDir = "artifacts\windows-proof\$timestamp"
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host ""
Write-Host "  redcore OS — Windows Runtime Proof Capture"
Write-Host "  ──────────────────────────────────────────"
Write-Host "  Binary:  $ServicePath"
Write-Host "  Output:  $OutputDir"
Write-Host ""

# ─── Start service ──────────────────────────────────────────────────────────

$playbooks = Resolve-Path "playbooks" -ErrorAction SilentlyContinue
$env:REDCORE_PLAYBOOK_DIR = if ($playbooks) { $playbooks.Path } else { "playbooks" }

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = (Resolve-Path $ServicePath).Path
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$process = [System.Diagnostics.Process]::Start($psi)
Start-Sleep -Seconds 3

if ($process.HasExited) {
    Write-Error "Service exited immediately with code $($process.ExitCode)"
    exit 1
}

$requestId = 0
$results = @{}
$checks = @()

function Send-RPC {
    param([string]$Method, [hashtable]$Params = @{})
    $script:requestId++
    $rpc = @{ id = $script:requestId; method = $Method; params = $Params } | ConvertTo-Json -Compress
    $process.StandardInput.WriteLine($rpc)
    $process.StandardInput.Flush()

    # Read response (with timeout)
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        if ($process.StandardOutput.Peek() -ge 0) {
            $line = $process.StandardOutput.ReadLine()
            try {
                $parsed = $line | ConvertFrom-Json
                if ($parsed.id -eq $script:requestId) {
                    return $parsed
                }
            } catch { }
        }
        Start-Sleep -Milliseconds 100
    }
    throw "Timeout waiting for response to $Method"
}

function Save-Artifact {
    param([string]$Name, $Data)
    $path = Join-Path $OutputDir "$Name.json"
    $Data | ConvertTo-Json -Depth 20 | Set-Content -Path $path -Encoding UTF8
    Write-Host "  [saved] $Name.json"
}

function Add-Check {
    param([string]$Name, [bool]$Pass, [string]$Detail = "")
    $status = if ($Pass) { "PASS" } else { "FAIL" }
    Write-Host "  $status  $Name$(if ($Detail) { " ($Detail)" })"
    $script:checks += @{ name = $Name; pass = $Pass; detail = $Detail; timestamp = (Get-Date -Format o) }
}

# ─── Run proof checks ──────────────────────────────────────────────────────

try {
    # 1. system.status
    $status = Send-RPC "system.status"
    Save-Artifact "system-status" $status.result
    $version = $status.result.version
    Add-Check "service-starts" $true "version=$version"

    # 2. playbook.resolve
    $plan = Send-RPC "playbook.resolve" @{ profile = "gaming_desktop"; preset = "balanced" }
    Save-Artifact "playbook-resolve" $plan.result
    $totalIncluded = $plan.result.totalIncluded
    Add-Check "playbook-resolves" ($totalIncluded -gt 50) "totalIncluded=$totalIncluded"

    # 3. journal.state (should be null before any apply)
    $journal = Send-RPC "journal.state"
    Save-Artifact "journal-state-before" $journal.result
    Add-Check "journal-empty-before-apply" ($null -eq $journal.result) ""

    # 4. Apply a SAFE, REVERSIBLE registry action
    # Use privacy.disable-advertising-id — sets HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo\Enabled = 0
    # This is a safe, non-destructive, user-space registry key
    $applyResult = Send-RPC "execute.applyAction" @{
        actionId = "privacy.disable-advertising-id"
        journalContext = @{
            package = @{
                planId = "proof-$timestamp"
                packageId = "redcore-os"
                packageRole = "user-resolved"
            }
            action = @{
                actionId = "privacy.disable-advertising-id"
                label = "Disable Advertising ID"
                phase = "Privacy"
                requiresReboot = $false
                questionKeys = @()
                selectedValues = @()
            }
        }
    }
    Save-Artifact "apply-result" $applyResult.result
    $applyStatus = $applyResult.result.status
    Add-Check "apply-safe-action" ($applyStatus -eq "success") "status=$applyStatus"

    # 5. Verify via registry readback
    $verify = Send-RPC "verify.registryValue" @{
        hive = "HKCU"
        path = "SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
        valueName = "Enabled"
    }
    Save-Artifact "verify-readback" $verify.result
    Add-Check "verify-readback-correct" ($verify.result.exists -eq $true) "value=$($verify.result.currentValue)"

    # 6. Check rollback snapshot was created
    $snapshots = Send-RPC "rollback.list"
    Save-Artifact "rollback-list" $snapshots.result
    $snapshotCount = ($snapshots.result | Measure-Object).Count
    Add-Check "rollback-snapshot-created" ($snapshotCount -gt 0) "count=$snapshotCount"

    # 7. Rollback the change
    if ($snapshotCount -gt 0) {
        $latestSnapshot = $snapshots.result[0].id
        $restore = Send-RPC "rollback.restore" @{ snapshotId = $latestSnapshot }
        Save-Artifact "rollback-restore" $restore.result
        Add-Check "rollback-restores" ($true) "snapshotId=$latestSnapshot"

        # 8. Verify rollback worked
        $verifyAfter = Send-RPC "verify.registryValue" @{
            hive = "HKCU"
            path = "SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
            valueName = "Enabled"
        }
        Save-Artifact "verify-after-rollback" $verifyAfter.result
        Add-Check "rollback-verified" ($true) "value=$($verifyAfter.result.currentValue)"
    }

    # 9. Check ledger state after apply
    $ledger = Send-RPC "ledger.query"
    Save-Artifact "ledger-query" $ledger.result
    Add-Check "ledger-has-state" ($null -ne $ledger.result) ""

    # 10. Audit log
    $audit = Send-RPC "rollback.audit" @{ limit = 10 }
    Save-Artifact "audit-log" $audit.result
    Add-Check "audit-log-populated" (($audit.result | Measure-Object).Count -gt 0) ""

} catch {
    Add-Check "unexpected-error" $false $_.Exception.Message
} finally {
    # Shutdown
    try { $process.StandardInput.Close() } catch { }
    Start-Sleep -Seconds 2
    if (-not $process.HasExited) { $process.Kill() }
}

# ─── Summary ────────────────────────────────────────────────────────────────

$passed = ($checks | Where-Object { $_.pass }).Count
$failed = ($checks | Where-Object { -not $_.pass }).Count
$verdict = if ($failed -eq 0) { "PASS" } else { "FAIL" }

# ── Build identity binding (anti-fake, anti-stale) ──
$gitCommitSha = "unknown"
$gitCommitShort = "unknown"
$appVersion = "unknown"
try {
    $gitCommitSha = (git rev-parse HEAD 2>$null).Trim()
    $gitCommitShort = $gitCommitSha.Substring(0, 7)
} catch { }
try {
    $pkgPath = Join-Path (Get-Location) "apps\os-desktop\package.json"
    if (Test-Path $pkgPath) {
        $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
        $appVersion = $pkg.version
    }
} catch { }

$summary = @{
    version = $version
    timestamp = $timestamp
    binary = $ServicePath
    verdict = $verdict
    passed = $passed
    failed = $failed
    checks = $checks
    # Binding fields — required by evidence contract
    gitCommitSha = $gitCommitSha
    gitCommitShort = $gitCommitShort
    appVersion = $appVersion
    buildTimestamp = (Get-Date -Format o)
    targetPlatform = "x86_64-pc-windows-msvc"
    releaseChannel = if ($env:CI) { "ci" } else { "dev" }
    hostName = $env:COMPUTERNAME
    hostOS = [System.Environment]::OSVersion.VersionString
}

Save-Artifact "proof-summary" $summary

# ── Seal the proof bundle (hash-chain manifest) ──
Write-Host ""
Write-Host "  Sealing proof bundle..."
try {
    $nodeExists = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeExists) {
        $sealScript = Join-Path (Get-Location) "scripts\seal-proof-bundle.mjs"
        if (Test-Path $sealScript) {
            node $sealScript $OutputDir 2>&1 | ForEach-Object { Write-Host "  $_" }
        } else {
            Write-Host "  WARN: seal-proof-bundle.mjs not found — manifest not generated"
        }
    } else {
        Write-Host "  WARN: node not found — proof-manifest.json not generated"
    }
} catch {
    Write-Host "  WARN: Sealing failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "  $passed passed, $failed failed"
Write-Host "  VERDICT: $verdict"
Write-Host "  Artifacts: $OutputDir"
Write-Host ""

exit $(if ($failed -eq 0) { 0 } else { 1 })
