---
name: timer-resolution
description: Windows timer resolution management including GlobalTimerResolutionRequests, micro-adjustment for minimum Sleep() delta, SetTimerResolution tooling, and per-process timer isolation.
---

# Timer Resolution Skill

## Overview
Timer resolution directly controls the precision of `Sleep()`, `WaitForSingleObject()`, and scheduler quantum boundaries. Higher resolution (lower ms value) = more precise scheduling = less latency jitter in games.

---

## 1. Understanding Timer Resolution

| Resolution | Effect |
|------------|--------|
| 15.625 ms  | Windows default (156250 × 100ns) |
| 1.000 ms   | Commonly requested by media players |
| 0.500 ms   | Maximum achievable on most hardware |
| 0.507 ms   | Often gives *lower actual* Sleep delta than 0.500ms |

The **actual Sleep(1) delta** is what matters — not just the requested resolution.

---

## 2. GlobalTimerResolutionRequests (Win11 / Server 2022+)

Starting from Windows 10 2004, timer resolution is per-process only. This registry key restores the legacy global behavior:

```powershell
# Apply (requires reboot)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" `
    -Name "GlobalTimerResolutionRequests" -Value 1 -Type DWord

# Force the resolution request to be honored even when minimized
# (Requires SetProcessInformation with PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION)
# Use SetTimerResolution.exe which handles this automatically
```

---

## 3. SetTimerResolution Tool

From [valleyofdoom/TimerResolution](https://github.com/valleyofdoom/TimerResolution):

```powershell
# Request 0.5ms resolution globally
.\SetTimerResolution.exe --resolution 5000 --no-console

# Run as a background service
$action = New-ScheduledTaskAction -Execute "C:\Tools\SetTimerResolution.exe" `
    -Argument "--resolution 5000 --no-console"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -Priority 0
Register-ScheduledTask -TaskName "TimerResolution" -Action $action `
    -Trigger $trigger -Settings $settings -RunLevel Highest -Force
```

---

## 4. Micro-Adjustment Benchmark

The `micro-adjust-benchmark.ps1` script finds the resolution that gives the lowest actual Sleep(1) delta on your specific hardware:

```powershell
# Script iterates resolutions from 0.500ms to 0.600ms
# Measures 100 iterations of Sleep(1) per candidate resolution
# Reports the resolution with the lowest mean delta and STDEV

.\micro-adjust-benchmark.ps1
# Example output:
# Resolution 0.507ms: Mean delta = 0.012ms, STDEV = 0.003ms  ← WINNER
# Resolution 0.500ms: Mean delta = 0.496ms, STDEV = 0.018ms
```

Apply the winning resolution to SetTimerResolution calls.

---

## 5. MeasureSleep Utility

```cpp
// MeasureSleep.cpp logic (from research.md):
// Calls NtQueryTimerResolution() + Sleep(1) in a loop
// Outputs actual sleep duration vs requested

// Compile and run to verify active resolution:
// Resolution: 0.499200ms, Sleep(1) slept 1.496064ms (delta: 0.496064)  ← BAD
// Resolution: 0.506800ms, Sleep(1) slept 1.012480ms (delta: 0.012480)  ← GOOD
```

---

## 6. ClockRes (Sysinternals)

```powershell
# Check current timer resolution without custom tools
.\ClockRes.exe
# Output:
# Maximum timer interval: 15.625 ms
# Minimum timer interval: 0.500 ms
# Current timer interval: 0.500 ms
```

---

## 7. Per-Process Timer Isolation

On Windows 11, if a process becomes minimized or invisible, its timer resolution request is demoted. Override:

```cpp
// C++ code (compile into your resolution keeper app)
PROCESS_POWER_THROTTLING_STATE PowerThrottling = {};
PowerThrottling.Version = PROCESS_POWER_THROTTLING_CURRENT_VERSION;
PowerThrottling.ControlMask = PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION;
PowerThrottling.StateMask = 0;
SetProcessInformation(GetCurrentProcess(), ProcessPowerThrottling,
    &PowerThrottling, sizeof(PowerThrottling));
```

---

## References
- [valleyofdoom/TimerResolution](https://github.com/valleyofdoom/TimerResolution)
- [RandomASCII: Great Rule Change](https://randomascii.wordpress.com/2020/10/04/windows-timer-resolution-the-great-rule-change/)
- [Sysinternals ClockRes](https://docs.microsoft.com/en-us/sysinternals/downloads/clockres)
