---
name: latency-reduction
description: System-wide DPC latency reduction through HPET disabling, dynamic ticks, platform clock configuration, and kernel timer resolution tuning for sub-millisecond responsiveness.
---

# Latency Reduction Skill

## Overview
This skill targets system-wide latency from kernel timers, interrupt handling, and platform clock sources. Measured with LatencyMon and xperf, these changes can reduce peak DPC latency from hundreds of microseconds to under 100μs.

---

## 1. HPET (High Precision Event Timer)

HPET is a hardware timer that can introduce latency on some platforms. Testing is required.

### Disable HPET
```powershell
# Disable HPET in BCD (takes effect after reboot)
bcdedit /deletevalue useplatformclock

# Force disable (some systems need this)
bcdedit /set useplatformclock false
```

### Enable HPET (use if disabling causes instability)
```powershell
bcdedit /set useplatformclock true
```

> **Always benchmark** LatencyMon before and after. On some CPUs (Ryzen 5000+), HPET disabled + TSC gives lower latency. On others, HPET is needed.

---

## 2. Dynamic Ticks

Dynamic tick mode allows Windows to coalesce timer interrupts, saving power but sometimes introducing latency.

### Disable Dynamic Ticks
```powershell
bcdedit /set disabledynamictick yes
```

### Re-enable (default)
```powershell
bcdedit /deletevalue disabledynamictick
```

---

## 3. Timer Resolution (GlobalTimerResolutionRequests)

On Windows 11+ and Server 2022+, restore the old global timer resolution behavior:

```powershell
# Enable global timer resolution requests (restores pre-2004 behavior)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" `
    -Name "GlobalTimerResolutionRequests" -Value 1 -Type DWord
```

Then use a tool like [SetTimerResolution](https://github.com/valleyofdoom/TimerResolution) to request 0.5ms:
```powershell
# Run SetTimerResolution.exe to request maximum resolution
Start-Process "SetTimerResolution.exe" -ArgumentList "--resolution 5000 --no-console"
```

### Find Your System's Optimal Resolution (micro-adjust)
```powershell
# Use micro-adjust-benchmark.ps1 to find the sweet spot
# (typically 0.507ms gives lower Sleep() delta than 0.500ms on many systems)
.\micro-adjust-benchmark.ps1
```

---

## 4. TSC Sync Policy

```powershell
# Check current policy (default is 0 = Windows default, not enhanced)
bcdedit /enum | findstr tscsyncpolicy

# Set enhanced (2) - use only if instability occurs with default
bcdedit /set tscsyncpolicy enhanced

# Restore default (recommended for most)
bcdedit /deletevalue tscsyncpolicy
```

---

## 5. Interrupt Affinity & MSI Mode

Move device interrupts off CPU 0:

```powershell
# Use Microsoft Interrupt Affinity Policy Tool (IntPolicy_x64.exe)
# Or registry-based MSI mode:
$devicePath = "HKLM:\SYSTEM\CurrentControlSet\Enum\PCI\<device>\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
New-Item -Path $devicePath -Force | Out-Null
Set-ItemProperty $devicePath -Name "MSISupported" -Value 1 -Type DWord
```

---

## 6. xperf DPC/ISR Analysis

Use the included `bin/xperf-dpcisr.bat` to capture a trace:
```batch
:: From bin/ folder
xperf-dpcisr.bat
:: Open the generated .etl file in WPA (Windows Performance Analyzer)
```

In WPA, look for:
- **DPC** column showing which driver dominates
- **ISR** column for interrupt service routine offenders
- Sort by **Exclusive Duration (μs)** to find worst offenders

Common culprits: `tcpip.sys`, `NDIS.sys`, `storport.sys`, audio drivers, and third-party AV.

---

## Verification

```powershell
# Check current timer resolution
# Use NtQueryTimerResolution via MeasureSleep.exe or ClockRes.exe (Sysinternals)
.\ClockRes.exe

# Verify BCD settings
bcdedit /enum {current}
```

Use **LatencyMon** for a user-friendly overview of DPC latency.

---

## References
- [LatencyMon](https://www.resplendence.com/latencymon)
- [valleyofdoom/TimerResolution](https://github.com/valleyofdoom/TimerResolution)
- [RandomASCII: The Great Rule Change](https://randomascii.wordpress.com/2020/10/04/windows-timer-resolution-the-great-rule-change/)
