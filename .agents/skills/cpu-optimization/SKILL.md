---
name: cpu-optimization
description: Expert CPU scheduling, affinity, P/C-state management, boost clocks, and priority separation tuning for Windows gaming and low-latency workloads.
---

# CPU Optimization Skill

## Overview
This skill covers every layer of CPU tuning on Windows — from kernel scheduling parameters down to hardware C-state and boost behavior. Use this when a user wants to minimize CPU latency, reduce jitter, or squeeze out extra gaming performance.

---

## 1. Win32PrioritySeparation

The `Win32PrioritySeparation` registry key at:
```
HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl
```
controls the foreground quantum boost and scheduler behavior.

### Recommended Gaming Value
```
"Win32PrioritySeparation"=dword:00000026
```
- **0x26 (38 decimal)** = Short, Variable, 2:1 foreground boost
- This gives foreground threads (your game) short but frequent quanta with a 2:1 boost over background tasks.

### All Valid Values
| Hex | Dec | Interval | Length   | PsPrioSep |
|-----|-----|----------|----------|-----------|
| 0x14| 20  | Long     | Variable | 0         |
| 0x15| 21  | Long     | Variable | 1         |
| 0x16| 22  | Long     | Variable | 2         |
| 0x18| 24  | Long     | Fixed    | 0         |
| 0x26| 38  | Short    | Variable | 2         |
| 0x28| 40  | Short    | Fixed    | 0         |
| 0x29| 41  | Short    | Fixed    | 1         |
| 0x2A| 42  | Short    | Fixed    | 2         |

### Apply via PowerShell
```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" `
    -Name "Win32PrioritySeparation" -Value 0x26 -Type DWord
```

---

## 2. CPU Core Affinity for Games

Setting CPU affinity pins a process to specific cores, reducing context switches across NUMA nodes and preventing interference from system tasks.

### Find Game PID and Set Affinity
```powershell
# Get the PID of your game
$game = Get-Process -Name "YourGame" -ErrorAction SilentlyContinue
if ($game) {
    # Pin to cores 0-7 (first 8 cores) — affinity mask: 0xFF
    $game.ProcessorAffinity = [IntPtr]0xFF
    Write-Host "Affinity set for PID $($game.Id)"
}
```

### Recommendations
- Use **physical cores only** — avoid hyperthreaded siblings for latency-sensitive threads (if HT is enabled, core 0 = CPU 0+1, core 1 = CPU 2+3, etc.)
- Reserve CPU 0 exclusively for OS/DPCs to reduce jitter on game threads
- For 8+ core CPUs: use cores 2–7 for the game, core 0 for DPC/IRQ, core 1 for render

---

## 3. Disable CPU Parking

CPU parking allows the OS to power down cores during low load. This causes latency spikes when parked cores need to wake.

### Disable via Registry
```powershell
# Set minimum processor state and park settings
$powerScheme = (powercfg /getactivescheme).Split()[3]

# Disable core parking (set minimum cores to 100%)
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR CPMINCORES 100
powercfg /setdcvalueindex $powerScheme SUB_PROCESSOR CPMINCORES 100
powercfg /setactive $powerScheme
```

### Via Registry (direct)
```
HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\
54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583
```
Set `ValueMax` = `0` to disable parking.

---

## 4. C-State Management

CPU C-states are sleep states that save power but introduce latency when the CPU wakes up.

### Disable via BCD (requires admin)
```powershell
# Disable idle states globally
bcdedit /set disabledynamictick yes
bcdedit /set useplatformtick yes
```

### Disable via Power Plan
```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]
# Set max processor state to prevent deep C-states
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR PROCTHROTTLEMAX 100
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR PROCTHROTTLEMIN 100
```

> **Note**: Disabling C-states increases idle power consumption significantly. Only recommended for dedicated gaming rigs.

---

## 5. Processor Performance Boost Mode

Turbo Boost / Precision Boost behavior is controlled via power plans.

### Aggressive Boost for Performance
```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]
# 0 = Disabled, 1 = Enabled, 2 = Aggressive, 3 = Efficient Aggressive, 4 = Efficient Enabled
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR PERFBOOSTMODE 2
powercfg /setactive $powerScheme
```

---

## 6. CSRSS Priority Boost

The Client/Server Runtime Subsystem (CSRSS) handles window messages. Boosting it can reduce input lag.

```powershell
# Set CSRSS to real-time priority class (requires TrustedInstaller or admin)
$csrss = Get-Process csrss | Where-Object { $_.SessionId -eq (Get-Process -Name explorer).SessionId }
# Priority class 256 = RealTime (use with caution)
# Standard boost: High
$csrss | ForEach-Object { $_.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High }
```

---

## 7. Verification

After applying changes, verify CPU latency using:
```powershell
# Check current Win32PrioritySeparation
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl").Win32PrioritySeparation

# View current power scheme and core parking
powercfg /query SCHEME_CURRENT SUB_PROCESSOR CPMINCORES
```

Use **[LatencyMon](https://www.resplendence.com/latencymon)** or **xperf/WPA** to measure DPC latency before and after.

---

## Key References
- Windows Internals (Russinovich) — Scheduling chapter
- [djdallmann/GamingPCSetup](https://github.com/djdallmann/GamingPCSetup) — Win32PrioritySeparation CSV
- MSDN: [SetPriorityClass](https://docs.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setpriorityclass)
