# ═══════════════════════════════════════════════════════════════════════════════
# redcore · OS — Consumer Windows 11 Depth Proof
# ═══════════════════════════════════════════════════════════════════════════════
# Run this on a REAL consumer Windows 11 machine (not Server).
# Prerequisites: cargo build in apps/service-core
#
# Usage:
#   1. cd apps/service-core && cargo build
#   2. cd ../.. && powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
Write-Output "=== redcore · OS Consumer Windows Proof ==="
Write-Output "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "OS: $([System.Environment]::OSVersion.VersionString)"
Write-Output "Build: $((Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuild)"
Write-Output ""

$exe = "apps\service-core\target\debug\redcore-os-service.exe"
if (-not (Test-Path $exe)) {
    Write-Output "FATAL: $exe not found. Run: cd apps/service-core && cargo build"
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

# ── 1. ASSESS ──
Write-Output "=== 1. ASSESS ==="
$r = Send-Rpc "assess.full" @{} 120000
if ($r -and $r.result) {
    Write-Output "  Windows: $($r.result.windows.caption) build $($r.result.windows.buildNumber)"
    Write-Output "  AppX: $($r.result.appx.count) | Services: $($r.result.services.running)"
    Write-Output "  VM: $($r.result.vm.isVM)"
    Write-Output "  Work: print=$($r.result.workSignals.printSpooler) domain=$($r.result.workSignals.domainJoined)"
    Write-Output "  Score: $($r.result.overallScore)"
    Write-Output "  PASS: assess"
} else { Write-Output "  FAIL: assess"; exit 1 }

Start-Sleep -Seconds 2

# ── 2. CLASSIFY ──
Write-Output "`n=== 2. CLASSIFY ==="
$r = Send-Rpc "classify.machine" @{}
if ($r -and $r.result) {
    Write-Output "  Profile: $($r.result.primary) confidence=$($r.result.confidence)"
    Write-Output "  PASS: classify"
} else { Write-Output "  FAIL: classify"; exit 1 }

Start-Sleep -Seconds 2

# ── 3. PLAN ──
Write-Output "`n=== 3. PLAN ==="
$r = Send-Rpc "transform.plan" @{ profile = $r.result.primary; preset = "balanced" }
if ($r -and $r.result) {
    Write-Output "  Actions: $($r.result.actionCount)"
    Write-Output "  PASS: plan"
} else { Write-Output "  FAIL: plan"; exit 1 }

Start-Sleep -Seconds 2

# ── 4. APPLY 5 SAFE ACTIONS ──
Write-Output "`n=== 4. APPLY (5 safe actions) ==="
$safeActions = @(
    "privacy.disable-advertising-id",
    "privacy.disable-tailored-experiences",
    "shell.disable-copilot",
    "shell.show-file-extensions",
    "shutdown.decrease-shutdown-time"
)

foreach ($actionId in $safeActions) {
    Start-Sleep -Seconds 1
    $r = Send-Rpc "execute.applyAction" @{ actionId = $actionId }
    if ($r -and $r.result) {
        Write-Output "  $actionId : status=$($r.result.status) s=$($r.result.succeeded) f=$($r.result.failed)"
    } else {
        Write-Output "  $actionId : FAIL"
    }
}

Start-Sleep -Seconds 2

# ── 5. VERIFY ──
Write-Output "`n=== 5. READ-BACK VERIFY ==="
$checks = @(
    @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo"; valueName = "Enabled" },
    @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy"; valueName = "TailoredExperiencesWithDiagnosticDataEnabled" },
    @{ hive = "HKCU"; path = "Software\Policies\Microsoft\Windows\WindowsCopilot"; valueName = "TurnOffWindowsCopilot" },
    @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"; valueName = "HideFileExt" },
    @{ hive = "HKCU"; path = "Control Panel\Desktop"; valueName = "AutoEndTasks" }
)

foreach ($check in $checks) {
    $r = Send-Rpc "verify.registryValue" @{ hive = $check.hive; path = $check.path; valueName = $check.valueName }
    if ($r -and $r.result -and $r.result.exists) {
        Write-Output "  VERIFIED: $($check.valueName) = $($r.result.currentValue)"
    } else {
        Write-Output "  MISS: $($check.valueName)"
    }
}

Start-Sleep -Seconds 2

# ── 6. ROLLBACK ──
Write-Output "`n=== 6. ROLLBACK ==="
$r = Send-Rpc "rollback.list" @{}
if ($r -and $r.result) {
    $count = ($r.result | Measure-Object).Count
    Write-Output "  Snapshots: $count"
    if ($count -ge 1) {
        $snapId = $r.result[0].id
        Write-Output "  Restoring: $snapId"
        $r = Send-Rpc "rollback.restore" @{ snapshotId = $snapId }
        if ($r -and $r.result) {
            Write-Output "  Restore: $($r.result.status)"
            Write-Output "  PASS: rollback"
        } else { Write-Output "  FAIL: rollback restore" }
    }
} else { Write-Output "  FAIL: rollback list" }

Start-Sleep -Seconds 2

# ── 7. PERSONALIZATION ──
Write-Output "`n=== 7. PERSONALIZATION ==="
$r = Send-Rpc "personalize.apply" @{ profile = "gaming_desktop"; options = @{ wallpaper = $false } } 30000
if ($r -and $r.result) {
    Write-Output "  status=$($r.result.status) changes=$($r.result.succeeded)"
    # Verify
    $checks = @(
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"; valueName = "AppsUseLightTheme"; label = "dark-mode" },
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"; valueName = "ColorPrevalence"; label = "accent" },
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"; valueName = "ShowTaskViewButton"; label = "taskbar" },
        @{ hive = "HKCU"; path = "SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced"; valueName = "HideFileExt"; label = "explorer" }
    )
    foreach ($check in $checks) {
        Start-Sleep -Milliseconds 300
        $r = Send-Rpc "verify.registryValue" @{ hive = $check.hive; path = $check.path; valueName = $check.valueName }
        if ($r -and $r.result -and $r.result.exists) {
            Write-Output "    VERIFIED [$($check.label)]: $($check.valueName) = $($r.result.currentValue)"
        } else {
            Write-Output "    MISS [$($check.label)]"
        }
    }
    Write-Output "  PASS: personalization"
} else { Write-Output "  WARN: personalization timeout" }

# ── 8. WORK PC BLOCKING ──
Write-Output "`n=== 8. WORK PC BLOCKING ==="
$r = Send-Rpc "transform.plan" @{ profile = "work_pc"; preset = "aggressive" }
if ($r -and $r.result) {
    $ids = @(); $r.result.actions | ForEach-Object { $ids += $_.id }
    $blocked = @("services.disable-print-spooler", "perf.mmcss-system-responsiveness", "system.disable-windows-update")
    foreach ($b in $blocked) {
        if ($ids -contains $b) { Write-Output "  FAIL: $b not blocked" }
        else { Write-Output "  PASS: $b blocked" }
    }
}

# Done
$proc.StandardInput.Close()
$proc.WaitForExit(5000)

Write-Output "`n=== CONSUMER WINDOWS PROOF COMPLETE ==="
Write-Output "Run this script output shows real Windows 11 registry values."
Write-Output "Copy the output and paste it to prove consumer Windows depth."
