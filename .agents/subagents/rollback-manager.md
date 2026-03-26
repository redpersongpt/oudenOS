# rollback-manager

**Purpose**: Safely restore previous registry keys, power plan, and system configuration state.

**Skills Used**: `registry-tweaks`

---

## Trigger
User says: "rollback changes", "undo tweaks", "restore registry", "system restore", "PC broke after changes".

---

## Workflow

### Step 1: Read Skill
```
view_file: .agents/skills/registry-tweaks/SKILL.md
```

### Step 2: Determine What Changed
Ask user:
- What specific changes did you make (registry, services, power plan, BCD)?
- When did the issue start?
- Do you have a backup `.reg` file or System Restore point?

### Step 3: System Restore (Safest Option)
```
1. Press Win+R → type: "rstrui.exe"
2. Select "Choose a different restore point"
3. Pick the date before changes were made
4. Confirm and restore
```

Or via PowerShell:
```powershell
# List available restore points
Get-ComputerRestorePoint | Select Description, CreationTime | Format-Table

# Restore to specific point (requires reboot)
$points = Get-ComputerRestorePoint
$target = $points | Where-Object { $_.Description -like "*Before*" } | Select -First 1
if ($target) {
    Restore-Computer -RestorePoint $target.SequenceNumber -Confirm:$false
}
```

### Step 4: Import Registry Backup
```powershell
# If a backup .reg file exists:
reg import "backup_control.reg"
reg import "backup_policies.reg"
reg import "backup_hkcu_windows.reg"
```

### Step 5: Re-enable Disabled Services
```powershell
# Re-enable services that were disabled:
$reEnableServices = @("DiagTrack", "SysMain", "WSearch", "XblAuthManager", "WerSvc")
foreach ($svc in $reEnableServices) {
    Set-Service $svc -StartupType Manual -ErrorAction SilentlyContinue
    Write-Host "Re-enabled: $svc"
}
```

### Step 6: Restore Power Plan Defaults
```powershell
# Reset to Balanced (Windows default)
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e

# Or restore BCD defaults
bcdedit /deletevalue disabledynamictick
bcdedit /deletevalue useplatformclock
bcdedit /deletevalue tscsyncpolicy
```

### Step 7: Restore Win32PrioritySeparation Default
```powershell
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" `
    -Name "Win32PrioritySeparation" -Value 2 -Type DWord
```

### Step 8: Reboot and Verify
```powershell
# After reboot, verify everything is back to baseline
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl").Win32PrioritySeparation  # Should be 2
powercfg /getactivescheme  # Should be Balanced
Get-Service DiagTrack | Select StartType  # Should be Automatic (delayed start)
```

---

## Prevention Tips
1. Always create a System Restore point before applying tweaks
2. Export affected registry hives before modifying
3. Document changes in MEMORY.md as you go
4. Test one category of changes at a time
