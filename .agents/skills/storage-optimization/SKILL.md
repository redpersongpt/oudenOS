---
name: storage-optimization
description: NVMe queue depth, SSD TRIM scheduling, write caching, AHCI vs NVMe configuration, StorNVMe driver tweaks, and filesystem alignment for maximum storage throughput and low game loading times.
---

# Storage Optimization Skill

## Overview
This skill covers everything from physical NVMe configuration to Windows filesystem and driver settings to minimize game load times, reduce stutter from shader compilation, and improve I/O responsiveness.

---

## 1. NVMe Configuration

### Verify NVMe is Running in PCIe 4.0/5.0 Mode
```powershell
# Check NVMe device in Device Manager for PCIe version
Get-PhysicalDisk | Select FriendlyName, MediaType, BusType, OperationalStatus
```

### NVMe Queue Depth
The default Windows queue depth for NVMe is 32 for consumer workloads. Ensure the slot is not sharing bandwidth with other devices.

### StorNVMe Driver vs. Vendor Driver
```powershell
# Check which driver is being used
Get-WmiObject Win32_PnPSignedDriver | Where-Object { $_.DeviceName -like "*NVMe*" } |
    Select DeviceName, DriverVersion, InfName
```

- **Microsoft StorNVMe** (inbox): Works well, regularly updated
- **Vendor driver** (Samsung Magician, WD Dashboard): May offer additional features or performance optimizations specific to the hardware

---

## 2. Write Caching

### Enable Write Caching (Critical for performance)
```powershell
# Via Device Manager → Disk → Properties → Policies tab → Enable write caching
# Or via PowerShell:
$disk = Get-Disk -Number 0
Set-Disk -Number $disk.Number -IsOffline $false
```

### Direct via Registry
```
HKLM\SYSTEM\CurrentControlSet\Enum\SCSI\<device>\<instance>\Device Parameters\Disk
"CacheIsPowerProtected"=dword:00000001
"UserWriteCacheSetting"=dword:00000001
"FUA"=dword:00000000
```

---

## 3. TRIM Optimization

### Verify TRIM is Enabled
```powershell
# Should return "0" meaning TRIM is enabled
fsutil behavior query disabledeletenotify
```

### Manually Run TRIM
```powershell
# Defragment/Optimize (runs TRIM on SSDs automatically)
Optimize-Volume -DriveLetter C -ReTrim -Verbose
```

### Disable Automatic Defrag for SSDs (important — SSDs don't benefit from defrag)
```powershell
# Check scheduled defrag
Get-ScheduledTask -TaskName "ScheduledDefrag" | Select TaskName, State
# Windows should automatically detect SSDs and skip defrag, but verify
```

---

## 4. Filesystem Configuration

### Disable 8.3 File Name Generation (reduces filesystem overhead)
```powershell
fsutil behavior set disable8dot3 1
# Or per-volume:
fsutil behavior set disable8dot3 C: 1
```

### Disable Last Access Timestamps
```powershell
fsutil behavior set disablelastaccess 1
```

### Disable Prefetch/Superfetch for NVMe (unnecessary on fast SSDs)
```powershell
# Disable SysMain (Superfetch) service
Stop-Service SysMain -Force
Set-Service SysMain -StartupType Disabled

# Disable prefetcher
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" `
    -Name "EnablePrefetcher" -Value 0 -Type DWord
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" `
    -Name "EnableSuperfetch" -Value 0 -Type DWord
```

---

## 5. I/O Scheduler and Policies

### Verify NVMe is Using None Scheduler (bypass Windows I/O scheduler)
NVMe drives in Windows use the **None** I/O scheduler by default — this is correct and optimal. Do NOT install third-party I/O scheduler tools that add artificial queuing.

### AHCI Link Power Management
```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]

# Disable AHCI Link Power Management (prevents drive sleep)
powercfg /setacvalueindex $powerScheme 0012ee47-9041-4b5d-9b77-535fba8b1442 `
    dbc9e238-6de9-49e3-92cd-8c2b4946b472 0
powercfg /setactive $powerScheme
```

---

## 6. Game Install Drive Optimization

### Use a Dedicated Game Drive
- Install Windows on a separate NVMe from games
- Use the fastest drive (PCIe 4.0+ NVMe) for the game currently being played
- HDDs should only be used for cold storage — never for active games

### Game Drive Allocation Unit Size
Format game drives with a 64 KB allocation unit size for large game files:
```powershell
# Format the game drive (WARNING: destroys all data)
Format-Volume -DriveLetter D -FileSystem NTFS -AllocationUnitSize 65536 -NewFileSystemLabel "Games" -Confirm:$false
```

---

## 7. DirectStorage

DirectStorage (available in Windows 11 + compatible games) bypasses the CPU for GPU asset decompression.

### Requirements
- Windows 11 or Windows 10 (limited support)
- NVMe drive (SATA works but is slower)
- GPU with DirectX 12 Ultimate support
- A game that uses the DirectStorage API

### Verify GPU supports GDeflate
```powershell
# Check DirectX features
dxdiag  # Look for DirectX 12 Ultimate in Display tab
```

No special configuration is needed — DirectStorage is enabled automatically in supported games. Ensure your NVMe driver is up to date.

---

## 8. Benchmarking Storage

```powershell
# Quick sequential read/write benchmark using built-in tool
winsat disk -drive C

# For detailed benchmarking, use:
# - CrystalDiskMark  : Sequential/random R/W speeds
# - AS SSD Benchmark : Access time and IOPS
# - ATTO Disk Benchmark : Queue depth tests
```

---

## References
- [MSDN: NVMe drivers](https://docs.microsoft.com/en-us/windows-hardware/drivers/storage/nvme-features-supported-by-stornvme)
- [CrystalDiskMark](https://crystalmark.info/en/software/crystaldiskmark/)
- [DirectStorage API](https://devblogs.microsoft.com/directx/directstorage-developer-preview/)
