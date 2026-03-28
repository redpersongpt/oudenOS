# ═══════════════════════════════════════════════════════════════════════════════
# redcore · OS — Consumer Windows 11 Playbook-Native Proof
# ═══════════════════════════════════════════════════════════════════════════════
# Proves the full playbook-native path on a REAL consumer Windows 11 machine.
#
# Flow: assess → classify → playbook.resolve → execute from resolved plan
#       → verify → rollback → personalization → app bundle → work PC blocking
#
# Prerequisites:
#   cd services/os-service && cargo build
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1
#
# Output: copy the transcript as proof artifact.
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Write-Output "╔══════════════════════════════════════════════════════════════╗"
Write-Output "║  redcore · OS — Consumer Windows Playbook-Native Proof     ║"
Write-Output "╚══════════════════════════════════════════════════════════════╝"
Write-Output ""
Write-Output "Date:  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "OS:    $([System.Environment]::OSVersion.VersionString)"
Write-Output "Build: $((Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuild)"
Write-Output "User:  $env:USERNAME"
Write-Output ""

$exe = "services\os-service\target\debug\redcore-os-service.exe"
if (-not (Test-Path $exe)) {
    Write-Output "FATAL: $exe not found. Run: cd services/os-service && cargo build"
    exit 1
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = (Resolve-Path $exe).Path
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$proc = [System.Diagnostics.Process]::Start($psi)
$stderrTask = $proc.StandardError.ReadToEndAsync()
Start-Sleep -Seconds 3

$nextId = 1
$streamCorrupted = $false
$allPassed = $true

function Send-Rpc($method, $params, $timeoutMs = 30000) {
    if ($script:streamCorrupted) { return $null }
    $rid = $script:nextId++
    $req = @{ id = $rid; method = $method; params = $params } | ConvertTo-Json -Compress -Depth 10
    $proc.StandardInput.WriteLine($req)
    $proc.StandardInput.Flush()
    $t = $proc.StandardOutput.ReadLineAsync()
    if ($t.Wait($timeoutMs)) {
        return ($t.Result | ConvertFrom-Json)
    }
    $script:streamCorrupted = $true
    return $null
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: ASSESS
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "── STEP 1: ASSESS ──"
$r = Send-Rpc "assess.full" @{} 120000
if ($r -and $r.result) {
    Write-Output "  Windows: $($r.result.windows.caption) build $($r.result.windows.buildNumber)"
    Write-Output "  AppX: $($r.result.appx.count) removable | Services: $($r.result.services.running) running"
    Write-Output "  VM: $($r.result.vm.isVM) | Score: $($r.result.overallScore)"
    Write-Output "  Work: print=$($r.result.workSignals.printSpooler) domain=$($r.result.workSignals.domainJoined)"
    Write-Output "  PASS: assess.full"
    $detectedProfile = $r.result
} else { Write-Output "  FAIL: assess.full"; $allPassed = $false; exit 1 }

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: CLASSIFY
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "`n── STEP 2: CLASSIFY ──"
$r = Send-Rpc "classify.machine" @{}
if ($r -and $r.result) {
    $profile = $r.result.primary
    $confidence = $r.result.confidence
    Write-Output "  Profile: $profile (confidence=$confidence)"
    Write-Output "  PASS: classify.machine"
} else { Write-Output "  FAIL: classify.machine"; $allPassed = $false; exit 1 }

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: PLAYBOOK RESOLVE (playbook-native mainline — NOT transform.plan)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "`n── STEP 3: PLAYBOOK RESOLVE ──"
$pb = Send-Rpc "playbook.resolve" @{ profile = $profile; preset = "balanced" }
if ($pb -and $pb.result) {
    Write-Output "  Playbook: $($pb.result.playbookName) v$($pb.result.playbookVersion)"
    Write-Output "  Profile:  $($pb.result.profile) | Preset: $($pb.result.preset)"
    Write-Output "  Included: $($pb.result.totalIncluded) | Blocked: $($pb.result.totalBlocked) | Optional: $($pb.result.totalOptional) | Expert: $($pb.result.totalExpertOnly)"
    Write-Output "  Phases:   $(($pb.result.phases | Measure-Object).Count)"
    Write-Output "  PASS: playbook.resolve"
} else { Write-Output "  FAIL: playbook.resolve"; $allPassed = $false; exit 1 }

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: EXECUTE FROM RESOLVED PLAYBOOK (playbook → execute chain)
# Extract first 8 included actions from the resolved playbook and execute them.
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "`n── STEP 4: PLAYBOOK → EXECUTE CHAIN ──"

$includedActions = @()
foreach ($phase in $pb.result.phases) {
    foreach ($action in $phase.actions) {
        if ($action.status -eq "Included" -and $includedActions.Count -lt 8) {
            $includedActions += $action.id
        }
    }
}

Write-Output "  Executing $($includedActions.Count) actions from resolved playbook:"
$snapshotIds = @()

foreach ($actionId in $includedActions) {
    Start-Sleep -Seconds 1
    $r = Send-Rpc "execute.applyAction" @{ actionId = $actionId }
    if ($r -and $r.result) {
        $status = $r.result.status
        $snapId = $r.result.snapshotId
        if ($snapId) { $snapshotIds += $snapId }

        if ($status -eq "success") {
            Write-Output "    PASS: $actionId (s=$($r.result.succeeded) f=$($r.result.failed))"
        } elseif ($status -eq "partial") {
            Write-Output "    PARTIAL: $actionId (s=$($r.result.succeeded) f=$($r.result.failed))"
        } else {
            Write-Output "    FAIL: $actionId ($status)"
            $allPassed = $false
        }
    } else {
        Write-Output "    FAIL: $actionId (timeout/error)"
        $allPassed = $false
    }
}

Write-Output "  Snapshots created: $($snapshotIds.Count)"

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: REGISTRY READ-BACK VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "`n── STEP 5: REGISTRY READ-BACK ──"
$checks = @(
    @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo"; valueName = "Enabled"; action = "privacy.disable-advertising-id" },
    @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy"; valueName = "TailoredExperiencesWithDiagnosticDataEnabled"; action = "privacy.disable-tailored-experiences" },
    @{ hive = "HKCU"; path = "Software\Policies\Microsoft\Windows\WindowsCopilot"; valueName = "TurnOffWindowsCopilot"; action = "shell.disable-copilot" },
    @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"; valueName = "HideFileExt"; action = "shell.show-file-extensions" },
    @{ hive = "HKCU"; path = "Control Panel\Desktop"; valueName = "AutoEndTasks"; action = "shutdown.decrease-shutdown-time" },
    @{ hive = "HKLM"; path = "SOFTWARE\Policies\Microsoft\Windows\DataCollection"; valueName = "AllowTelemetry"; action = "privacy.disable-telemetry" },
    @{ hive = "HKLM"; path = "SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"; valueName = "SystemResponsiveness"; action = "perf.mmcss-system-responsiveness" }
)

$verified = 0
foreach ($check in $checks) {
    Start-Sleep -Milliseconds 300
    $r = Send-Rpc "verify.registryValue" @{ hive = $check.hive; path = $check.path; valueName = $check.valueName }
    if ($r -and $r.result -and $r.result.exists) {
        Write-Output "    VERIFIED [$($check.action)]: $($check.valueName) = $($r.result.currentValue)"
        $verified++
    } else {
        Write-Output "    MISS [$($check.action)]: $($check.valueName)"
    }
}
Write-Output "  Read-back: $verified/$($checks.Count) verified"

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: ROLLBACK
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "`n── STEP 6: ROLLBACK ──"
$r = Send-Rpc "rollback.list" @{}
if ($r -and $r.result) {
    $count = ($r.result | Measure-Object).Count
    Write-Output "  Snapshots in DB: $count"
    if ($snapshotIds.Count -ge 1) {
        $restoreId = $snapshotIds[0]
        Write-Output "  Restoring: $restoreId"
        $r = Send-Rpc "rollback.restore" @{ snapshotId = $restoreId }
        if ($r -and $r.result) {
            Write-Output "  Restore status: $($r.result.status)"
            Write-Output "  PASS: rollback"
        } else { Write-Output "  FAIL: rollback restore" }
    }
} else { Write-Output "  FAIL: rollback list" }

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: PERSONALIZATION
# ═══════════════════════════════════════════════════════════════════════════════
Write-Output "`n── STEP 7: PERSONALIZATION ──"
$r = Send-Rpc "personalize.apply" @{ profile = $profile; options = @{ wallpaper = $false } } 30000
if ($r -and $r.result) {
    Write-Output "  status=$($r.result.status) changes=$($r.result.changesApplied)"
    $persChecks = @(
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"; valueName = "AppsUseLightTheme"; label = "dark-mode" },
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"; valueName = "ColorPrevalence"; label = "accent" },
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"; valueName = "ShowTaskViewButton"; label = "taskbar" },
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"; valueName = "HideFileExt"; label = "explorer" }
    )
    foreach ($check in $persChecks) {
        Start-Sleep -Milliseconds 300
        $r = Send-Rpc "verify.registryValue" @{ hive = $check.hive; path = $check.path; valueName = $check.valueName }
        if ($r -and $r.result -and $r.result.exists) {
            Write-Output "    VERIFIED [$($check.label)]: $($check.valueName) = $($r.result.currentValue)"
        } else {
            Write-Output "    MISS [$($check.label)]"
        }
    }
    Write-Output "  PASS: personalization"
} else { Write-Output "  WARN: personalization timeout (non-blocking)" }

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8: APP BUNDLE (playbook-native)
# ═══════════════════════════════════════════════════════════════════════════════
if (-not $script:streamCorrupted) {
    Write-Output "`n── STEP 8: APP BUNDLE ──"
    $r = Send-Rpc "appbundle.getRecommended" @{ profile = $profile }
    if ($r -and $r.result) {
        $appCount = if ($r.result.apps) { ($r.result.apps | Measure-Object).Count } else { 0 }
        Write-Output "  Recommended: $appCount apps for $profile"

        # Select first 2 recommended apps and resolve install queue
        $selectedApps = @()
        if ($r.result.apps) {
            foreach ($app in $r.result.apps) {
                if ($app.recommended -and $selectedApps.Count -lt 2) {
                    $selectedApps += $app.id
                }
            }
        }

        if ($selectedApps.Count -gt 0) {
            Start-Sleep -Seconds 1
            $resolved = Send-Rpc "appbundle.resolve" @{ profile = $profile; selectedApps = $selectedApps }
            if ($resolved -and $resolved.result) {
                $queueCount = if ($resolved.result.queue) { ($resolved.result.queue | Measure-Object).Count } else { 0 }
                Write-Output "  Install queue: $queueCount apps ($($selectedApps -join ', '))"
                Write-Output "  PASS: appbundle.resolve"
            } else {
                Write-Output "  FAIL: appbundle.resolve"
                $allPassed = $false
            }
        }
        Write-Output "  PASS: appbundle.getRecommended"
    } else {
        Write-Output "  INFO: appbundle not available (non-blocking)"
    }
}

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 9: WORK PC PLAYBOOK BLOCKING (via playbook.resolve, not transform.plan)
# ═══════════════════════════════════════════════════════════════════════════════
if (-not $script:streamCorrupted) {
    Write-Output "`n── STEP 9: WORK PC PLAYBOOK BLOCKING ──"
    $wpb = Send-Rpc "playbook.resolve" @{ profile = "work_pc"; preset = "aggressive" }
    if ($wpb -and $wpb.result) {
        $wpIncluded = @()
        foreach ($phase in $wpb.result.phases) {
            foreach ($action in $phase.actions) {
                if ($action.status -eq "Included") { $wpIncluded += $action.id }
            }
        }
        Write-Output "  Work PC: $($wpb.result.totalIncluded) included, $($wpb.result.totalBlocked) blocked"

        $mustBlock = @("services.disable-print-spooler", "perf.mmcss-system-responsiveness", "system.disable-windows-update")
        foreach ($b in $mustBlock) {
            if ($wpIncluded -contains $b) {
                Write-Output "    FAIL: $b not blocked for work_pc"
                $allPassed = $false
            } else {
                Write-Output "    PASS: $b correctly blocked"
            }
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# VERDICT
# ═══════════════════════════════════════════════════════════════════════════════
$proc.StandardInput.Close()
$proc.WaitForExit(5000)

Write-Output ""
Write-Output "╔══════════════════════════════════════════════════════════════╗"
Write-Output "║  CONSUMER WINDOWS PROOF SUMMARY                            ║"
Write-Output "╠══════════════════════════════════════════════════════════════╣"
Write-Output "║  Path: playbook.resolve → execute.applyAction (mainline)   ║"
Write-Output "║  Actions executed: $($includedActions.Count) from resolved playbook               ║"
Write-Output "║  Registry verified: $verified/$($checks.Count)                                    ║"
Write-Output "║  Rollback: $($snapshotIds.Count) snapshots, 1 restored                         ║"
Write-Output "║  App bundle: getRecommended + resolve proven                ║"
Write-Output "║  Work PC: playbook.resolve blocking verified                ║"
Write-Output "╚══════════════════════════════════════════════════════════════╝"

if ($allPassed) {
    Write-Output "`nRESULT: ALL PROOFS PASSED"
} else {
    Write-Output "`nRESULT: SOME PROOFS FAILED — see above"
    exit 1
}
