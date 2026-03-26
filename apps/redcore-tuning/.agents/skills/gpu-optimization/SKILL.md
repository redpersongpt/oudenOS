---
name: gpu-optimization
description: GPU driver tuning, NVIDIA Control Panel and AMD Adrenalin settings, TDR configuration, hardware-accelerated GPU scheduling, and display pipeline optimization for gaming.
---

# GPU Optimization Skill

## Overview
This skill covers GPU-level optimizations for Windows gaming: driver settings, power limits, TDR tuning, HAGS, and display pipeline configuration. Covers both NVIDIA and AMD cards.

---

## 1. Hardware-Accelerated GPU Scheduling (HAGS)

HAGS moves GPU scheduling from the CPU to the GPU itself, reducing latency in some scenarios.

### Enable/Disable via Registry
```
HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers
"HwSchMode"=dword:00000002   ; 2 = Enabled, 1 = Disabled
```

### PowerShell
```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" `
    -Name "HwSchMode" -Value 2 -Type DWord
```

> **Testing recommended**: HAGS improves frame time consistency on some systems but hurts it on others. Benchmark with and without.

---

## 2. NVIDIA Control Panel (NVCP) Optimal Settings

### Key Settings (3D Application Globals)
| Setting | Recommended Value | Reason |
|---------|-------------------|--------|
| Maximum Pre-Rendered Frames | 1 | Reduce render queue latency |
| Power Management Mode | Prefer Maximum Performance | Prevent clock drops |
| Texture Filtering - Quality | High Performance | Lower CPU handoff latency |
| Threaded Optimization | On | Multi-core CPU utilization |
| Vertical Sync | Off | Eliminate V-Sync latency |
| Low Latency Mode | Ultra | Reduces render queue depth |
| Shader Cache Size | Unlimited | Prevent stutter from cache misses |

### Apply Maximum Performance Power Mode via Registry
```
HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000
"PerfLevelSrc"=dword:00002222
"PowerMizerEnable"=dword:00000001
"PowerMizerLevel"=dword:00000001
"PowerMizerLevelAC"=dword:00000001
```

---

## 3. AMD Adrenalin Optimal Settings

| Setting | Recommended Value |
|---------|-------------------|
| Radeon Anti-Lag | Enabled |
| Radeon Boost | Off (for consistent frame times) |
| Radeon Chill | Off |
| Enhanced Sync | Off (use in-game V-Sync off only) |
| Image Sharpening | Optional (slight GPU cost) |
| Texture Filtering Quality | Performance |
| Tessellation Mode | Override, set to 8x or lower |

---

## 4. TDR (Timeout Detection and Recovery) Configuration

TDR is the watchdog that resets the GPU if it stops responding. Incorrectly tuned TDR causes false resets during load spikes.

### Increase TDR Delay (Default = 2 seconds)
```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" `
    -Name "TdrDelay" -Value 10 -Type DWord

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" `
    -Name "TdrDdiDelay" -Value 10 -Type DWord
```

### Disable TDR Entirely (NOT recommended for production, useful for testing)
```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" `
    -Name "TdrLevel" -Value 0 -Type DWord
```

---

## 5. Identity Scaling (Native Resolution)

When using the native monitor resolution, Windows uses identity scaling automatically. To force it or confirm:

```powershell
# Query current scaling mode (1 = Identity, 2 = Centered/No Scaling, 3 = Full-screen, 4 = Aspect Ratio)
# Use QueryDisplayConfig API or the QueryDisplayScaling tool:
# https://github.com/valleyofdoom/QueryDisplayScaling
.\QueryDisplayScaling.exe
```

For a lower resolution with identity scaling (true nearest-neighbor GPU scaling):
- Set the resolution in **Custom Resolution Utility (CRU)** as a detailed resolution
- Set "Perform Scaling On: GPU" in NVCP / AMD panel
- Verify with `QueryDisplayScaling.exe` that mode = 1 (Identity)

---

## 6. GPU Power Limit & Overclocking

### NVIDIA (via nvidia-smi)
```powershell
# Set power limit to 80% (reduces heat, often minimal FPS impact at stock clocks)
nvidia-smi -pl 80

# Lock GPU clock to a stable P-state (e.g., 1800 MHz)
nvidia-smi -lgc 1800,1800
```

### AMD (via MorePowerTool + Radeon Software)
- Use **MorePowerTool** to unlock power limits beyond AMD's default slider
- Set a fixed GPU frequency via Radeon Performance Tuning → Manual
- Reduce voltage with the voltage/frequency curve editor to lower heat

---

## 7. Reduce GPU Driver Interrupt Latency

### Disable NVIDIA Telemetry Services
```powershell
$nvServices = @(
    "NvTelemetryContainer",
    "NvContainerLocalSystem",
    "NvContainerNetworkService"
)
foreach ($svc in $nvServices) {
    Stop-Service $svc -Force -ErrorAction SilentlyContinue
    Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
}
```

### MSI Mode for GPU (reduces interrupt latency)
Use **MSI Mode Utility** or set via registry:
```
HKLM\SYSTEM\CurrentControlSet\Enum\PCI\<GPU Device ID>\<Instance>\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties
"MSISupported"=dword:00000001
```

---

## 8. Driver Installation Best Practices

1. Download DDU (Display Driver Uninstaller)
2. Boot into Safe Mode
3. Run DDU → Clean and Restart
4. Install latest stable (not beta) driver with **Custom Install → Clean Installation**
5. Uncheck GeForce Experience if not needed (reduces background processes)

---

## References
- [NVIDIA Developer — NVAPI](https://developer.nvidia.com/nvapi)
- [CustomResolutionUtility](https://www.monitortests.com/forum/Thread-Custom-Resolution-Utility-CRU)
- [valleyofdoom/QueryDisplayScaling](https://github.com/valleyofdoom)
