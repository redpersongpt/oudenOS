---
name: registry-tweaks
description: Comprehensive Windows registry optimization patterns for gaming — applying, auditing, rolling back, and documenting registry changes via apply-registry.ps1 and .reg files.
---

# Registry Tweaks Skill

## Overview
This skill covers the project's registry application workflow, key gaming tweaks not covered in other skills, and how to safely apply, audit, and roll back registry changes.

---

## 1. apply-registry.ps1 Workflow

The main registry application script uses an ordered hashtable of registry entries:

```powershell
# Syntax
.\apply-registry.ps1 -get_option_keys "option name" -windows_build 22621

# Apply a specific option (e.g., disable pointer acceleration)
.\apply-registry.ps1 -get_option_keys "disable pointer acceleration" -windows_build 22621

# Build registry documentation
.\apply-registry.ps1 -build_docs
```

### Available Options (from apply-registry.ps1)
- `disable windows update`
- `disable driver installation via windows update`
- `disable automatic maintenance`
- `disable sticky keys`
- `disable windows defender`
- `disable telemetry`
- `disable pointer acceleration`
- `disable fast startup`
- `disable windows error reporting`
- `disable remote assistance`
- `show file extensions`
- `disable autoplay`
- `disable transparency effects`
- `disable clipboard history`
- `disable activity feed`
- `disable advertising id`
- `disable cloud content`
- `disable background apps`
- `disable gamebarpresencewriter`
- `disable fault tolerant heap`
- `disable widgets`

---

## 2. registry-options.json

Control which options are applied via the JSON config:

```powershell
# View current options
Get-Content "bin\registry-options.json" | ConvertFrom-Json

# Example structure:
# {
#   "options": [
#     "disable telemetry",
#     "disable pointer acceleration",
#     "show file extensions"
#   ]
# }
```

---

## 3. Key Gaming Registry Tweaks

### Disable Mouse Pointer Acceleration
```reg
[HKEY_CURRENT_USER\Control Panel\Mouse]
"MouseSpeed"="0"
"MouseThreshold1"="0"
"MouseThreshold2"="0"
```

### Disable GameBarPresenceWriter
```reg
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter]
"ActivationType"=dword:00000000
```

### Disable Fault Tolerant Heap (FTH)
```reg
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\FTH]
"Enabled"=dword:00000000
```

### Disable Fast Startup
```reg
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Power]
"HiberbootEnabled"=dword:00000000
```

---

## 4. Backup & Rollback

### Export Current Registry State (before applying changes)
```powershell
# Export specific hive sections
reg export "HKLM\SYSTEM\CurrentControlSet\Control" "backup_control.reg" /y
reg export "HKCU\SOFTWARE\Microsoft\Windows" "backup_hkcu_windows.reg" /y
reg export "HKLM\SOFTWARE\Policies" "backup_policies.reg" /y

# Create a system restore point first
Checkpoint-Computer -Description "Before PC-Tuning Tweaks" -RestorePointType MODIFY_SETTINGS
```

### Restore from Backup
```powershell
# Import backup
reg import "backup_control.reg"
# Or use the System Restore point via:
# Control Panel → System → System Protection → System Restore
```

---

## 5. Audit Applied Tweaks

```powershell
# Check if a key exists and its value
function Get-RegValue {
    param($Path, $Name)
    try {
        return (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name
    } catch { return $null }
}

# Example audit
Write-Host "Telemetry: $(Get-RegValue 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry')"
Write-Host "Pointer Accel: $(Get-RegValue 'HKCU:\Control Panel\Mouse' 'MouseSpeed')"
Write-Host "FTH: $(Get-RegValue 'HKLM:\SOFTWARE\Microsoft\FTH' 'Enabled')"
Write-Host "DiagTrack: $((Get-Service DiagTrack).StartType)"
```

---

## 6. Safe Registry Modification Rules

1. **Always create a System Restore Point** before bulk changes
2. **Export affected hive branches** before modification
3. **Test on non-primary system** before deploying to main rig
4. **Document each change** with the rationale
5. **Reboot before benchmarking** — many registry changes require a restart
6. **Never delete HKLM\SYSTEM\CurrentControlSet\Services** entries without research

---

## References
- `bin/apply-registry.ps1` — project's registry application engine
- `bin/registry-options.json` — option flags
- `docs/registry-opts.md` — full option documentation
