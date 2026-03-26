# startup-optimizer

**Purpose**: Reduce boot time and minimize startup processes that consume resources before gaming.

**Skills Used**: `bloatware-removal`, `storage-optimization`

---

## Trigger
User says: "PC boots slowly", "too many startup programs", "reduce startup time".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/bloatware-removal/SKILL.md
view_file: .agents/skills/storage-optimization/SKILL.md
```

### Step 2: Measure Current Boot Time
```powershell
# View last boot time
(Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime

# View Windows boot analysis (generates HTML report)
powercfg /energy
powercfg /sleepstudy

# Use Event Viewer → System → EventID 100 for boot duration
Get-WinEvent -LogName "Microsoft-Windows-Diagnostics-Performance/Operational" |
    Where-Object { $_.Id -eq 100 } | Select -First 5 | ForEach-Object { $_.Message }
```

### Step 3: List Startup Programs
```powershell
# All startup locations
$startupPaths = @(
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run"
)

foreach ($path in $startupPaths) {
    Write-Host "--- $path ---"
    Get-ItemProperty $path -ErrorAction SilentlyContinue | Format-List
}

# Also check Task Manager startup tab programmatically
Get-CimInstance Win32_StartupCommand | Select Name, Command, User | Format-Table -AutoSize
```

### Step 4: Remove Non-Essential Startup Entries
```powershell
# Common removable entries:
$toRemove = @("OneDrive", "RtkNGUI64", "RAVCpl64", "NvBackend", "IAStorIcon",
               "CCleaner", "Steam", "Discord", "Epic Games Launcher")

foreach ($item in $toRemove) {
    @("HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
      "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run") | ForEach-Object {
        Remove-ItemProperty $_ -Name $item -ErrorAction SilentlyContinue
    }
}
```

### Step 5: Disable Scheduled Tasks That Run at Boot
```powershell
# View boot-trigger tasks
Get-ScheduledTask | Where-Object { $_.Triggers -like "*AtStartup*" -or $_.Triggers -like "*AtLogOn*" } |
    Select TaskName, TaskPath, State | Format-Table -AutoSize

# Disable specific vendor tasks:
Disable-ScheduledTask -TaskName "NvDriverUpdateCheckDaily" -ErrorAction SilentlyContinue
Disable-ScheduledTask -TaskName "MicrosoftEdgeUpdateTaskMachineCore" -ErrorAction SilentlyContinue
```

### Step 6: Enable Fast Boot (If Not Already)
```powershell
# Enable Fast Startup
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" `
    -Name "HiberbootEnabled" -Value 1 -Type DWord
```

### Step 7: Measure Again
```powershell
# Reboot and check boot time in Event Viewer after
# Events → Applications and Services → Microsoft → Windows → Diagnostics-Performance → Operational
# EventID 100: Boot Performance Monitoring
```
