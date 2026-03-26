---
name: power-management
description: Windows power plan configuration, C-state disabling, idle inhibition, USB selective suspend, and Bitsum Highest Performance plan for zero-compromise gaming power delivery.
---

# Power Management Skill

## Overview
This skill configures the Windows power subsystem for maximum sustained CPU/GPU performance. Improper power settings are one of the most common causes of intermittent frame drops.

---

## 1. Apply High Performance / Ultimate Power Plan

### Built-in Plans
```powershell
# List all power plans
powercfg /list

# Apply High Performance
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

# Unlock and apply Ultimate Performance (hidden by default)
powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
```

### Bitsum Highest Performance Plan (community recommended)
Download from [Bitsum](https://bitsum.com/powerplan.php) and import:
```powershell
powercfg /import "BitSumHighestPerformance.pow"
powercfg /setactive <imported-guid>
```

---

## 2. Disable USB Selective Suspend

```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]
powercfg /setacvalueindex $powerScheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
powercfg /setdcvalueindex $powerScheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
powercfg /setactive $powerScheme
```

---

## 3. Disable PCI Express Link State Power Management

This prevents PCIe devices (GPU, NVMe) from entering low-power states mid-game:
```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]
# GUID for PCI Express → Link State Power Management
powercfg /setacvalueindex $powerScheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0
powercfg /setactive $powerScheme
```

---

## 4. Disable Adaptive Display / Display Sleep

```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]
# Display turn off: set to 0 (never)
powercfg /setacvalueindex $powerScheme SUB_VIDEO VIDEOIDLE 0
# Sleep: set to 0 (never)
powercfg /setacvalueindex $powerScheme SUB_SLEEP STANDBYIDLE 0
powercfg /setacvalueindex $powerScheme SUB_SLEEP HIBERNATEIDLE 0
powercfg /setactive $powerScheme
```

---

## 5. Processor Power Settings

```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]

# Min processor state: 100% (never throttle down)
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR PROCTHROTTLEMIN 100
# Max processor state: 100%
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR PROCTHROTTLEMAX 100
# Boost mode: Aggressive (2)
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR PERFBOOSTMODE 2
# Core parking: disable
powercfg /setacvalueindex $powerScheme SUB_PROCESSOR CPMINCORES 100

powercfg /setactive $powerScheme
```

---

## 6. Verify Power State
```powershell
# View current active plan
powercfg /getactivescheme

# View power report (saves to C:\Windows\system32\powereport.html)
powercfg /energy

# View sleep diagnostics
powercfg /sleepstudy
```

---

## References
- [Bitsum Highest Performance Power Plan](https://bitsum.com/powerplan.php)
- [MSDN: Power Scheme GUIDs](https://docs.microsoft.com/en-us/windows/win32/power/power-policy-settings)
