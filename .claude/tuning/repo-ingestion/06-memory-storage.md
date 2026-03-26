# Memory & Storage Optimizations — PC-Tuning Source Extraction

**Source:** https://github.com/valleyofdoom/PC-Tuning (README.md, main branch)
**Ingested:** 2026-03-24

---

## 1. NTFS File System Optimizations (Section 11.2)

### 1.1 Disable 8.3 Filename Creation

**What it does:** Prevents NTFS from creating 8.3 character-length (DOS-compatible) short file names. Improves performance and security.

**Condition:** Must be applied *before first boot* from within Windows Setup (pre-boot environment) to avoid file access errors. If applied post-install, existing 8.3 names are not removed automatically — use strip command.

**Special note (Windows 10 24H2+):** Use the previous version of setup UI due to a setup change on 24H2.

**If globally disabled setting interferes:** First set to per-volume mode (`set 2`), then set per-volume (`set <drive> 1`), then restore global.

```bat
:: Globally disable creation of 8.3 names
fsutil 8dot3name set 1

:: Check existing 8.3 names on C:
fsutil 8dot3name scan /s C:

:: Per-volume disable (replace D: with target drive)
fsutil 8dot3name set <drive letter> 1

:: Strip existing 8.3 names from volume (replace D:)
fsutil 8dot3name strip /s /f <drive letter>

:: Workaround if global disable blocks per-volume command
fsutil 8dot3name set 2          :: switch to "per-volume" mode first
fsutil 8dot3name set <drive> 1  :: then disable on volume
fsutil 8dot3name set 1          :: re-apply global disable
```

**Rollback:**
```bat
:: Re-enable 8.3 name creation globally
fsutil 8dot3name set 0
```

**SSD vs HDD:** Applies equally to both. NTFS-formatted volumes only.

---

### 1.2 Disable Last Access Time Stamp Updates

**What it does:** Stops NTFS from updating the "Last Access Time" metadata on directories when they are listed. Improves file and directory access speed.

**Caveat:** May affect backup and remote storage programs that rely on last-access timestamps (e.g., incremental backup tools, Windows File History, cloud sync with access tracking).

```bat
fsutil behavior set disablelastaccess 1
```

**Rollback:**
```bat
fsutil behavior set disablelastaccess 0
```

**Windows default:** `0` (enabled, timestamps updated on access).

---

## 2. Superfetch / Prefetch / SysMain (Section 11.18)

**What it does:** SysMain (Superfetch) pre-loads frequently used application data into RAM during idle periods to reduce launch times. Prefetch builds a similar launch-optimization cache in `C:\Windows\Prefetch`.

**Condition:** Disable **only if no HDD is present**. On SSD-only systems, these services add overhead without meaningful benefit since SSD random reads are fast.

**Microsoft endorsement:** Disabling SysMain is explicitly in Microsoft's recommendations for configuring devices for real-time performance (IoT Enterprise Soft Real-Time guidance).

```bat
:: Disable SysMain (Superfetch) service
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v "Start" /t REG_DWORD /d "4" /f
```

**Rollback:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v "Start" /t REG_DWORD /d "2" /f
```

**Registry path:** `HKLM\SYSTEM\CurrentControlSet\Services\SysMain`
**Value:** `Start`
**Type:** `REG_DWORD`
**Disabled value:** `4` (SERVICE_DISABLED)
**Default value:** `2` (SERVICE_AUTO_START)

**Side effects:**
- `C:\Windows\Prefetch` folder will no longer be populated when SysMain is disabled
- If SysMain is left enabled, keep prefetch-related MMAgent settings enabled too (see Section 3)

**Service dependency check before disabling:**
```bat
sc EnumDepend SysMain
```

---

## 3. Memory Management Settings — MMAgent (Section 11.33, Windows 8+)

**Scope:** Windows 8 and later only.

**Caution:** Do NOT blindly apply. Benchmark before and after. Every system behaves differently — changes can degrade performance.

**View current MMAgent settings (PowerShell admin):**
```powershell
Get-MMAgent
```

**MMAgent controllable properties (from Get-MMAgent output):**
| Property | Description |
|---|---|
| `ApplicationLaunchPrefetching` | Prefetch data for application launches |
| `ApplicationPreLaunch` | Pre-launch applications before user opens them |
| `MaxOperationAPIFiles` | Max files tracked for OperationAPI |
| `MemoryCompression` | Compress pages in standby memory list |
| `OperationAPI` | Access pattern monitoring for storage ops |
| `PageCombining` | Combine identical memory pages to reduce working set |

**Disable individual settings:**
```powershell
Disable-MMAgent -MemoryCompression
Disable-MMAgent -ApplicationLaunchPrefetching
Disable-MMAgent -ApplicationPreLaunch
Disable-MMAgent -PageCombining
Disable-MMAgent -OperationAPI
```

**Re-enable:**
```powershell
Enable-MMAgent -MemoryCompression
Enable-MMAgent -ApplicationLaunchPrefetching
# etc.
```

**Guidance from repo:**
- If SysMain/Prefetch was left **enabled**, keep `ApplicationLaunchPrefetching` and `ApplicationPreLaunch` enabled too
- If SysMain/Prefetch was **disabled**, all MMAgent prefetch settings can also be disabled
- `MemoryCompression` is the most commonly disabled setting for real-time/low-latency workloads — it uses CPU cycles to compress pages that would otherwise go to pagefile

---

## 4. Paging File / Virtual Memory (Section 11.51)

**Caution:** Benchmark before and after. Disabling may help or hurt depending on workload and system.

**Recommendation (from repo):** Keep paging file **enabled** for most users.

**Key considerations:**
- Disabling pagefile reduces I/O overhead and RAM is faster than disk
- BUT: many users report in-game stuttering even when RAM usage is well below maximum
- Windows sometimes places the pagefile on a secondary drive which may be an HDD — problematic for latency
- **Resolution:** Explicitly allocate the pagefile to an SSD with "System managed size" and deallocate it from all other drives

**Windows UI path for pagefile configuration:**
```
Control Panel → System → Advanced system settings → Advanced tab
→ Performance → Settings → Advanced → Virtual Memory → Change
```

**Per-drive pagefile registry location:**
`HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management`

| Value | Type | Description |
|---|---|---|
| `PagingFiles` | REG_MULTI_SZ | Pagefile paths and sizes, e.g. `C:\pagefile.sys 0 0` (0 0 = system managed) |
| `ClearPageFileAtShutdown` | REG_DWORD | `1` = zero out pagefile on shutdown (security, but slow) |
| `DisablePagingExecutive` | REG_DWORD | `1` = keep kernel code/drivers in RAM, never paged out (requires sufficient RAM) |
| `LargeSystemCache` | REG_DWORD | `0` = optimize for applications (desktop default); `1` = optimize for file cache (server) |

**Note:** `DisablePagingExecutive` and `LargeSystemCache` are not explicitly recommended in the PC-Tuning repo — these are standard Windows memory management keys for reference. The repo focuses on pagefile placement.

**Pagefile disable command (via PowerShell — not recommended per repo):**
```powershell
# Disable pagefile on all drives (use only with adequate RAM)
$cs = Get-WmiObject -Class Win32_ComputerSystem
$cs.AutomaticManagedPagefile = $false
$cs.Put()
$pf = Get-WmiObject -Query "SELECT * FROM Win32_PageFileSetting"
$pf | ForEach-Object { $_.Delete() }
```

---

## 5. Hibernation / Fast Startup (Section 6.16 and 11.21)

**What it does:** `powercfg /h off` simultaneously:
1. Disables Windows Fast Startup (hybrid boot/S4 state)
2. Disables hibernation
3. Removes `C:\hiberfil.sys` (frees disk space equal to ~75% of RAM)

```bat
:: Disable Fast Startup + Hibernation, remove hiberfil.sys
powercfg /h off
```

**Rollback:**
```bat
powercfg /h on
```

**Rationale for disabling:**
- Fast Startup saves kernel state to hiberfil.sys on shutdown — doesn't enter S5 (soft off)
- Can cause unexpected issues (driver state, hardware not fully re-initialized)
- Alternative: hold `Shift` while clicking "Shut down" for a full shutdown without disabling Fast Startup

**Fast Startup registry (via registry options):**
```
HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power
"HiberbootEnabled" = dword:0
```

**Verify S-States:**
```bat
powercfg /a
```

---

## 6. Windows Search / Indexing Service (Section 11.11)

**What it does:** Windows Search indexes file names and content for the Start Menu search and Explorer search. Indexing runs periodically in background with notable CPU overhead.

**Recommendation:** Disable if search features are not needed or if CPU interference is observed.

**View indexed locations:**
```
Win+R → control srchadmin.dll
```

**Diagnose overhead:**
Use Process Explorer → sort by "Context Switch Delta" or "Cycles Delta" to observe `SearchIndexer.exe` activity.

```bat
:: Disable Windows Search service (Start = 4 = DISABLED)
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" /v "Start" /t REG_DWORD /d "4" /f
```

**Rollback:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" /v "Start" /t REG_DWORD /d "2" /f
```

**Registry path:** `HKLM\SYSTEM\CurrentControlSet\Services\WSearch`
**Value:** `Start`
**Type:** `REG_DWORD`
**Disabled:** `4`
**Default:** `2` (auto-start)

**Check service dependencies before disabling:**
```bat
sc EnumDepend WSearch
```

---

## 7. Write Cache / Disk Policies (Section 11.36)

**Location:** Device Manager → View → Devices by type → Disk drives → [Drive] → Properties → Policies

**Write-Cache Buffer Flushing:**
- **Option:** "Turn off Windows write-cache buffer flushing on the device"
- **Enable only if:** System has a UPS (uninterruptible power supply) or is reliably protected from sudden power loss
- **Risk:** Data loss on unexpected power failure
- **Benefit:** Reduces I/O latency by allowing the drive to handle its own write buffer

**This is a per-device Device Manager toggle** — no single registry key for all drives. Per-drive registry location:
```
HKLM\SYSTEM\CurrentControlSet\Enum\<DeviceInstancePath>\Device Parameters\Disk
"CacheIsPowerProtected" = dword:1   :: set by Device Manager when UPS option checked
"UserWriteCacheSetting" = dword:1   :: write cache enabled
```

---

## 8. NVMe / AHCI / SATA Drivers (Section 11.8)

**Recommendation:** Install vendor-specific NVMe and SATA drivers instead of Microsoft's inbox drivers.

**Driver sources (WinRAID forums):**
- NVMe: https://winraid.level1techs.com/t/recommended-ahci-raid-and-nvme-drivers/28310
- SATA/AHCI: same URL as above

**Windows 7 special requirement:**
- Microsoft's stock SATA driver in Win7 does NOT support Message Signaled Interrupts (MSI)
- Must install vendor SATA driver for MSI support → reduces interrupt latency
- NVMe and USB drivers must be slipstreamed into Win7 ISO (not natively supported)

**Windows 7 ISO integration updates:**
| KB | Purpose |
|---|---|
| KB2990941 | NVMe support (hotfix) |
| KB3087873 | NVMe support + language pack hotfix |

**PCIe placement:** Favor PCIe slots connected directly to CPU (not chipset) for NVMe drives and GPUs. Verify link width/speed in HWiNFO PCIe Bus category — must match device's rated spec (e.g., `x4 4.0`).

**Disable unused controllers** (Device Manager → View → Devices by connection):
- Disable any PCIe, SATA, NVMe, XHCI controllers with nothing connected
- Reduces IRQ usage and interrupt overhead

---

## 9. SSD Health, Firmware & Free Space

**Tools:**
- [CrystalDiskInfo](https://crystalmark.info/en/software/crystaldiskinfo) — drive health, S.M.A.R.T., firmware version
- [CrystalDiskMark](https://crystalmark.info/en/software/crystaldiskmark) — sequential/random performance benchmark

**SSD free space:**
- SSDs slow down as they fill up (write amplification, fewer free blocks for wear leveling)
- Most drives are over-provisioned from factory, but user should maintain meaningful headroom
- Recommendation: keep 10–20% free minimum

**Firmware:**
- Check and update NVMe/SSD firmware — some firmware versions have known bugs (check forums/reviews before updating)
- Update via vendor tool (Samsung Magician, Crucial Storage Executive, etc.)

---

## 10. SSD TRIM & Manual Maintenance (Section 11.53)

**Context:** When `disable automatic maintenance` is set to `true` (recommended in PC-Tuning), Windows no longer runs its scheduled maintenance tasks. TRIM for SSDs and defrag for HDDs are performed during automatic maintenance.

**Manual TRIM (SSD):**
```bat
:: Optimize (TRIM) a specific drive — replace C: with target
defrag C: /U /V /RetrimSSD

:: Or using PowerShell
Optimize-Volume -DriveLetter C -ReTrim -Verbose
```

**Manual defragment (HDD):**
```bat
defrag C: /U /V
```

**Check if TRIM is enabled:**
```bat
fsutil behavior query DisableDeleteNotify
:: 0 = TRIM enabled (default, desired for SSD)
:: 1 = TRIM disabled
```

**Enable TRIM if disabled:**
```bat
fsutil behavior set DisableDeleteNotify 0
```

---

## 11. Automatic Maintenance (Registry)

**What it does:** Windows Automatic Maintenance runs scheduled tasks (TRIM, defrag, security scans, Windows Defender updates, Windows Update, etc.) during idle periods. Disabling reduces background CPU/disk spikes.

**Registry key:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance]
"MaintenanceDisabled"=dword:00000001
```

**Rollback:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance]
"MaintenanceDisabled"=dword:00000000
```

**Or delete the value to restore default (maintenance enabled).**

**View maintenance tasks in PowerShell:**
```powershell
Get-ScheduledTask | ? {$_.Settings.MaintenanceSettings}
```

**Critical side effect:** With automatic maintenance disabled, you MUST manually run SSD TRIM / HDD defrag periodically. See Section 10 above.

---

## 12. Fault Tolerant Heap (Registry)

**What it does:** FTH is a Windows mechanism that automatically applies mitigations (memory layout changes, etc.) to processes that crash repeatedly, to prevent future crashes. This can silently alter application behavior and cause performance issues.

```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\FTH]
"Enabled"=dword:00000000
```

**Rollback:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\FTH]
"Enabled"=dword:00000001
```

---

## 13. Disk Cleanup

**Configure (interactive, check boxes in UI):**
```bat
cleanmgr /sageset:0
```
Tick all boxes except "DirectX Shader Cache", then press OK.

**Run with saved settings:**
```bat
cleanmgr /sagerun:0
```

**WinSxS cleanup (reduces component store size — lengthy process):**
```bat
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

**Locations to review for residual files:**
| Path | Content |
|---|---|
| `C:\Windows\Prefetch` | Prefetch files (should be empty when SysMain disabled) |
| `C:\Windows\SoftwareDistribution` | Windows Update download cache |
| `C:\Windows\Temp` | System temporary files |
| `%userprofile%\AppData\Local\Temp` | User temp files |

---

## 14. Implementation Mapping for redcore-Tuning

### Module Groupings

| Module Name | Actions |
|---|---|
| `ntfs-optimization` | 8.3 filenames, last access time |
| `memory-management` | SysMain/prefetch, MMAgent memory compression, paging file |
| `storage-performance` | Write cache flushing, NVMe drivers, PCIe placement, TRIM |
| `background-services` | WSearch disable, automatic maintenance disable |

### Safety Tiers

| Tier | Settings |
|---|---|
| **Safe (any system)** | Disable WSearch, disable 8.3 filenames (new files only), disable last access time, disable FTH |
| **SSD-only systems** | Disable SysMain/Prefetch, disable MMAgent memory compression |
| **Expert / UPS required** | Disable write-cache buffer flushing |
| **Benchmark required** | Disable pagefile, all MMAgent settings, DisablePagingExecutive |

### Conditions & Compatibility

| Setting | Windows Min | Windows Max | Condition |
|---|---|---|---|
| SysMain disable | 7 | — | No HDD present |
| MMAgent settings | 8 (9200) | — | — |
| 8.3 filename strip | 7 | — | Best pre-boot; post-boot supported |
| Last access time | 7 | — | — |
| pagefile guidance | 7 | — | SSD available for placement |
| Fast startup disable | 8 (9200) | — | — (no Fast Startup in Win7) |

### Rollback Strategy

Every registry write must snapshot the existing value before modification. Key rollback pairs:

| Apply | Rollback |
|---|---|
| `SysMain Start=4` | `SysMain Start=2` |
| `WSearch Start=4` | `WSearch Start=2` |
| `disablelastaccess 1` | `disablelastaccess 0` |
| `8dot3name set 1` | `8dot3name set 0` |
| `MaintenanceDisabled=1` | delete value or set `=0` |
| `FTH Enabled=0` | `FTH Enabled=1` |
| `powercfg /h off` | `powercfg /h on` |
| `Disable-MMAgent -MemoryCompression` | `Enable-MMAgent -MemoryCompression` |

> **Note on 8.3 stripping:** The strip operation (`fsutil 8dot3name strip /s /f`) is NOT reversible — stripped names cannot be reconstructed. Only the "disable creation of new 8.3 names" is reversible. Clearly communicate this to the user before executing the strip.

### WMI / PowerShell Queries for Precondition Checks

```powershell
# Check if any HDDs present (for SysMain condition)
Get-PhysicalDisk | Where-Object { $_.MediaType -eq 'HDD' }

# Check SSD presence
Get-PhysicalDisk | Where-Object { $_.MediaType -eq 'SSD' -or $_.MediaType -eq 'NVMe' }

# Check current MMAgent state
Get-MMAgent

# Check current pagefile configuration
Get-WmiObject -Class Win32_PageFileUsage
Get-WmiObject -Class Win32_PageFileSetting

# Check TRIM status
fsutil behavior query DisableDeleteNotify

# View 8.3 global state
fsutil 8dot3name query
```

---

## 15. Topics NOT Covered by PC-Tuning Repo

The following topics were researched but are **not present** in the PC-Tuning repository — they would need supplementary sources:

- **Memory compression registry keys** (beyond `Disable-MMAgent -MemoryCompression`)
- **NTFS encryption (EFS) disabling** — not mentioned
- **USN Journal configuration** — not mentioned
- **Storage Spaces** — not mentioned
- **Storage Sense** (Windows 10+ automatic disk cleanup) — not mentioned (automatic maintenance coverage is separate)
- **Disk I/O priority via registry** (`HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile` IO priority) — not in this repo
- **Indexing service detailed tuning** (only service disable is covered)
- **AHCI link power management** (HIPM/DIPM) — not mentioned

These would require supplementary sources (e.g., BoringBoredom/PC-Optimization-Hub, Microsoft WHQL docs, Intel/AMD storage guides).
