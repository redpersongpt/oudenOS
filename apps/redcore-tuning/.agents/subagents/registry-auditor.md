# registry-auditor

**Purpose**: Audit the current state of all recommended registry optimizations vs. what's actually applied.

**Skills Used**: `registry-tweaks`

---

## Trigger
User says: "audit my registry tweaks", "check what's been applied", "registry audit".

---

## Workflow

### Step 1: Read Registry Tweaks Skill
```
view_file: .agents/skills/registry-tweaks/SKILL.md
```

### Step 2: Check Each Key Category

```powershell
function Check-RegValue {
    param([string]$Path, [string]$Name, $ExpectedValue, [string]$Description)
    try {
        $actual = (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name
        $status = if ($actual -eq $ExpectedValue) { "✅ PASS" } else { "❌ FAIL (actual: $actual, expected: $ExpectedValue)" }
    } catch {
        $status = "⚠️ KEY NOT FOUND"
    }
    Write-Host "$Description: $status"
}

# Win32PrioritySeparation
Check-RegValue "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "Win32PrioritySeparation" 38 "Win32PrioritySeparation (0x26)"

# Mouse acceleration
Check-RegValue "HKCU:\Control Panel\Mouse" "MouseSpeed" "0" "Pointer Acceleration Disabled"
Check-RegValue "HKCU:\Control Panel\Mouse" "MouseThreshold1" "0" "MouseThreshold1"

# Telemetry
Check-RegValue "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" "AllowTelemetry" 0 "Telemetry Disabled"

# Fast startup
Check-RegValue "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "HiberbootEnabled" 0 "Fast Startup Disabled"

# GameBarPresenceWriter
Check-RegValue "HKLM:\SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter" "ActivationType" 0 "GameBarPresenceWriter Disabled"

# FTH
Check-RegValue "HKLM:\SOFTWARE\Microsoft\FTH" "Enabled" 0 "Fault Tolerant Heap Disabled"

# GlobalTimerResolutionRequests
Check-RegValue "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" "GlobalTimerResolutionRequests" 1 "GlobalTimerResolutionRequests Enabled"

# Advertising ID
Check-RegValue "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo" "DisabledByGroupPolicy" 1 "Advertising ID Disabled"
```

### Step 3: Check Service States
```powershell
$services = @{
    "DiagTrack" = "Disabled"
    "SysMain" = "Disabled"
    "WSearch" = "Automatic"  # Only disable if not using Windows Search
    "WerSvc" = "Disabled"
}

foreach ($svc in $services.Keys) {
    $s = Get-Service $svc -ErrorAction SilentlyContinue
    if ($s) {
        $match = $s.StartType -eq $services[$svc]
        Write-Host "$svc ($($services[$svc])): $(if ($match) { '✅ PASS' } else { "❌ FAIL (is $($s.StartType))" })"
    }
}
```

### Step 4: Apply Fixes
Where audit reveals missing tweaks, direct user to:
- `bin/apply-registry.ps1` with appropriate option name
- Relevant skill for manual PowerShell application

---

## Output
```
Win32PrioritySeparation (0x26): ✅ PASS
Pointer Acceleration Disabled: ❌ FAIL (actual: 1, expected: 0)
Telemetry Disabled: ✅ PASS
Fast Startup Disabled: ✅ PASS
DiagTrack (Disabled): ✅ PASS
GlobalTimerResolutionRequests Enabled: ❌ KEY NOT FOUND (Win10 2004 — N/A)
```
