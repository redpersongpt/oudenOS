# security-hardener

**Purpose**: Apply privacy and security hardening while preserving gaming performance.

**Skills Used**: `privacy-hardening`, `syscall-optimization`

---

## Trigger
User says: "harden Windows", "disable telemetry", "privacy settings", "security tuning".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/privacy-hardening/SKILL.md
view_file: .agents/skills/syscall-optimization/SKILL.md
```

### Step 2: Apply Privacy Tweaks
```powershell
# Disable DiagTrack (telemetry)
Stop-Service DiagTrack -Force; Set-Service DiagTrack -StartupType Disabled

# Disable telemetry in registry
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "LimitDiagnosticLogCollection" -Value 1 -Type DWord

# Disable advertising ID
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo" -Name "DisabledByGroupPolicy" -Value 1 -Type DWord

# Disable activity feed
$sysPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
Set-ItemProperty $sysPath -Name "EnableActivityFeed" -Value 0 -Type DWord
Set-ItemProperty $sysPath -Name "AllowClipboardHistory" -Value 0 -Type DWord

# Disable cloud content
$cldPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
Set-ItemProperty $cldPath -Name "DisableCloudOptimizedContent" -Value 1 -Type DWord
Set-ItemProperty $cldPath -Name "DisableWindowsConsumerFeatures" -Value 1 -Type DWord
```

### Step 3: CPU Mitigation Assessment
```powershell
# Check current mitigation status
Install-Module SpeculationControl -Scope CurrentUser -Force
Import-Module SpeculationControl
Get-SpeculationControlSettings | Format-List
```

### Step 4: Optional — Disable SSBD for Performance (AMD Ryzen only — minimal security risk on AMD)
```powershell
# Note: AMD is not vulnerable to Spectre v4 in same way as Intel
# Assess risk before applying:
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" `
    -Name "FeatureSettingsOverride" -Value 8 -Type DWord
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" `
    -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord
```

### Step 5: Disable Remote Access
```powershell
# Disable Remote Assistance
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance" -Name "fAllowToGetHelp" -Value 0 -Type DWord

# Disable Remote Desktop (if not needed)
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Value 1 -Type DWord
```

### Step 6: Firewall Check
```powershell
# Ensure Windows Firewall is active
Get-NetFirewallProfile | Select Name, Enabled

# If disabled, enable:
Set-NetFirewallProfile -All -Enabled True
```

### Step 7: Verify Privacy State
```powershell
(Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection").AllowTelemetry
Get-Service DiagTrack | Select Name, StartType, Status
```
