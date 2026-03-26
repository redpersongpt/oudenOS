---
name: thermal-management
description: Fan curve configuration, thermal paste guidance, CPU/GPU throttle detection, TjMax monitoring, and cooling optimization for sustained gaming performance.
---

# Thermal Management Skill

## Overview
This skill covers detecting and resolving thermal throttling — a silent performance killer. Sustained clock speeds require adequate cooling and proper thermal configuration.

---

## 1. Detect Thermal Throttling

### Check for CPU Throttle
```powershell
# Monitor CPU temperature and frequency in real-time (HWiNFO64 is best)
# Via PowerShell (limited accuracy):
Get-CimInstance -ClassName Win32_Processor | Select Name, CurrentClockSpeed, MaxClockSpeed

# Check Windows throttle reason via ETW
# Run xperf and look for "CPU Frequency" events
```

### GPU Throttle Detection
```powershell
# NVIDIA only:
nvidia-smi --query-gpu=temperature.gpu,clocks.gr,clocks.max.gr,power.draw,power.limit --format=csv,noheader,nounits

# If (clocks.gr < clocks.max.gr) AND temperature > 80°C → thermal throttling
# If power.draw >= power.limit → power throttling
```

---

## 2. CPU Temperature Safe Ranges

| CPU Generation | TjMax | Safe Load Temp | Throttle Temp |
|----------------|-------|----------------|---------------|
| Intel 12th/13th/14th Gen | 100°C | < 85°C | 100°C |
| Intel 10th/11th Gen | 100°C | < 80°C | 100°C |
| AMD Ryzen 5000 (Zen 3) | 95°C | < 85°C | 90°C+ |
| AMD Ryzen 7000 (Zen 4) | 95°C | < 90°C | 95°C |

> **Ryzen note**: AMD CPUs boost aggressively and will often hit 90-95°C under all-core load. This is normal and by design if it's not sustained above TjMax.

---

## 3. Fan Curve Configuration

### Via BIOS
1. Enter BIOS → Advanced → H/W Monitor or Fan Xpert
2. Configure CPU fan curve: start at 30% duty cycle at 40°C, ramp to 100% at 80°C
3. Use "Silent" or "Performance" preset as a baseline, then customize

### Via Software (ASUS AI Suite, MSI Afterburner for GPU)

**GPU Fan Curve (MSI Afterburner)**:
```
Temp  | Fan %
30°C  | 0%
50°C  | 30%
60°C  | 50%
70°C  | 70%
80°C  | 90%
85°C  | 100%
```

---

## 4. Ryzen Thermal Behavior Notes

```powershell
# Check Ryzen PPT/TDC/EDC limits via HWiNFO64
# Ryzen Master can also show current power package and thermal limits

# Recommended Ryzen BIOS settings:
# - CPU Boost Override: Auto (or Manual if delidded/custom cooling)
# - PBO (Precision Boost Overdrive): Enable with conservative limits
# - Thermal Design Current (TDC): Set per AIO/custom water recommendation
```

---

## 5. Thermal Paste Application Guide

The quality of thermal paste application significantly impacts temperatures.

### Steps
1. Clean IHS and cooler contact plate with 99% isopropyl alcohol
2. Apply pea-sized amount (0.2–0.3 mL) or X-pattern for large IHS (Threadripper/HEDT)
3. Mount cooler with even pressure — cross-pattern tightening
4. Let paste cure for 2–3 hours under load before benchmarking

### Recommended Pastes
| Paste | Performance | Notes |
|-------|------------|-------|
| Thermal Grizzly Kryonaut | ⭐⭐⭐⭐ | Best for most; dries out after 2-3 years |
| Noctua NT-H1 | ⭐⭐⭐⭐ | Long-lasting, great durability |
| Arctic MX-6 | ⭐⭐⭐⭐ | Non-electrically conductive, safe |
| Thermal Grizzly Conductonaut | ⭐⭐⭐⭐⭐ | Liquid metal — max performance, delidded only |

---

## 6. Undervolting to Reduce Heat

Undervolting reduces voltage while maintaining performance, lowering heat output.

### Intel (via XTU or ThrottleStop)
```
Reduce Core Voltage Offset: start at -50mV, test stability, go to -100mV
Reduce Cache Voltage Offset: same as core, usually -50mV to -100mV
```

### AMD (via Ryzen Master or BIOS → PBO Curve Optimizer)
```
Set per-core negative offsets: start at -15, test stability
Negative = lower voltage at same frequency = lower heat
```

---

## 7. Monitoring Tools

```powershell
# HWiNFO64 — best tool for comprehensive sensor data
# Logs all temperatures, power, frequencies, fan speeds

# Core Temp — lightweight CPU temperature monitor
# GPU-Z — GPU temperature, VRAM, clocks

# Look for:
# - CPU "Thermal Throttling" sensor (boolean) in HWiNFO64
# - GPU "Performance Limit - Thermal" (boolean) in HWiNFO64
```

---

## References
- [HWiNFO64](https://www.hwinfo.com/)
- [Thermal Grizzly](https://www.thermal-grizzly.com/)
- [Ryzen Master](https://www.amd.com/en/technologies/ryzen-master)
