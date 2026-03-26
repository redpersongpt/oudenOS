---
name: process-priority
description: Game process priority elevation, CSRSS boosting, real-time priority class tuning, and per-thread priority management to maximize game thread scheduling responsiveness.
---

# Process Priority Skill

## Overview
This skill covers Windows thread/process scheduling priority, foreground boost mechanics, and how to ensure your game threads always preempt background interference.

---

## 1. Windows Priority Classes

| Priority Class | Value | Use Case |
|---------------|-------|----------|
| Idle | 64 | Background tasks |
| Below Normal | 16384 | Low-importance services |
| Normal | 32 | Default |
| Above Normal | 32768 | Slightly elevated |
| High | 128 | Recommended for games |
| Realtime | 256 | ⚠️ Can starve OS threads |

### Set Game to High Priority
```powershell
# Permanent via registry (Image File Execution Options)
$gameExe = "YourGame.exe"
$regPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\$gameExe\PerfOptions"
New-Item $regPath -Force | Out-Null
Set-ItemProperty $regPath -Name "CpuPriorityClass" -Value 3 -Type DWord  # 3 = High
```

### Set Live via PowerShell
```powershell
$game = Get-Process "YourGame" -ErrorAction SilentlyContinue
if ($game) {
    $game.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High
    Write-Host "Priority set to High for PID $($game.Id)"
}
```

---

## 2. GPU Priority (DXGI / DirectX)

```powershell
# Set GPU priority for the game process via DXGI registry
$gpuPrioPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
New-Item $gpuPrioPath -Force | Out-Null
Set-ItemProperty $gpuPrioPath -Name "GPU Priority" -Value 8 -Type DWord  # 0-8
Set-ItemProperty $gpuPrioPath -Name "Priority" -Value 6 -Type DWord      # CPU sched priority
Set-ItemProperty $gpuPrioPath -Name "Scheduling Category" -Value "High" -Type String
Set-ItemProperty $gpuPrioPath -Name "SFIO Priority" -Value "High" -Type String
```

---

## 3. Multimedia Class Scheduler Service (MMCSS)

MMCSS boosts thread scheduling for multimedia/game tasks.

```powershell
# Ensure MMCSS is running
Start-Service MMCSS
Set-Service MMCSS -StartupType Automatic

# Configure Pro Audio task profile
$mmcssPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Pro Audio"
New-Item $mmcssPath -Force | Out-Null
Set-ItemProperty $mmcssPath -Name "Affinity" -Value 0 -Type DWord
Set-ItemProperty $mmcssPath -Name "Background Only" -Value "False" -Type String
Set-ItemProperty $mmcssPath -Name "Clock Rate" -Value 10000 -Type DWord
Set-ItemProperty $mmcssPath -Name "GPU Priority" -Value 8 -Type DWord
Set-ItemProperty $mmcssPath -Name "Priority" -Value 6 -Type DWord
Set-ItemProperty $mmcssPath -Name "Scheduling Category" -Value "High" -Type String
Set-ItemProperty $mmcssPath -Name "SFIO Priority" -Value "High" -Type String
```

---

## 4. CSRSS Boost

```powershell
# Boost CSRSS for the current user session (reduces input latency from window messages)
$sessionId = (Get-Process -Name explorer).SessionId
$csrss = Get-Process csrss | Where-Object { $_.SessionId -eq $sessionId }
foreach ($p in $csrss) {
    try { $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High } catch {}
}
```

---

## 5. Win32PrioritySeparation Deep Dive

```powershell
# Current value
$val = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl").Win32PrioritySeparation
Write-Host "Win32PrioritySeparation: $val (0x$($val.ToString('X')))"

# Recommended for gaming: 0x26 (38) = Short, Variable, 2:1
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" `
    -Name "Win32PrioritySeparation" -Value 0x26 -Type DWord
```

---

## 6. Disable Low Priority I/O for Game Processes

```powershell
# Ensure game has normal I/O priority (not Background)
$game = Get-Process "YourGame"
# I/O priority can only be changed via NtSetInformationProcess (not exposed in .NET directly)
# Use Process Hacker or Process Lasso for runtime adjustment
```

---

## 7. Verification

```powershell
# View all running process priorities
Get-Process | Sort-Object CPU -Descending | Select Name, Id, PriorityClass, CPU |
    Format-Table -AutoSize

# Verify MMCSS task settings
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
```

---

## References
- [MSDN: SetPriorityClass](https://docs.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setpriorityclass)
- [MSDN: MMCSS](https://docs.microsoft.com/en-us/windows/win32/procthread/multimedia-class-scheduler-service)
- [djdallmann — Win32PrioritySeparation CSV](https://raw.githubusercontent.com/djdallmann/GamingPCSetup/master/CONTENT/RESEARCH/FINDINGS/win32prisep0to271.csv)
