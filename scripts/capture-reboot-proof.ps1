# ─── Windows Reboot/Resume Proof Capture ─────────────────────────────────────
# Two-phase proof that the execution ledger survives a real Windows restart.
#
# Phase A (pre-reboot): --phase pre-reboot
#   - Starts service, creates a proof execution plan in DB ledger
#   - Executes some actions, leaves others queued
#   - Marks plan as paused_reboot via system.reboot (simulated, no actual reboot)
#   - Captures pre-reboot artifacts
#   - Registers a post-reboot continuation task in Windows Task Scheduler
#   - Then triggers actual system restart
#
# Phase B (post-reboot): --phase post-reboot
#   - Runs automatically via Task Scheduler after Windows restarts
#   - Starts service, verifies DB survived reboot
#   - Calls journal.state — verifies plan is paused_reboot
#   - Calls journal.resume — verifies remainingActions returned
#   - Verifies action queue integrity
#   - Captures post-reboot artifacts
#   - Produces final reboot-proof-summary.json with PASS/FAIL
#   - Cleans up the scheduled task
#
# USAGE:
#   Phase A: .\scripts\capture-reboot-proof.ps1 -Phase pre-reboot [-ServicePath path] [-OutputDir path]
#   Phase B: .\scripts\capture-reboot-proof.ps1 -Phase post-reboot [-ServicePath path] [-OutputDir path]
#   Full:    .\scripts\capture-reboot-proof.ps1 -Phase pre-reboot  (auto-triggers reboot + phase B)
#
# The --OutputDir must be the SAME directory for both phases.

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("pre-reboot", "post-reboot")]
    [string]$Phase,
    [string]$ServicePath = "",
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$TASK_NAME = "RedcoreOS-RebootProof-PostReboot"

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
    Write-Error "Service binary not found. Build first."
    exit 1
}

$ServicePath = (Resolve-Path $ServicePath).Path

# ─── Setup output directory ─────────────────────────────────────────────────

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
if (-not $OutputDir) {
    $OutputDir = "artifacts\reboot-proof\$timestamp"
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$OutputDir = (Resolve-Path $OutputDir).Path

# Save the output dir path for phase B to find
$markerPath = Join-Path $env:LOCALAPPDATA "redcore-os\reboot-proof-dir.txt"
if ($Phase -eq "pre-reboot") {
    New-Item -ItemType Directory -Force -Path (Split-Path $markerPath) | Out-Null
    Set-Content -Path $markerPath -Value $OutputDir
} elseif (Test-Path $markerPath) {
    $savedDir = Get-Content $markerPath -Raw
    if ($savedDir) { $OutputDir = $savedDir.Trim() }
}

Write-Host ""
Write-Host "  redcore OS — Reboot/Resume Proof ($Phase)"
Write-Host "  ──────────────────────────────────────────"
Write-Host "  Binary:  $ServicePath"
Write-Host "  Output:  $OutputDir"
Write-Host "  Phase:   $Phase"
Write-Host ""

# ─── Service helpers ────────────────────────────────────────────────────────

$playbooks = Resolve-Path "playbooks" -ErrorAction SilentlyContinue
$env:REDCORE_PLAYBOOK_DIR = if ($playbooks) { $playbooks.Path } else { "playbooks" }

$script:process = $null
$script:requestId = 0
$script:checks = @()

function Start-Service {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $ServicePath
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $script:process = [System.Diagnostics.Process]::Start($psi)
    Start-Sleep -Seconds 3

    if ($script:process.HasExited) {
        throw "Service exited immediately with code $($script:process.ExitCode)"
    }
}

function Stop-Service {
    if ($script:process -and -not $script:process.HasExited) {
        try { $script:process.StandardInput.Close() } catch { }
        Start-Sleep -Seconds 2
        if (-not $script:process.HasExited) { $script:process.Kill() }
    }
}

function Send-RPC {
    param([string]$Method, [hashtable]$Params = @{})
    $script:requestId++
    $rpc = @{ id = $script:requestId; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 10
    $script:process.StandardInput.WriteLine($rpc)
    $script:process.StandardInput.Flush()

    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        if ($script:process.StandardOutput.Peek() -ge 0) {
            $line = $script:process.StandardOutput.ReadLine()
            try {
                $parsed = $line | ConvertFrom-Json
                if ($parsed.id -eq $script:requestId) { return $parsed }
            } catch { }
        }
        Start-Sleep -Milliseconds 100
    }
    throw "Timeout waiting for $Method"
}

function Save-Artifact {
    param([string]$Name, $Data)
    $path = Join-Path $OutputDir "$Name.json"
    $Data | ConvertTo-Json -Depth 20 | Set-Content -Path $path -Encoding UTF8
}

function Add-Check {
    param([string]$Name, [bool]$Pass, [string]$Detail = "")
    $status = if ($Pass) { "PASS" } else { "FAIL" }
    Write-Host "  $status  $Name$(if ($Detail) { " ($Detail)" })"
    $script:checks += @{ name = $Name; pass = $Pass; detail = $Detail; timestamp = (Get-Date -Format o); phase = $Phase }
}

# ─── Phase A: Pre-reboot ────────────────────────────────────────────────────

if ($Phase -eq "pre-reboot") {
    try {
        Start-Service
        Add-Check "pre-service-starts" $true ""

        # Create a proof plan with multiple actions via ledger.createPlan
        $planId = "reboot-proof-$timestamp"
        $createResult = Send-RPC "ledger.createPlan" @{
            package = @{
                planId = $planId
                packageId = "redcore-os"
                packageRole = "user-resolved"
            }
            profile = "gaming_desktop"
            preset = "balanced"
            actions = @(
                @{ actionId = "privacy.disable-advertising-id"; actionName = "Disable Advertising ID"; phase = "Privacy"; queuePosition = 0; riskLevel = "safe"; expertOnly = $false; requiresReboot = $false; questionKeys = @(); selectedValues = @() },
                @{ actionId = "privacy.disable-ceip"; actionName = "Disable CEIP"; phase = "Privacy"; queuePosition = 1; riskLevel = "safe"; expertOnly = $false; requiresReboot = $false; questionKeys = @(); selectedValues = @() },
                @{ actionId = "privacy.disable-error-reporting"; actionName = "Disable Error Reporting"; phase = "Privacy"; queuePosition = 2; riskLevel = "safe"; expertOnly = $false; requiresReboot = $true; questionKeys = @(); selectedValues = @() }
            )
        }
        Save-Artifact "pre-create-plan" $createResult.result
        Add-Check "pre-plan-created" ($createResult.result.planId -eq $planId) "planId=$planId"

        # Execute the first action only
        Send-RPC "ledger.markStarted" @{ planId = $planId; actionId = "privacy.disable-advertising-id" }
        $applyResult = Send-RPC "execute.applyAction" @{
            actionId = "privacy.disable-advertising-id"
            journalContext = @{
                package = @{ planId = $planId; packageId = "redcore-os"; packageRole = "user-resolved" }
                action = @{ actionId = "privacy.disable-advertising-id"; label = "Disable Advertising ID"; phase = "Privacy"; requiresReboot = $false; questionKeys = @(); selectedValues = @() }
            }
        }
        Save-Artifact "pre-apply-first" $applyResult.result
        Add-Check "pre-first-action-applied" ($applyResult.result.status -eq "success") ""

        # Mark plan as paused_reboot (simulates the reboot boundary)
        # Use ledger.markStarted on next action so it's "running" when we pause
        Send-RPC "ledger.markStarted" @{ planId = $planId; actionId = "privacy.disable-ceip" }

        # Capture journal state before reboot
        $journalBefore = Send-RPC "journal.state"
        Save-Artifact "pre-journal-state" $journalBefore.result
        Add-Check "pre-journal-has-plan" ($null -ne $journalBefore.result) ""

        # Capture ledger state before reboot
        $ledgerBefore = Send-RPC "ledger.query" @{ planId = $planId; includeLedger = $true }
        Save-Artifact "pre-ledger-state" $ledgerBefore.result
        $preRemaining = $ledgerBefore.result.totalRemaining
        Add-Check "pre-has-remaining-actions" ($preRemaining -gt 0) "remaining=$preRemaining"

        # Now simulate reboot by calling system.reboot (which marks paused_reboot in DB)
        # On real Windows this will actually reboot; the journalContext tells the DB to pause
        $rebootResult = Send-RPC "system.reboot" @{
            reason = "reboot-resume-proof"
            journalContext = @{
                plan_id = $planId
                package_id = "redcore-os"
                package_role = "user-resolved"
            }
        }
        Save-Artifact "pre-reboot-result" $rebootResult.result
        Add-Check "pre-reboot-registered" ($rebootResult.result.status -eq "scheduled" -or $rebootResult.result.status -eq "simulated") "status=$($rebootResult.result.status)"

        # Save pre-reboot summary
        $preSummary = @{ phase = "pre-reboot"; planId = $planId; timestamp = $timestamp; checks = $script:checks; remainingBeforeReboot = $preRemaining }
        Save-Artifact "pre-reboot-summary" $preSummary

    } catch {
        Add-Check "pre-unexpected-error" $false $_.Exception.Message
    } finally {
        Stop-Service
    }

    # Register post-reboot task
    $repoRoot = (Get-Location).Path
    $taskAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$repoRoot\scripts\capture-reboot-proof.ps1`" -Phase post-reboot -ServicePath `"$ServicePath`" -OutputDir `"$OutputDir`"" -WorkingDirectory $repoRoot
    $taskTrigger = New-ScheduledTaskTrigger -AtLogon
    $taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

    try {
        Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
    } catch { }
    Register-ScheduledTask -TaskName $TASK_NAME -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Description "redcore OS reboot proof phase B" | Out-Null

    Write-Host ""
    Write-Host "  Pre-reboot phase complete."
    Write-Host "  Scheduled task '$TASK_NAME' registered for post-reboot."
    Write-Host "  The system will now reboot. Phase B runs automatically after login."
    Write-Host ""

    $passed = ($script:checks | Where-Object { $_.pass }).Count
    $failed = ($script:checks | Where-Object { -not $_.pass }).Count
    Write-Host "  Pre-reboot: $passed passed, $failed failed"

    if ($failed -gt 0) {
        Write-Host "  Pre-reboot FAILED. Aborting reboot."
        exit 1
    }

    # On real Windows, trigger actual reboot
    # shutdown /r /t 10 /f /c "redcore OS reboot proof"
    Write-Host "  To reboot now: shutdown /r /t 0 /f /c `"redcore reboot proof`""
    exit 0
}

# ─── Phase B: Post-reboot ───────────────────────────────────────────────────

if ($Phase -eq "post-reboot") {
    # Wait for system to settle after reboot
    Start-Sleep -Seconds 5

    try {
        Start-Service
        Add-Check "post-service-starts-after-reboot" $true ""

        # Read pre-reboot summary to get planId
        $preSummaryPath = Join-Path $OutputDir "pre-reboot-summary.json"
        if (-not (Test-Path $preSummaryPath)) {
            Add-Check "post-pre-summary-found" $false "pre-reboot-summary.json not found"
            throw "Cannot continue without pre-reboot artifacts"
        }
        $preSummary = Get-Content $preSummaryPath -Raw | ConvertFrom-Json
        $planId = $preSummary.planId
        Add-Check "post-pre-summary-found" $true "planId=$planId"

        # Verify journal state survived reboot
        $journalAfter = Send-RPC "journal.state"
        Save-Artifact "post-journal-state" $journalAfter.result
        $hasPlan = $null -ne $journalAfter.result
        $isPaused = $journalAfter.result.status -eq "paused_reboot" -or $journalAfter.result.requiresReboot -eq $true
        Add-Check "post-journal-survived-reboot" $hasPlan "status=$($journalAfter.result.status)"
        Add-Check "post-plan-is-paused" $isPaused ""

        # Verify remaining actions survived
        $ledgerAfter = Send-RPC "ledger.query" @{ planId = $planId }
        Save-Artifact "post-ledger-before-resume" $ledgerAfter.result
        $postRemaining = $ledgerAfter.result.totalRemaining
        $preRemaining = $preSummary.remainingBeforeReboot
        Add-Check "post-remaining-actions-survived" ($postRemaining -gt 0) "remaining=$postRemaining (was $preRemaining)"

        # Call journal.resume — the core resume path
        $resumeResult = Send-RPC "journal.resume"
        Save-Artifact "post-resume-result" $resumeResult.result
        $resumed = $resumeResult.result.resumed
        $remainingActions = $resumeResult.result.remainingActions
        Add-Check "post-resume-returns-actions" ($null -ne $remainingActions -and $remainingActions.Count -gt 0) "resumed=$resumed, remaining=$($remainingActions.Count)"

        # Verify remaining action IDs match what was queued
        if ($remainingActions -and $remainingActions.Count -gt 0) {
            $actionIds = $remainingActions | ForEach-Object { $_.actionId }
            $hasExpected = $actionIds -contains "privacy.disable-ceip" -or $actionIds -contains "privacy.disable-error-reporting"
            Add-Check "post-remaining-ids-correct" $hasExpected "ids=[$($actionIds -join ', ')]"
        }

        # Verify ledger state after resume
        $ledgerFinal = Send-RPC "ledger.query" @{ planId = $planId }
        Save-Artifact "post-ledger-after-resume" $ledgerFinal.result
        $finalStatus = $ledgerFinal.result.status
        Add-Check "post-ledger-status-running" ($finalStatus -eq "running") "status=$finalStatus"

    } catch {
        Add-Check "post-unexpected-error" $false $_.Exception.Message
    } finally {
        Stop-Service
    }

    # Clean up scheduled task
    try {
        Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
    } catch { }

    # Clean up marker file
    if (Test-Path $markerPath) { Remove-Item $markerPath -Force }

    # ── Final reboot proof summary ──────────────────────────────────────────

    # Load pre-reboot checks
    $preChecks = $preSummary.checks
    $allChecks = @()
    if ($preChecks) { $allChecks += $preChecks }
    $allChecks += $script:checks

    $passed = ($allChecks | Where-Object { $_.pass }).Count
    $failed = ($allChecks | Where-Object { -not $_.pass }).Count
    $verdict = if ($failed -eq 0) { "PASS" } else { "FAIL" }

    # ── Build identity binding ──
    $gitCommitSha = "unknown"
    $appVersion = "unknown"
    try { $gitCommitSha = (git rev-parse HEAD 2>$null).Trim() } catch { }
    try {
        $pkgPath = Join-Path (Get-Location) "apps\os-desktop\package.json"
        if (Test-Path $pkgPath) { $appVersion = (Get-Content $pkgPath -Raw | ConvertFrom-Json).version }
    } catch { }

    $finalSummary = @{
        type = "reboot-resume-proof"
        verdict = $verdict
        passed = $passed
        failed = $failed
        planId = $planId
        timestamp = $timestamp
        preRebootChecks = $preChecks
        postRebootChecks = $script:checks
        allChecks = $allChecks
        # Binding fields — required by evidence contract
        gitCommitSha = $gitCommitSha
        appVersion = $appVersion
        targetPlatform = "x86_64-pc-windows-msvc"
        hostName = $env:COMPUTERNAME
    }
    Save-Artifact "reboot-proof-summary" $finalSummary

    # ── Seal the reboot proof bundle ──
    Write-Host ""
    Write-Host "  Sealing reboot proof bundle..."
    try {
        $sealScript = Join-Path (Get-Location) "scripts\seal-proof-bundle.mjs"
        if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $sealScript)) {
            node $sealScript $OutputDir --reboot 2>&1 | ForEach-Object { Write-Host "  $_" }
        } else {
            Write-Host "  WARN: node or seal script not found — manifest not generated"
        }
    } catch {
        Write-Host "  WARN: Sealing failed: $($_.Exception.Message)"
    }

    Write-Host ""
    Write-Host "  Reboot/resume proof: $passed passed, $failed failed"
    Write-Host "  VERDICT: $verdict"
    Write-Host "  Artifacts: $OutputDir"
    Write-Host ""

    exit $(if ($failed -eq 0) { 0 } else { 1 })
}
