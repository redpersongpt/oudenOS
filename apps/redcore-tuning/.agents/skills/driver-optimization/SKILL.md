---
name: driver-optimization
description: GPU/NIC/chipset driver selection strategy, DDU clean installation workflow, INF file tweaks, and removing bloated vendor software for minimum driver overhead.
---

# Driver Optimization Skill

## Overview
Drivers are the lowest layer of software optimization. Bad or bloated drivers are second only to thermal throttling as a cause of poor gaming performance. This skill covers driver selection, clean installation, and advanced INF tweaks.

---

## 1. GPU Driver Selection Strategy

### NVIDIA
| Type | Notes |
|------|-------|
| Game Ready Driver (GRD) | Optimized for latest game releases |
| Studio Driver | More stable, less cutting-edge |
| DCH vs Standard | Prefer Standard on gaming rigs (less MS Store dependency) |

**Best practice**: Use the **previous stable GRD**, not the newest driver. New drivers can introduce regressions. Check forums (Reddit r/nvidia) before updating.

### AMD
| Type | Notes |
|------|-------|
| WHQL | Stable, certified |
| ReLive (optional) | Recording/streaming software |

**Best practice**: Install **Minimal Install** via AMD cleanup utility — skip AMD Adrenalin if not needed.

---

## 2. DDU (Display Driver Uninstaller) Workflow

### Step-by-Step
```
1. Download DDU from https://www.wagnardsoft.com/
2. Download new driver installer (but DON'T run yet)
3. Boot into Safe Mode:
   - Settings → System → Recovery → Advanced Startup
   - Or: bcdedit /set {bootmgr} displaybootmenu yes → restart → F8
4. Run DDU.exe in Safe Mode
5. Select GPU manufacturer → "Clean and Restart"
6. After reboot (in normal mode), run driver installer
7. Custom Install → Clean Installation (NVIDIA) or Minimal (AMD)
```

---

## 3. NIC Driver Selection

```powershell
# Check current NIC driver
Get-WmiObject Win32_PnPSignedDriver | Where-Object { $_.DeviceName -like "*Ethernet*" } |
    Select DeviceName, DriverVersion, DriverDate

# Intel NIC: Use Intel's PROSet/Drivers package (not Windows Update version)
# Realtek NIC: Download from Realtek site, not manufacturer (ASUS/MSI bundle extra software)
# Killer NIC: Use standard Intel drivers — Killer software adds overhead
```

---

## 4. INF Driver Tweaks (Advanced)

Modify `.inf` files to add device-specific tuning options exposed to Device Manager.

### Example: Enable Hidden NVIDIA Registry Options
```powershell
# Some NVIDIA performance flags are only visible with modified INF
# Add to nvdmi.inf under [NVIDIA_System.NTamd64.10.0...]:
# HKR,,"MaxFrames",0x00010001,01000000
```

> **Warning**: Modified INFs void the driver's digital signature. Use `bcdedit /set testsigning on` to load unsigned drivers (disable Secure Boot first).

---

## 5. Chipset Driver Importance

```powershell
# Check chipset driver version
Get-WmiObject Win32_PnPSignedDriver | Where-Object {
    $_.DeviceName -like "*chipset*" -or $_.DeviceName -like "*platform*"
} | Select DeviceName, DriverVersion

# AMD: Use latest AMD Chipset Drivers from AMD.com (includes PSP/USB/GPIO)
# Intel: Use Intel Driver & Support Assistant
```

---

## 6. Remove Vendor Bloatware from Driver Packages

### NVIDIA — Minimal Install
During driver installation:
- Uncheck **GeForce Experience**
- Uncheck **Telemetry** / **NVIDIA Container**
- Uncheck **PhysX** (if not needed)
- Keep only: **Display Driver**, **HD Audio Driver** (optional)

### Remove NVIDIA Services After Install
```powershell
$nvTelemetryServices = @("NvTelemetryContainer", "NvContainerLocalSystem", "NvContainerNetworkService")
foreach ($svc in $nvTelemetryServices) {
    Stop-Service $svc -Force -ErrorAction SilentlyContinue
    Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
}
```

---

## 7. Windows Driver Store & Cleanup

```powershell
# List all installed driver packages
pnputil /enum-drivers

# Remove old driver packages (staging area)
# Keeps only the active driver but removes redundant cached packages
pnputil /delete-driver <oem#.inf> /uninstall

# Automated old driver cleanup (be careful)
# pnputil /enum-drivers | Where-Object {$_ -like "oem*"} | ...
```

---

## 8. Driver Verification

```powershell
# Check for any driver signing errors
Get-WinEvent -LogName System | Where-Object { $_.Id -eq 219 } | 
    Select TimeCreated, Message | Sort TimeCreated -Descending | Select -First 10

# Verify GPU driver loaded correctly
Get-WmiObject Win32_VideoController | Select Name, DriverVersion, Status

# Check NIC driver
Get-NetAdapter | Select Name, DriverVersion, DriverInformation
```

---

## References
- [DDU by Wagnard](https://www.wagnardsoft.com/)
- [Intel Driver & Support Assistant](https://www.intel.com/content/www/us/en/support/intel-driver-support-assistant.html)
- [AMD Cleanup Utility](https://www.amd.com/en/support/kb/faq/gpu-601)
