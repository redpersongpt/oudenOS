---
name: audio-latency
description: Low-latency audio configuration using WASAPI exclusive mode, ASIO drivers, DPC audio interrupt reduction, and selecting optimal audio hardware for gaming.
---

# Audio Latency Skill

## Overview
High audio driver DPC latency is one of the top causes of system-wide latency spikes in Windows gaming. This skill covers audio stack optimization, WASAPI exclusive mode, ASIO, and driver selection.

---

## 1. Identify Audio-Induced DPC Latency

Run xperf DPC/ISR trace (see latency-reduction skill) and look for:
- `HDAudBus.sys`
- `portcls.sys`
- `ks.sys`
- Third-party audio drivers (Realtek, Creative, etc.)

These appearing in the top DPC/ISR list indicate audio is a latency contributor.

---

## 2. WASAPI Exclusive Mode

Windows Audio Session API (WASAPI) in exclusive mode bypasses the Windows audio mixer, giving the application direct hardware access.

### Enable in Applications
- Most DAWs and some games support WASAPI exclusive mode
- In **Spotify/media players**: no exclusive mode support
- In **Games**: use WASAPI exclusive if option is available in audio settings

### Disable Audio Enhancements (reduces latency overhead)
```powershell
# Disable audio enhancements for all playback devices
$devices = Get-AudioDevice -Playback  # Requires AudioDeviceCmdlets module
# Or via GUI: Sound → Playback device → Properties → Enhancements → Disable all
```

Registry approach:
```powershell
# Disable spatial audio and enhancements
$audioCorePath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render"
Get-ChildItem $audioCorePath -Recurse -ErrorAction SilentlyContinue |
    ForEach-Object {
        $path = Join-Path $_.PSPath "Properties"
        if (Test-Path $path) {
            Set-ItemProperty $path -Name "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5" `
                -Value 0 -Type DWord -ErrorAction SilentlyContinue
        }
    }
```

---

## 3. ASIO Drivers

ASIO (Audio Stream Input/Output) completely bypasses the Windows audio stack.

### ASIO4ALL (free, universal)
- Install [ASIO4ALL](https://www.asio4all.com/)
- Configure in ASIO4ALL control panel: select your audio device, set buffer size (32–64 samples = lowest latency)
- Use with REAPER, FL Studio, VoiceMeeter

### Native ASIO (preferred)
- Use your audio interface's native ASIO driver (SSL, Focusrite, PreSonus, etc.)
- Always prefer native ASIO over ASIO4ALL for lower latency

---

## 4. VoiceMeeter Potato (Virtual Mixer)

If routing audio from multiple sources while keeping low latency:
```
VoiceMeeter → ASIO → Audio Interface
Game audio → Input 1 → ASIO output
Discord    → Input 2 → ASIO output
```

Set VoiceMeeter's preferred main driver to ASIO and buffer size to minimum (128 samples).

---

## 5. Disable Unused Audio Devices

Fewer audio devices = fewer interrupt vectors = less scheduling overhead:
```powershell
# List audio devices
Get-PnpDevice | Where-Object { $_.Class -eq "AudioEndpoint" } | Select FriendlyName, Status

# Disable via Device Manager (use GUI or DevManView)
# Right-click device → Disable
```

---

## 6. Audio Service Settings

```powershell
# Ensure Windows Audio service runs at high priority
$audioSvc = Get-Process "audiodg" -ErrorAction SilentlyContinue
if ($audioSvc) {
    $audioSvc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High
}

# Set audio device buffer period
# Lower buffer = lower latency but higher CPU jitter risk
# WASAPI shared mode minimum buffer: 3ms (default), 1ms (with MMCSS boost)
```

---

## 7. Realtek Driver Optimization

```powershell
# Install the Realtek HD Audio driver WITHOUT the additional software
# Use DDU to remove current driver, then install only the core driver package:
# Reload using Device Manager → Update Driver → Browse for driver

# Disable Realtek Sound Manager from startup
$startupPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty $startupPath -Name "RtkNGUI64" -ErrorAction SilentlyContinue
Remove-ItemProperty $startupPath -Name "RAVCpl64" -ErrorAction SilentlyContinue
```

---

## 8. Verification

```powershell
# Check current audio device state
Get-PnpDevice | Where-Object { $_.Class -eq "Media" } | Select FriendlyName, Status

# XPerf trace for audio DPC latency (see latency-reduction skill)
# Look for portcls.sys / HDAudBus.sys duration in WPA
```

---

## References
- [ASIO4ALL](https://www.asio4all.com/)
- [REAPER: WASAPI vs ASIO](https://www.reaper.fm/sdk/reaper_sdk.pdf)
- [LatencyMon: Audio DPC analysis](https://www.resplendence.com/latencymon)
