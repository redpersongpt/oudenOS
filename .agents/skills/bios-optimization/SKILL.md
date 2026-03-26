---
name: bios-optimization
description: BIOS/UEFI configuration guide for gaming — XMP/EXPO, CSM/UEFI mode, Resizable BAR, SR-IOV, power states, secure boot, and board-specific performance settings.
---

# BIOS Optimization Skill

## Overview
This skill covers BIOS settings that have significant impact on gaming performance. Many of these settings exist only in BIOS and cannot be changed from Windows.

---

## 1. Memory Settings

### Enable XMP/EXPO (Critical)
- Intel: **XMP Profile 1** (AI Tweaker on ASUS / Memory Profiles on MSI)
- AMD: **EXPO Profile 1** (ASUS D.O.C.P., MSI EXPO)
- Verify: `Get-CimInstance Win32_PhysicalMemory | Select ConfiguredClockSpeed`

### Manual Frequency + Timings
- Only for advanced users; use DRAM Calculator for Ryzen for safe values
- Set primary timings → run MemTest86 2 passes → tighten secondaries

---

## 2. Resizable BAR (ReBAR)

ReBAR allows the CPU to access the full GPU VRAM instead of 256 MB chunks, improving DX12/Vulkan performance 2–15%.

### Enable ReBAR
1. BIOS → Advanced → PCIe Configuration → **Resizable BAR = Enabled**
2. Also enable **Above 4G Decoding** (required for ReBAR)
3. Save and reboot
4. Verify in GPU-Z: "Resizable BAR = Yes"
5. Enable in NVIDIA NVCP: Manage 3D Settings → "GPU Memory" = No Preference

---

## 3. CSM vs UEFI Mode

| Mode | Boot | GPU Output | Required For |
|------|------|-----------|--------------|
| CSM Enabled | Legacy BIOS | VGA/DVI legacy | Old GPUs without GOP |
| UEFI Only (CSM Off) | UEFI | GOP (native) | Windows 11, Secure Boot, fast boot |

**Recommendation**: Disable CSM (UEFI-only mode) on modern systems.

---

## 4. C-States in BIOS

Disable BIOS-level C-states to complement Windows power plan settings:
- AMD: **Global C-State Control = Disabled**
- Intel: **C1E Support = Disabled**, **C6 DRAM = Disabled**, **Package C State = C0/C1**

> Note: Disabling C-states increases idle power consumption but eliminates wake latency.

---

## 5. Processor Turbo Boost Settings

### Intel
- **Intel Turbo Boost = Enabled** (always)
- **Enhanced Intel SpeedStep (EIST) = Disabled** (for fixed P-state gaming — extreme only)
- **Power Limit (PL1/PL2)**: Set PL1 = PL2 = TDP rating for sustained performance

### AMD
- **PBO (Precision Boost Overdrive)**: Auto or Enabled
- **PBO Limits**: Set scalar to 10× for aggressive boost (ensure adequate cooling)
- **Curve Optimizer**: Negative per-core offsets for lower voltage

---

## 6. Fan Control

Configure BIOS fan curves before installing Windows software:
- Use **Q-Fan Control** (ASUS) or **Smart Fan** (MSI/Gigabyte)
- Set CPU fan to temperature-based control, start threshold ~25°C
- Pump headers: set to DC/PWM max (100%) always for AIO pumps

---

## 7. Secure Boot

- **Required for Windows 11**: Secure Boot must be enabled
- **Mode: Standard** (not Custom) for compatibility
- Does not impact gaming performance

---

## 8. Virtualization

Disable if not needed:
- **Intel VT-x / VT-d**: Disable if not running VMs or WSL2
- **AMD-V / IOMMU**: Disable if not using VMs

> Note: VT-d/IOMMU enabling adds overhead on some platforms. Only disable if no VMs are used.

---

## 9. Fast Boot & POST

- **Fast Boot = Enabled**: Skips memory training on every boot (saves 5-15 seconds)
- **POST Delay Time = 0s**: No countdown before POST
- **Boot Logo Display = Auto**: Suppress verbose POST

---

## 10. Recommended BIOS Checklist

```
[✓] XMP/EXPO enabled at desired speed
[✓] Above 4G Decoding enabled
[✓] Resizable BAR enabled
[✓] CSM disabled (UEFI only)
[✓] Secure Boot enabled (Win11) or disabled (Win10 gaming tweaks)
[✓] C-States configured (disabled for max perf)
[✓] PBO/Turbo Boost enabled
[✓] Fan curves configured
[✓] Virtualization disabled (if no VMs needed)
[✓] Fast Boot enabled
```

---

## References
- Board-specific manuals (ASUS ROG, MSI MEG, Gigabyte Aorus, ASRock Taichi)
- [AMD PBO Guide](https://www.amd.com/en/technologies/precision-boost-overdrive)
- [Intel Power Primer](https://edc.intel.com/content/www/us/en/design/ipla/sw-dev-catalog/client/ia/36556/tdg-intel-platform-power-management-overview.pdf)
