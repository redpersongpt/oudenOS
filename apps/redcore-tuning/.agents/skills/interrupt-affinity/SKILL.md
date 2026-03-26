---
name: interrupt-affinity
description: MSI mode configuration, IRQ affinity assignment, xperf DPC/ISR tracing, and device interrupt isolation for minimal kernel interrupt latency in gaming workloads.
---

# Interrupt Affinity Skill

## Overview
This skill covers pinning hardware interrupts to specific CPU cores, enabling MSI (Message Signaled Interrupts) mode for PCIe devices, and using xperf to identify interrupt latency culprits.

---

## 1. Message Signaled Interrupts (MSI)

MSI replaces legacy pin-based interrupts with in-band PCIe messages, reducing interrupt latency and allowing multi-vector delivery.

### Check Device MSI Support
```powershell
# Look for MSISupported in device registry
$devices = Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Enum\PCI" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*Interrupt Management*" }
$devices | Get-ItemProperty | Select PSPath, MSISupported
```

### Enable MSI for GPU
```powershell
# Find GPU instance path in Device Manager, then:
$gpuPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\PCI\VEN_10DE&DEV_xxxx\<instance>\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
New-Item -Path $gpuPath -Force | Out-Null
Set-ItemProperty $gpuPath -Name "MSISupported" -Value 1 -Type DWord
```

### Enable MSI for NIC
```powershell
$nicPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\PCI\VEN_8086&DEV_xxxx\<instance>\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
New-Item -Path $nicPath -Force | Out-Null
Set-ItemProperty $nicPath -Name "MSISupported" -Value 1 -Type DWord
```

> Tool: Use **MSI Mode Utility v3** (GitHub: spddl) to enable MSI for all devices with a GUI.

---

## 2. IRQ Affinity Assignment

### Using Interrupt Affinity Policy Tool (intpolicy)
```powershell
# Microsoft Interrupt Affinity Policy Tool (from Windows Server Kit)
# Sets which CPU core handles a given device's IRQ

# Assign GPU interrupts to CPU 3 (affinity mask: 0x8)
.\IntPolicy_x64.exe /set "<GPU Device Name>" /proc 3

# Assign NIC interrupts to CPU 2
.\IntPolicy_x64.exe /set "<NIC Name>" /proc 2
```

### Via Registry (directly)
```
HKLM\SYSTEM\CurrentControlSet\Enum\PCI\<device>\Device Parameters\Interrupt Management\Affinity Policy
"DevicePolicy"=dword:00000004    ; IrqPolicySpecifiedProcessors
"AssignmentSetOverride"=hex:08,00,00,00  ; CPU 3 (bitmask, little-endian)
```

---

## 3. XHCI Interrupt Modulation (USB Controller)

The `bin/XHCI-IMOD-Interval.ps1` script tunes the USB host controller's interrupt modulation interval to reduce USB input device latency:

```powershell
# From bin/ directory
.\XHCI-IMOD-Interval.ps1

# Lower IMOD = more frequent interrupts = lower latency for mouse/keyboard
# Default IMOD = 4000 (250μs between interrupts)
# Optimal gaming: 0 (no modulation)
```

---

## 4. xperf DPC/ISR Tracing

Use `bin/xperf-dpcisr.bat` to capture interrupt/DPC behavior:

```batch
cd bin
xperf-dpcisr.bat
```

### Analyzing in WPA (Windows Performance Analyzer)
1. Open the generated `.etl` file in WPA
2. Navigate to: **Computation** → **DPC/ISR**
3. Sort by **Exclusive Duration (μs)**
4. Top offenders are your latency sources

### Common High-Latency Culprits
| Driver | Cause | Fix |
|--------|-------|-----|
| `tcpip.sys` | Network processing | Tune RSS, offloading |
| `ndis.sys` | NIC driver | Update NIC driver |
| `ataport.sys` | Storage I/O | Switch to NVMe, update driver |
| `HDAudBus.sys` | Audio | Use ASIO driver or disable audio device |
| `MpKsl*.sys` | Windows Defender | Disable Defender |

---

## 5. Ideal CPU Affinity Strategy (8-core Example)

```
CPU 0-1: OS, DPCs, IRQs (do NOT use for game)
CPU 2:   NIC interrupts (RSS base)
CPU 3:   GPU interrupts
CPU 4-7: Game process threads
```

Set the game's affinity:
```powershell
$game = Get-Process "YourGame"
# Use CPUs 4-7: mask = 0xF0 (11110000 binary)
$game.ProcessorAffinity = [IntPtr]0xF0
```

---

## 6. Verify MSI Mode is Active
```powershell
# After reboot, verify in Device Manager → View → Resources by type → IRQ
# MSI interrupts appear as non-shareable entries at high IRQ numbers (e.g., 0x81, 0x92)
# Legacy interrupts share low IRQ numbers (3, 5, 7, etc.)
```

---

## References
- [MSI Mode Utility (spddl)](https://github.com/spddl/MSI-Util)
- [Microsoft Interrupt Affinity Tool](https://www.microsoft.com/en-us/download/details.aspx?id=9966)
- [djdallmann/GamingPCSetup — IRQ](https://github.com/djdallmann/GamingPCSetup)
