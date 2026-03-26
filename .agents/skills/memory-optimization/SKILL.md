---
name: memory-optimization
description: RAM frequency, XMP/EXPO enabling, primary/secondary/tertiary timing tightening, paging file configuration, memory compression, and large page support for Windows performance.
---

# Memory Optimization Skill

## Overview
This skill covers RAM optimization at both the BIOS level (XMP/EXPO, timings) and the Windows OS level (paging file, memory compression, large pages). High-frequency, low-latency RAM is one of the highest-impact upgrades for gaming performance.

---

## 1. XMP / EXPO (BIOS Level)

### What It Is
- **XMP (Intel)** / **EXPO (AMD)**: Factory-preset overclocking profiles stored in the RAM's SPD EEPROM
- Stock JEDEC speed for DDR5 is 4800 MT/s; XMP/EXPO profiles go up to 7200+ MT/s

### How to Enable
1. Enter BIOS (usually DEL or F2 on POST)
2. Navigate to **AI Tweaker** (ASUS), **D.O.C.P.** (AMD+ASUS), **XMP** (Intel boards), or **EXPO** (AMD boards)
3. Select your desired XMP/EXPO profile (Profile 1 is usually the highest validated speed)
4. Save and reboot

### Verify in Windows
```powershell
# Check current RAM speed
Get-CimInstance -ClassName Win32_PhysicalMemory | Select-Object Manufacturer, Speed, ConfiguredClockSpeed, Capacity
```

---

## 2. Primary Timings Guide

| Timing | Name | Lower = Faster? | Typical DDR4 | Typical DDR5 |
|--------|------|-----------------|--------------|--------------|
| CL     | CAS Latency | ✅ | 14–18 | 36–40 |
| tRCD   | RAS-to-CAS Delay | ✅ | 14–18 | 36–40 |
| tRP    | Row Precharge | ✅ | 14–18 | 36–40 |
| tRAS   | Row Active Time | ✅ (to a point) | 28–36 | 76–80 |
| tRC    | Row Cycle | ✅ | 42–58 | 116–120 |

### General Tightening Strategy
1. Start with XMP/EXPO as baseline
2. Reduce CL by 2, test stability with **MemTest86** for 2 passes
3. If stable, reduce tRCD and tRP by 2
4. Repeat until instability, then add 2 back as margin
5. Reduce tRAS to `CL + tRCD + 2` (minimum safe formula)

---

## 3. Secondary and Tertiary Timings

Key secondary timings for performance (DDR4 example):
```
tRFC  = 300–500 ns converted to clocks  (lower = better bandwidth)
tREFI = 65535 (maximum, reduces refresh overhead — trades ECC safety)
tWTR_L / tWTR_S — Write-to-Read latency
tRTP  — Read-to-Precharge
tFAW  — Four Activate Window
```

> Use **DRAM Calculator for Ryzen** (1usmus) or **Hynix/Samsung/Micron timing guides** for chip-specific recommendations.

---

## 4. Windows Paging File (Virtual Memory)

### Disable / Optimize
For systems with 32 GB+ RAM and no crash dump requirements:
```powershell
# Set paging file to system-managed (safest)
$cs = Get-WmiObject -Class Win32_ComputerSystem -EnableAllPrivileges
$cs.AutomaticManagedPagefile = $true
$cs.Put()
```

For maximum performance (disables pagefile — only safe with 32 GB+):
```powershell
$cs = Get-WmiObject -Class Win32_ComputerSystem -EnableAllPrivileges
$cs.AutomaticManagedPagefile = $false
$cs.Put()

$pf = Get-WmiObject -Class Win32_PageFileSetting
$pf | Remove-WmiObject
```

### Place Pagefile on Fastest Drive
```powershell
# Set pagefile to D: drive (e.g., NVMe), 8192 MB initial and max
Set-WmiInstance -Class Win32_PageFileSetting -Arguments @{
    Name        = "D:\pagefile.sys"
    InitialSize = 8192
    MaximumSize = 8192
}
```

---

## 5. Memory Compression

Windows 10+ uses memory compression to fit more data in RAM by compressing pages. This trades CPU cycles for RAM capacity.

### Disable Memory Compression (reduces CPU overhead on high-RAM systems)
```powershell
# Requires admin
Disable-MMAgent -MemoryCompression
```

### Re-enable
```powershell
Enable-MMAgent -MemoryCompression
```

### Check Current State
```powershell
Get-MMAgent
```

---

## 6. Large Pages (SeLockMemoryPrivilege)

Large pages (2 MB on x64) reduce TLB misses for games that can request them (e.g., Rust, CS2).

### Enable via Group Policy
```
Computer Configuration → Windows Settings → Security Settings →
Local Policies → User Rights Assignment → Lock pages in memory
```
Add your user account. Reboot required.

### Enable via PowerShell (using ntrights or secedit)
```powershell
# Export current security policy, add SeLockMemoryPrivilege, re-import
$tempFile = "$env:TEMP\secpol.cfg"
secedit /export /cfg $tempFile
$content = Get-Content $tempFile
$content = $content -replace "(SeLockMemoryPrivilege\s*=\s*)(.*)", "`$1`$2,*S-1-5-32-544"
$content | Set-Content $tempFile
secedit /configure /db secedit.sdb /cfg $tempFile /areas USER_RIGHTS
```

---

## 7. Verification

```powershell
# Check RAM speed and latency
Get-CimInstance Win32_PhysicalMemory | Select Speed, ConfiguredClockSpeed, Capacity

# Check memory compression state
Get-MMAgent | Select MemoryCompression

# Check pagefile
Get-WmiObject Win32_PageFileSetting | Select Name, InitialSize, MaximumSize
```

Use **HWiNFO64** (Sensors → Memory Timings) to verify actual configured timings at runtime.

---

## References
- [1usmus DRAM Calculator for Ryzen](https://www.overclock.net/threads/1usmus-custom-ram-oc-guide.1707604/)
- [MemTest86](https://www.memtest86.com/)
- [HWiNFO64](https://www.hwinfo.com/)
- MSDN: [Virtual Memory Management](https://docs.microsoft.com/en-us/windows/win32/memory/virtual-memory-management)
