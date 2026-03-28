# Harvest Report: valleyofdoom/PC-Tuning
Generated: 2026-03-26
Source: https://github.com/valleyofdoom/PC-Tuning
Pages crawled: 5 (README.md, docs/research.md, docs/configure-nvidia.md, docs/configure-amd.md, bin/registry-options.json)
Strategy: Deep multi-file crawl via GitHub raw API

---

## METHODOLOGY & CORE PHILOSOPHY

**Performance hierarchy (author's explicit ordering):** Hardware > BIOS > Operating System

Three cardinal rules:
1. Do NOT blindly trust anything (including this guide) — validate with evidence, research, and benchmarks.
2. Do NOT apply random undocumented changes without understanding security and performance impact.
3. Everything is "benchmark first, apply second."

Evidence-based approach: the guide avoids scripts where possible so users understand what changes are being made. Security flags (lock icon) and benchmark flags (chart icon) are used throughout to differentiate risk categories.

---

## 1. BIOS/UEFI RECOMMENDATIONS

### 1.1 General
- Reset BIOS to factory defaults before starting to ensure a clean slate.
- Use GPT/UEFI partition style (most compatible, required for ReBAR).
- Backup BIOS settings using SCEWIN (NVRAM dump) before any changes — loading saved profiles sometimes silently fails to restore all settings, so compare NVRAM exports via text diff tools.

### 1.2 Disable Unnecessary Devices
Rule: "If you're not using it, disable it." Physically disconnect components if possible.
Targets: WLAN, Bluetooth, High Definition Audio (if not using mobo audio), integrated graphics, unused SATA, RAM slots, onboard USB devices (LED controllers, IR receivers visible in USB Device Tree Viewer).

### 1.3 Resizable Bar (ReBAR)
- Requires GPT/UEFI mode and "Above 4G Decoding" enabled.
- Benchmark individually — can cause performance regression in some games.
- For unsupported boards: ReBarUEFI / NvStrapsReBar.
- Verify enabled status with GPU-Z.

### 1.4 Hyper-Threading / SMT
- If you have enough CPUs for your workload, consider disabling HT/SMT.
- Multiple execution threads per CPU increase contention on processor resources and are a potential source of latency/jitter.
- Benchmark: disabling increases OC potential due to lower temps; some games benefit, some regress.
- AVOID disabling idle states while HT/SMT is enabled — single-threaded performance typically suffers.

### 1.5 Power States
- Section marked "to be completed" in current version.

### 1.6 Virtualization / SVM Mode
- DISABLE Virtualization/SVM and Intel VT-d/AMD-Vi.
- Reason: memory access latency penalty (AMD EPYC tuning guide cites this), BCLK can fluctuate with SVM enabled.
- Exception: Vanguard/FACEIT anticheats may require Memory Integrity (HVCI) and/or Kernel DMA Protection, which requires virtualization.
- Verify virtualization status via Task Manager > CPU section.

### 1.7 Power-Saving Features
DISABLE all of the following:
- ASPM (Active State Power Management) — look for L0, L1 options.
- ALPM (Aggressive Link Power Management).
- Power/Clock Gating.
- Any option named "power management" or "power saving."

### 1.8 TPM (Trusted Platform Module)
- DISABLE. TPM can cause SMIs (System Management Interrupts) — high-priority unmaskable hardware interrupts that force the CPU to suspend all other activity including the OS.
- Exception: Vanguard/FACEIT on Windows 11 require TPM.
- Verify: `Win+R -> tpm.msc`

### 1.9 Secure Boot
- If not required by antiocheat (Vanguard, FACEIT, THE FINALS on Win11), disable.
- Verify: `Win+R -> msinfo32`

### 1.10 Fast Startup / Standby / Hibernate
- Disable S-States (S1/S2/S3/S4) in BIOS — look for "Suspend to RAM", "Fast Startup", S-State options.
- Goal: limit system power states to S0 (working) and S5 (soft off) for clean boots.
- S-State status: `powercfg /a` in CMD.
- Disable hiberfil.sys in Windows: `powercfg /h off`

### 1.11 Spread Spectrum
- DISABLE. Causes BCLK frequency deviation.
- Verify BCLK is at target (e.g. exactly 100.00 MHz, not 99.97 MHz) in CPU-Z.

### 1.12 Legacy USB Support
- DISABLE. Causes SMIs (same mechanism as TPM, from USB legacy emulation patents).
- Re-enable temporarily only for new OS installation or BIOS access with USB peripherals.

### 1.13 CSM (Compatibility Support Module)
- MBR/Legacy: enable CSM (only storage + PCIe OpROMs typically needed).
- GPT/UEFI: DISABLE CSM (exception: Windows 7 GPT/UEFI needs it unless using uefiseven).
- ReBAR: DISABLE CSM.

### 1.14 PCIe Link Speed
- Set to maximum supported (e.g. Gen 4.0 / expressed as GT/s value).
- Reduces unexpected behavior and issues.

### 1.15 Accessing Hidden BIOS Options
- Use UEFI-Editor to unlock hidden settings and reflash.
- Alternative: read/write NVRAM using GRUB (script generator: setupvar-builder) or SCEWIN without flashing.

### 1.16 BIOS Microcode
- On older platforms, microcode patches (Spectre/Meltdown mitigations) significantly impact performance.
- On modern platforms, less impactful.
- Can be manipulated with MMTool.
- Check version with CPU-Z validation feature.

### 1.17 Software Auto-Install
- DISABLE ASUS Armoury Crate, Gigabyte Control Center, MSI Center auto-install options.
- These are BIOS-level autorun options that install bloatware.

---

## 2. WINDOWS INSTALLATION

### 2.1 Windows Version Decision Matrix

| GPU | Minimum Windows Version |
|-----|------------------------|
| NVIDIA 10 series and lower | Almost all versions |
| NVIDIA 16, 20 series | Win7, Win8, Win10 1709+ |
| NVIDIA 30 series | Win7, Win10 1803+ |
| NVIDIA 40 series | Win10 1803+ |

Key version-specific notes:
- **Win10 1903+**: Updated scheduler for multi-CCX Ryzen.
- **Win10 2004+**: Timer resolution per-process change (calling process no longer affects global timer resolution). Breaking change for global high-res timer behavior.
- **Win10 2004+**: NVIDIA DCH drivers supported (1803+ actually, but note here).
- **Win10 2004+**: Hardware Accelerated GPU Scheduling (HAGS) — required for DLSS Frame Gen.
- **Win11+**: Updated scheduler for Intel 12th Gen+ (can be replicated manually with affinity policies on any Windows version).
- **Win11+**: Background process window message rate limited.
- **Win11 22H2+**: `GlobalTimerResolutionRequests` registry key available (restores pre-2004 global timer behavior).
- **Win Server 2022+**: Same `GlobalTimerResolutionRequests` support.

Recommendation: Windows 10 Professional or Windows Server Standard (Desktop Experience) for group policy support.

### 2.2 Installation Tips
- Disconnect Ethernet during install to force local account creation and prevent driver/update auto-install.
- For Win11: bypass NRO (Microsoft account requirement):
  ```
  [HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE]
  "BypassNRO"=dword:00000001
  ```
- Bypass Win11 hardware requirements during setup:
  ```
  [HKEY_LOCAL_MACHINE\SYSTEM\Setup\LabConfig]
  "BypassTPMCheck"=dword:00000001
  "BypassRAMCheck"=dword:00000001
  "BypassSecureBootCheck"=dword:00000001
  ```

### 2.3 8dot3 Filename Stripping (Performance + Security)
Must be done before booting (post-install, pre-restart):
```bat
fsutil.exe 8dot3name set <drive letter> 1
fsutil.exe 8dot3name strip /s /f <drive letter>
```
After booting:
```bat
fsutil 8dot3name set 1
fsutil behavior set disablelastaccess 1
```

---

## 3. REGISTRY TWEAKS

### 3.1 Registry Options Script
Script: `C:\bin\apply-registry.ps1`
Config: `C:\bin\registry-options.json` (set options to true/false)

Full option list with default values:

| Option | Default |
|--------|---------|
| disable windows update | false |
| disable automatic windows updates | true |
| disable driver installation via windows update | true |
| disable automatic store app updates | true |
| disable windows defender | true |
| disable gamebarpresencewriter | true |
| disable background apps | true |
| disable transparency effects | true |
| disable notifications network usage | true |
| disable windows marking file attachments with zone of origin | true |
| disable malicious software removal tool updates | true |
| disable sticky keys | true |
| disable pointer acceleration | true |
| disable fast startup | true |
| disable customer experience improvement program | true |
| disable windows error reporting | true |
| disable clipboard history | true |
| disable activity feed | true |
| disable advertising id | true |
| disable autoplay | true |
| disable cloud content | true |
| disable suggestions and web results in search | true |
| disable sending inking and typing data to microsoft | true |
| disable automatic maintenance | true |
| disable computer is out of support message | true |
| disable fault tolerant heap | true |
| disable sign-in and lock last interactive user after restart | true |
| show file extensions | true |
| disable widgets | true |
| disable remote assistance | true |
| disable telemetry | true |
| disable retrieval of online tips and help | true |
| disable typing insights | true |

### 3.2 Key Individual Registry Entries

**Disable Fault Tolerant Heap** (prevents Windows auto-applying per-app crash mitigations):
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\FTH]
"Enabled"=dword:00000000
```

**Disable Windows Defender** (via policy):
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows Defender]
"DisableAntiSpyware"=dword:00000001
```

**Disable Windows Update (completely)**:
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate]
"DisableWindowsUpdateAccess"=dword:00000001
```

**Disable Driver Installation via Windows Update**:
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate]
"ExcludeWUDriversInQualityUpdate"=dword:00000001
```

**Disable Telemetry**:
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DataCollection]
"AllowTelemetry"=dword:00000000
```

**Disable Pointer Acceleration**:
```
[HKEY_CURRENT_USER\Control Panel\Mouse]
"MouseSpeed"="0"
"MouseThreshold1"="0"
"MouseThreshold2"="0"
```

**Disable Fast Startup**:
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Power]
"HiberbootEnabled"=dword:00000000
```

**Disable Transparency Effects**:
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize]
"EnableTransparency"=dword:00000000
```

**Disable GameBarPresenceWriter**:
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\GameDVR]
"AllowGameDVR"=dword:00000000
```

**Disable Background Apps**:
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy]
"LetAppsRunInBackground"=dword:00000002
```

**Disable Sticky Keys**:
```
[HKEY_CURRENT_USER\Control Panel\Accessibility\StickyKeys]
"Flags"="506"
```

**Show File Extensions**:
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"HideFileExt"=dword:00000000
```

**Disable Zone Attachment (file blocking warnings)**:
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Attachments]
"SaveZoneInformation"=dword:00000001
```

### 3.3 GlobalTimerResolutionRequests (Win11+ / Server 2022+)
Restores pre-Win10 2004 behavior where one process raising timer resolution affects all processes globally:
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\kernel]
"GlobalTimerResolutionRequests"=dword:00000001
```
NOTE: Only works on Windows 11+ and Server 2022+. On Windows 10 2004-22H2, this entry does not exist in ntoskrnl.exe and has NO effect.

### 3.4 Disable HVCI (Memory Integrity)
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" /v "Enabled" /t REG_DWORD /d "0" /f
```

### 3.5 Disable MSIsadrv (IRQ Sharing Fix)
If System timer and HPET share IRQ 0, disable PCI standard ISA bridge driver:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\msisadrv" /v "Start" /t REG_DWORD /d "4" /f
```
WARNING: Breaks keyboard on mobile/laptop devices.

### 3.6 Disable Vulnerable Driver Blocklist (for RWEverything/XHCI IMOD)
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\CI\Config" /v "VulnerableDriverBlocklistEnable" /t REG_DWORD /d "0" /f
```

### 3.7 Game Mode / Game DVR Registry
Enable Game Bar:
```bat
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d "1" /f
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d "1" /f
```
Disable Game Bar:
```bat
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d "0" /f
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d "0" /f
```

### 3.8 Presentation Mode / Legacy Flip
For Hardware: Legacy Flip mode:
```bat
reg add "HKCU\SYSTEM\GameConfigStore" /v "GameDVR_DXGIHonorFSEWindowsCompatible" /t REG_DWORD /d "1" /f
reg add "HKCU\SYSTEM\GameConfigStore" /v "GameDVR_FSEBehavior" /t REG_DWORD /d "2" /f
```
Disable MPOs (if stuck on Hardware Composed: Independent Flip):
```bat
reg add "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /t REG_DWORD /d "5" /f
```

### 3.9 QoS Policy Registry Fix
Ensures DSCP tagging works correctly with multiple NICs or outside domain:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_SZ /d "1" /f
```

### 3.10 NTFS Last Access Timestamp
```bat
fsutil behavior set disablelastaccess 1
```

### 3.11 Background Window Message Rate (Win11 22H2+)
```
[HKEY_CURRENT_USER\Control Panel\Mouse]
"RawMouseThrottleDuration"=dword:00000008  ; range: 0x3 to 0x14
```
Default is ~8ms/125Hz. Affects background process window message rate.

### 3.12 Win11 OOBE Bypass
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE]
"BypassNRO"=dword:00000001
```

### 3.13 Disable Superfetch/SysMain
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v "Start" /t REG_DWORD /d "4" /f
```

### 3.14 Disable Windows Search Indexing
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" /v "Start" /t REG_DWORD /d "4" /f
```

### 3.15 SmartScreen Removal (if Defender disabled)
Open CMD as TrustedInstaller (via MinSudo.exe):
```bat
taskkill /f /im smartscreen.exe > nul 2>&1 & ren C:\Windows\System32\smartscreen.exe smartscreen.exee
```

### 3.16 OneDrive Removal
```bat
for %a in ("SysWOW64" "System32") do (if exist "%windir%\%~a\OneDriveSetup.exe" ("%windir%\%~a\OneDriveSetup.exe" /uninstall)) && reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" /f
```

### 3.17 NVIDIA GPU P-State Lock (Force P-State 0)
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableDynamicPstate" /t REG_DWORD /d "1" /f
```
Increases idle temperatures and power consumption. Requires reboot.

### 3.18 GPU Scaling (Identity Scaling)
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Configuration\<id>]
"Scaling"=dword:00000001
```
Values: 1=Identity, 2=Centered (No scaling), 3=Full-screen, 4=Aspect ratio, 5=Custom, 128=Preferred.
NOTE: Setting to 1 does NOT guarantee identity scaling if non-native resolution is configured via GPU Control Panel (only works correctly with CRU custom resolutions).

---

## 4. BCDEDIT COMMANDS

### 4.1 TSC Sync Policy
```bat
bcdedit.exe /deletevalue tscsyncpolicy       ; Windows default (value 0)
bcdedit.exe /set tscsyncpolicy default       ; Same as deletevalue (value 0)
bcdedit.exe /set tscsyncpolicy legacy        ; value 1
bcdedit.exe /set tscsyncpolicy enhanced      ; value 2
```
Research finding: Despite widespread claims that "enhanced" is the default, kernel debugging confirms that Windows uses value 0 (same as "default"). Enhanced is NOT the default. Further research needed on what "default" (value 0) maps to exactly.

---

## 5. CPU SCHEDULING & PROCESS PRIORITY

### 5.1 Win32PrioritySeparation
Path: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\PriorityControl`
Key: `Win32PrioritySeparation`

The registry key only reads the first 6 bits of input (bitmask). Values above 63 (0x3F) simply recycle as lower values — there's no special behavior.

Documented valid values (consistent between client and server editions):

| Hex | Decimal | Interval | Length | PsPrioritySeparation |
|-----|---------|----------|--------|----------------------|
| 0x14 | 20 | Long | Variable | 0 |
| 0x15 | 21 | Long | Variable | 1 |
| 0x16 | 22 | Long | Variable | 2 |
| 0x18 | 24 | Long | Fixed | 0 |
| 0x19 | 25 | Long | Fixed | 1 |
| 0x1A | 26 | Long | Fixed | 2 |
| 0x24 | 36 | Short | Variable | 0 |
| 0x25 | 37 | Short | Variable | 1 |
| 0x26 | 38 | Short | Variable | 2 |
| 0x28 | 40 | Short | Fixed | 0 |
| 0x29 | 41 | Short | Fixed | 1 |
| 0x2A | 42 | Short | Fixed | 2 |

Windows default: 0x2 (decimal 2) = Short, Variable, 3:1 ratio.
Note: PsPrioritySeparation also controls priority boost magnitude for foreground threads (beyond just quantum). A fixed 3:1 quantum has perceivable difference vs. 1:1 even without a foreground boost.
Note: Win11 24H2 changed this table.

### 5.2 Process Affinity — Starting with Specified Affinity
```bat
start /affinity 0x6 notepad.exe   ; Start with CPU 1+2 affinity
```

### 5.3 Setting Affinity on Running Processes (PowerShell)
```powershell
Get-Process @("svchost", "audiodg") -ErrorAction SilentlyContinue | ForEach-Object { $_.ProcessorAffinity=0x8 }
```
Place in script and run at startup via Task Scheduler.

### 5.4 Device Power Saving — Disable for All Devices
```powershell
Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | ForEach-Object { $_.enable = $false; $_.psbase.put(); }
```
Run at startup via Task Scheduler — re-plugging devices can re-enable the option.

### 5.5 Memory Management (PowerShell)
```powershell
Get-MMAgent                    ; Review current settings
Disable-MMAgent -MemoryCompression
```
If Superfetch/Prefetch are disabled, also disable prefetching-related MMAgent settings.

---

## 6. KERNEL-MODE SCHEDULING (Interrupts, DPCs)

### 6.1 Philosophy
- Windows schedules interrupts and DPCs on CPU 0 by default for kernel-mode modules.
- Many modules on one CPU = increased overhead + jitter from resource contention.
- Fix: configure affinities to isolate modules from each other and service time-sensitive modules on underutilized CPUs.

### 6.2 Tooling for DPC/ISR Analysis
- **xperf DPC/ISR report**: run `xperf-dpcisr.bat` then read `C:\report.txt`
  ```bat
  xperf -on PROC_THREAD+LOADER+INTERRUPT+DPC
  timeout -t 10
  xperf -stop
  xperf -i "C:\kernel.etl" -o "C:\report.txt" -a dpcisr
  ```
- **xtw** (alternative viewer): https://github.com/valleyofdoom/xtw

### 6.3 Ensuring DPC/ISR Co-location
- Verify that each DPC is processed on the same CPU as its triggering ISR.
- Mismatched CPU DPC/ISR processing introduces inter-processor communication overhead and cache coherence penalty.

### 6.4 GPU/DirectX Graphics Kernel Affinity
- Use **AutoGpuAffinity** (https://github.com/valleyofdoom/AutoGpuAffinity) to benchmark which CPUs are most performant for GPU-related kernel modules.
- Configure `custom_cpus` in config for P-Cores/CCX selection.

### 6.5 XHCI and Audio Controller
- These generate substantial interrupts during user interaction.
- Isolate to an underutilized CPU to reduce contention.
- Tools: Microsoft Interrupt Affinity Tool, GoInterruptPolicy.

### 6.6 NIC / RSS
- NIC must support MSI-X for RSS to work properly.
- RSS base CPU migrates DPC/ISR for the NIC driver.
- RSS queues = consecutive CPUs from base. Example: RSS base=2, 4 queues → CPUs 2/3/4/5 (or 2/4/6/8 with HT/SMT).
- Research finding: in gaming scenarios (e.g. Valorant at ~300KB/s), only 1 RSS queue/CPU is actually used. At 1Gbps load, both CPU 0 and CPU 1 used with 2 queues.
- Conclusion: 2 RSS queues is sufficient for gaming. More doesn't hurt but reserving CPUs exclusively for NIC when 1 is sufficient wastes resources.

---

## 7. MESSAGE SIGNALED INTERRUPTS (MSI)

### 7.1 Why MSI
- MSIs are faster than line-based interrupts.
- Resolve IRQ sharing — a common cause of high interrupt latency and instability.
- Shared IRQ check: `Win+R -> msinfo32 -> Conflicts/Sharing`.

### 7.2 How to Enable
- Tools: **MSI Utility** (Guru3D) or **GoInterruptPolicy**.
- MSI capable devices can have MSI enabled. Note: NVIDIA selectively enables MSIs per architecture.
- WARNING: Enabling MSI on the stock Windows 7 SATA driver causes BSOD (update the SATA driver first).
- Verification: device has a negative IRQ in MSI Utility after reboot.

### 7.3 IRQ 0 Sharing Fix
If System timer and HPET share IRQ 0:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\msisadrv" /v "Start" /t REG_DWORD /d "4" /f
```
Disables PCI standard ISA bridge. WARNING: breaks keyboard on laptops/mobile devices.

---

## 8. XHCI INTERRUPT MODERATION (IMOD)

### 8.1 What It Is
IMOD creates a buffer period after an interrupt is generated during which the XHCI controller waits for more data before generating another interrupt.
- Windows 7 default: 1ms IMOD interval.
- Windows 8+: 0.05ms (50us) IMOD interval.
- Problem: during gaming with keyboard + mouse + audio interaction, interrupts easily exceed 1000/s. With 1ms IMOD, mouse data from 8kHz polling (0.125ms period) is severely bottlenecked — data within the buffer window is lost.

### 8.2 Disabling IMOD
Use `XHCI-IMOD-Interval.ps1` script (sets interval to 0x0 for all interrupters on all XHCI controllers).

To run at startup via Task Scheduler:
```bat
PowerShell C:\XHCI-IMOD-Interval.ps1
```

Prerequisite: RWEverything (`Rw.exe`) must be installed at `C:\Program Files\RW-Everything\Rw.exe`.

May need to disable Vulnerable Driver Blocklist:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\CI\Config" /v "VulnerableDriverBlocklistEnable" /t REG_DWORD /d "0" /f
```
NOTE: Some anticheats don't adhere to disabling the blocklist. Test whether game launches.

Verification test: temporarily set interval to `0xFA00` (62.5Hz) — if mouse cursor visibly stutters, changes are taking effect.

### 8.3 IMOD Script Details
The script uses `RWEverything` CLI to write directly to XHCI hardware registers:
- Reads HCSPARAMS to determine number of interrupters per controller.
- Reads RTSOFF to find runtime register base address.
- Writes desired interval to each interrupter's IMOD register.
- Supports per-controller overrides via `$userDefinedData` hash (by DEV_XXXX hardware ID).
- Global defaults: `$globalInterval = 0x0`, `$globalHCSPARAMSOffset = 0x4`, `$globalRTSOFF = 0x18`.

---

## 9. CPU IDLE STATES

### 9.1 Behavior
- Disabling idle states forces C-State 0 (no power gating).
- Microsoft recommends this for real-time performance devices.
- Effect: eliminates delay when a CPU that was in a deep C-state receives a new task.
- Cost: higher temperatures and power consumption.

### 9.2 Commands

Enable idle states (default):
```bat
powercfg /setacvalueindex scheme_current sub_processor 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 && powercfg /setactive scheme_current
```

Disable idle states (force C-State 0):
```bat
powercfg /setacvalueindex scheme_current sub_processor 5d76a2ca-e8c0-402f-a133-2158492d58ad 1 && powercfg /setactive scheme_current
```

### 9.3 Caveats
- If not using a static CPU frequency, assess boosting behavior first. Do NOT disable idle states when relying on PBO/Turbo Boost — these features need C-state transitions.
- AVOID disabling idle states with HT/SMT enabled (single-threaded performance typically degrades).
- Process Explorer shows 100% CPU utilization with idle states disabled (this is normal — Task Manager lies about this).

---

## 10. TIMER RESOLUTION

### 10.1 Background
- Default system clock interrupt: 64Hz = 15.625ms period.
- Maximum resolution: 2kHz = 0.5ms period.
- Applications can request higher resolution via `timeBeginPeriod()` or `NtSetTimerResolution()`.
- Win10 2004+ change: resolution requests are per-process only (no longer global). Background processes stay at 15.625ms even if foreground requests 0.5ms.
- Win11+: further restriction — calling process's resolution not honored if window is minimized/occluded.

### 10.2 GlobalTimerResolutionRequests (Restoring Global Behavior)
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\kernel]
"GlobalTimerResolutionRequests"=dword:00000001
```
- Only works on Windows 11+ and Windows Server 2022+.
- Confirmed NOT present in ntoskrnl for Win10 2004–22H2.
- Confirmed by reading `KiGlobalTimerResolutionRequests` in WinDbg.
- On Win11: also need `SetProcessInformation(PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION)` in the requesting process to prevent the resolution being reset when the window is minimized.
- Windows Server 2022 has this key set to 1 by default.

### 10.3 Micro-Adjusting Timer Resolution
Research finding: 0.5ms is NOT always the most precise resolution. Testing showed:
- Requesting 0.507ms gave consistently lower Sleep(1) deltas than requesting 0.500ms on most test systems.
- 0.500ms delta: ~0.496–0.498ms
- 0.507ms delta: ~0.011–0.013ms (significantly more precise)

Use `micro-adjust-benchmark.ps1` from valleyofdoom/TimerResolution repo to automate finding the sweet spot. Run under load (idle benchmarks are misleading).

### 10.4 Recommendation
- Favor per-process (non-global) implementation where possible.
- Use RTSS (RivaTuner Statistics Server) for precise framerate limiting (hybrid-wait = high precision without global timer overhead).
- Note: RTSS can introduce noticeably higher latency. Compare against micro-adjusted global resolution.

### 10.5 View Current Timer Resolution
Tool: ClockRes (Microsoft Sysinternals).

---

## 11. NETWORK OPTIMIZATIONS

### 11.1 NetBIOS Disable
Disable NetBIOS over TCP/IP for all network adapters:
Location: `ncpa.cpl -> Adapter Properties -> IPv4 Properties -> Advanced -> WINS -> Disable NetBIOS over TCP/IP`
Reason: prevents unnecessary listening on ports 137–139.
NOTE: Must be done for each newly installed NIC.

### 11.2 Unused Network Adapter Disable
Disable all unused network adapters in `ncpa.cpl`.

### 11.3 NIC Properties — Power Saving
In Device Manager: Network adapters > Properties > Advanced — disable all power-saving features.

### 11.4 NIC Driver — Power Saving
In Device Manager: Network adapters > Properties > Power Management — uncheck "Allow the computer to turn off this device to save power."

### 11.5 QoS DSCP Policies
Set DSCP 46 (Expedited Forwarding) for game processes in Group Policy:
- Computer Configuration > Windows Settings > Policy-based QoS
- Verify with Microsoft Network Monitor 3.4:
  - Capture packets from game, check `DifferentiatedServices Field: DSCP: 46, ECN: 0` in IPv4 headers.

Registry fix for DSCP tagging with multiple NICs:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_SZ /d "1" /f
```

### 11.6 RSS Configuration
- Verify NIC supports MSI-X (required for RSS to function).
- Configure RSS base CPU and queue count.
- Research: gaming workloads use at most 2 RSS queues. Don't over-allocate.
- See: github.com/Duckleeng/TweakCollection for RSS configuration.

### 11.7 Bufferbloat Reduction
- Test: Waveform Bufferbloat Test (waveform.com/tools/bufferbloat).
- Fix: router-level QoS, FQ-CoDel, or similar AQM algorithms.
- Resources: bufferbloat.net, stoplagging.com.

---

## 12. WINDOWS SERVICES

### 12.1 Service Dependency Warning
ALWAYS run `sc EnumDepend <service>` before disabling a service to check for dependent services that will break.

### 12.2 Services to Disable

**SysMain (Superfetch)** — disable if no HDD:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v "Start" /t REG_DWORD /d "4" /f
```
In Microsoft's recommendations for real-time performance devices.

**WSearch (Windows Search / Indexing)**:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" /v "Start" /t REG_DWORD /d "4" /f
```
Reason: indexing causes periodic notable CPU overhead.

**msisadrv** (PCI ISA bridge — only if System timer/HPET share IRQ 0):
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\msisadrv" /v "Start" /t REG_DWORD /d "4" /f
```
WARNING: breaks keyboard on mobile devices.

### 12.3 Windows Server — Required Service Enablement
- `Windows Audio` and `Windows Audio Endpoint Builder`: set to Automatic startup.
- `Wireless LAN Service`: install via Server Manager if Wi-Fi needed.

---

## 13. GPU CONFIGURATION

### 13.1 NVIDIA

**Driver Installation:**
- Strip driver package to: Display.Driver, NVI2, EULA.txt, ListDevices.txt, setup.cfg, setup.exe.
- Remove consent/privacy files from setup.cfg before installing.
- DCH drivers: Windows 10 1803+.

**NVIDIA Control Panel — 3D Settings:**
- Low Latency Mode: On
- Power Management Mode: Prefer Maximum Performance
- Shader Cache Size: Unlimited
- Texture Filtering Quality: High Performance
- Threaded Optimization: Benchmark individually (may impact frame pacing)
- Check that Program Settings tab isn't overriding Global Settings.

**Display:**
- Output Dynamic Range: Full
- Video Dynamic Range: Full

**NVIDIA Profile Inspector:**
- Disable "Enable Ansel" (prevents driver injection conflicts).
- Disable "CUDA - Force P2 State" to prevent memory clock downclocking during load.
- Optionally experiment with Resizable BAR forcing on unsupported games.

**P-State Lock (Force P0):**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableDynamicPstate" /t REG_DWORD /d "1" /f
```

### 13.2 AMD
- Install stripped display driver from `Packages\Drivers\Display\XXXX_INF`.
- Install Radeon software via `ccc-next64.msi`.
- Disable via Autoruns: "AMD Crash Defender", "AMD External Events Utility" (NOTE: required for VRR).
- Guide section marked as potentially incomplete/unmaintained (author no longer uses AMD GPU).
- Reference: Calypto's Latency Guide as alternative.

---

## 14. HARDWARE OVERCLOCKING

### 14.1 GPU Overclocking
- May require flashing BIOS with higher power limit or raising power limits.
- Disable "CUDA - Force P2 State" in NVIDIA Profile Inspector during stress-testing to prevent memory downclocking.
- References: Cancerogeno guide, LunarPSD/NvidiaOverclocking.

### 14.2 RAM/CPU Overclocking
- Configure RAM frequency and timings manually (XMP does not tune many timings nor guarantee stability).
- DDR4 guides: Eden's DDR4 guide, KoTbelowall/INTEL-DDR4-RAM-OC-GUIDE-by-KoT, integralfx/MemTestHelper.
- Use static all-core CPU frequencies and voltages to eliminate jitter from frequency transitions.
- AMD alternative: Precision Boost Overdrive (PBO).
- RAM overclock and CPU overclock interact — re-run RAM stability tests after CPU adjustments.
- Favor CPUs on a single CCX/CCD to avoid inter-CCX latency penalty.

### 14.3 Load-Line Calibration
- Informational only — not a specific recommendation.
- Reference: ElmorLabs VRM Load-Line Visualized, xDevs Vdroop guide, buildzoid's Vdroop video.

### 14.4 Stability Testing Tools
- StresKit (bootable): https://github.com/valleyofdoom/StresKit
- Linpack (via StresKit, Linpack-Extended, Linpack Xtreme Bootable): use range of memory sizes, match residuals.
- Prime95
- FIRESTARTER
- y-cruncher
- HCI MemTest, MemTest86 (bootable), MemTest86+ (bootable)
- UNIGINE Superposition
- OCCT
- memtest_vulkan (VRAM testing)

---

## 15. SPECTRE/MELTDOWN MITIGATIONS

- Disabling = age-old performance trick but newer architectures (Zen 4) can show regression.
- Use InSpectre tool to toggle.
- Alternatively rename microcode DLLs (requires TrustedInstaller elevation):
  ```bat
  C:\bin\MinSudo.exe --TrustedInstaller --Privileged
  ren C:\Windows\System32\mcupdate_GenuineIntel.dll mcupdate_GenuineIntel.dlll
  ren C:\Windows\System32\mcupdate_AuthenticAMD.dll mcupdate_AuthenticAMD.dlll
  ```
- Note: Meltdown does not affect AMD.
- Note: FACEIT antiocheat requires Meltdown mitigations enabled.
- Verify with InSpectre and CPU-Z validation before and after reboot.

---

## 16. RESERVED CPU SETS (Windows 10+)

Tool: ReservedCpuSets (https://github.com/valleyofdoom/ReservedCpuSets)

Purpose: prevent Windows routing ISRs, DPCs, and other threads to specific CPUs.

Use cases:
1. Reserve E-Cores or specific CCX/CCD so tasks default to P-Cores (hint only, soft policy).
2. Reserve CPUs that have specific IRQ/DPC modules assigned to them.

Caveats:
- CPU sets are SOFT policies — a CPU-intensive stress-test will use reserved cores if needed.
- Do NOT mix reserved and unreserved CPUs in a single process affinity — unexpected behavior.
- Process and thread affinity + interrupt affinity policies have HIGHER precedence than CPU sets.
- Can degrade performance if over-reserved (scheduler or applications can still target reserved cores if `RealTime=1` in SYSTEM_CPU_SET_INFORMATION).
- Benchmark extensively — even reserving E-Cores can regress performance.

---

## 17. VIRTUALIZATION-BASED SECURITY (VBS)

VBS and HVCI negatively impact performance (Tom's Hardware benchmarks confirmed).

Disable HVCI:
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" /v "Enabled" /t REG_DWORD /d "0" /f
```
Disable VBS: Settings > Windows Security > Device Security > Core Isolation > Memory Integrity (OFF).

Note: VBS/HVCI auto-re-enable when virtualization is enabled in BIOS. Some anticheats (Vanguard, FACEIT) require them.

---

## 18. POWER OPTIONS

Section marked "to be completed" in current README. General guidance:
- Disable Fast Startup (registry + powercfg).
- Disable hibernate: `powercfg /h off`
- Disable idle states if static CPU frequency is used.
- Apply Power Plan via GUI or powercfg.

---

## 19. AUDIO CONFIGURATION

- Disable unused Playback and Recording devices in `mmsys.cpl`.
- AVOID audio enhancements (benchmarks show minor but measurable CPU overhead).
- Communications tab: set to "Do nothing" to prevent automatic audio ducking.
- Minimize audio buffer size: LowAudioLatency tool (https://github.com/spddl/LowAudioLatency) or DAC settings.
- WARNING: too-small buffer causes audio dropouts under CPU load.

---

## 20. DISPLAY / RESOLUTION

- Use exact integer refresh rates (60.00Hz, 240.00Hz — NOT 59.94/239.76).
- For non-native resolution: favor display scaling over GPU scaling.
- Identity scaling (actual no-scaling): only occurs when desktop = monitor native resolution.
- Setting `Scaling=1` in registry does NOT guarantee identity scaling with non-native resolution via GPU Control Panel — must use CRU custom resolution.
- Verify scaling mode: QueryDisplayScaling tool.
- Framerate cap: set at monitor refresh rate multiple to prevent frame mistiming (calculator: boringboredom.github.io/tools/fpscapcalculator).

---

## 21. FRAMERATE LIMITING

- RTSS (RivaTuner Statistics Server): hybrid-wait, high precision, but adds noticeably higher latency vs. passive limiter.
- In-game limiters: typically adequate precision if game uses proper sleep-based pacing.
- NVIDIA Reflex: dynamic framerate limiter in GPU-intensive scenarios — reduces render queue depth. May cause minor stuttering. Benchmark before enabling.
- Keep GPU utilization below 100% — high GPU utilization increases system latency.
- Cap at monitor refresh rate multiple to avoid rolling tearline.

---

## 22. DEVICE MANAGER CONFIGURATION

- Disk drives: enable write-cache buffer flushing control (disable flushing if protected by UPS).
- Network adapters: disable power-saving in Properties > Advanced.
- View by connection: disable PCIe/SATA/NVMe/XHCI controllers and USB hubs with nothing connected.
- View by connection: disable every device on the same PCIe port as GPU (except GPU itself).
- View by resources: disable unneeded IRQ/I/O resource consumers.
- Use DeviceCleanup to remove hidden (phantom) devices.

---

## 23. UNIQUE/ADVANCED TWEAKS NOT IN TYPICAL DEBLOATERS

These are not commonly found in standard debloat scripts:

1. **XHCI IMOD Interval** — direct hardware register write to disable USB interrupt moderation. Not a registry or driver setting.

2. **XHCI controller-level interrupt affinity** — separate from normal MSI affinity, needed for 8kHz mouse and high-rate USB devices.

3. **Micro-adjusting timer resolution** — requesting 0.507ms instead of 0.500ms for lower actual Sleep deltas. Requires benchmarking per-system.

4. **TSC Sync Policy research** — documented proof that "enhanced" is NOT the Windows default (contradicts widespread claims). Default = value 0.

5. **Win32PrioritySeparation bitmask research** — documented that values >63 are simply recurring lower values due to 6-bit reads. Demystifies ambiguous "high performance" registry values circulating online.

6. **msisadrv disable for IRQ 0 sharing** — specific fix for System timer/HPET IRQ 0 conflict via PCI ISA bridge driver disable.

7. **GlobalTimerResolutionRequests** — kernel-level global timer behavior restoration on Win11+ only. Verified via WinDbg kernel debugging that the entry doesn't exist in Win10 kernels.

8. **ReservedCpuSets** — Windows 10+ CPU set reservation API. Soft policy for CPU isolation without requiring affinity mask on every process.

9. **AutoGpuAffinity** — automated benchmarking tool to find optimal CPU for GPU kernel module scheduling.

10. **8dot3 filename stripping** — must be done before first boot for full effect. Improves file system performance and security.

11. **DISM Apply-Image install** (no USB) — installs Windows to new partition from existing Windows without USB media using `DISM /Apply-Image` + `bcdboot`.

12. **Identity scaling via CRU** — using Custom Resolution Utility to achieve true identity scaling (DISPLAYCONFIG_SCALING_IDENTITY = 1) at non-native resolutions, not achievable through GPU Control Panel alone.

13. **Fault Tolerant Heap disable** — prevents Windows silently applying compatibility shims to crashing applications, which can interfere with game performance.

14. **Background Window Message Rate** (Win11 22H2+) — `RawMouseThrottleDuration` registry value controls how often background windows receive mouse events.

15. **SetProcessInformation PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION** — Win11 API to prevent timer resolution being dropped when process is minimized. Required alongside GlobalTimerResolutionRequests on Win11.

---

## TOOLS REFERENCED

| Tool | Purpose |
|------|---------|
| AutoGpuAffinity | Benchmark GPU kernel module CPU affinity |
| GoInterruptPolicy | MSI + interrupt affinity configuration |
| MSI Utility (Guru3D) | MSI enable/check + IRQ viewer |
| ReservedCpuSets | CPU set reservation |
| XHCI-IMOD-Interval.ps1 | Disable XHCI interrupt moderation |
| xperf-dpcisr.bat | DPC/ISR latency profiling report |
| xtw | Alternative xperf DPC/ISR viewer |
| Process Explorer | Replace Task Manager, true CPU % |
| ClockRes | View min/current/max timer resolution |
| TimerResolution (valleyofdoom) | Set + measure timer resolution precision |
| InSpectre | Toggle Spectre/Meltdown mitigations |
| UEFI-Editor / SCEWIN / GRUB | Unlock hidden BIOS settings / NVRAM access |
| CRU (Custom Resolution Utility) | Custom monitor timings + identity scaling |
| QueryDisplayScaling | Check actual OS scaling mode in use |
| AppxPackagesManager | Manage/uninstall Appx packages |
| Autoruns | Startup program management |
| MSI Afterburner | GPU OC + static fan speed |
| LowAudioLatency | Minimize audio buffer size |
| TCPView / Wireshark | Network port monitoring |
| GPU-Z | Verify ReBAR, PCIe link width/speed |
| HWiNFO | C-State monitoring, PCIe Bus info |
| CPU-Z | BCLK, microcode version validation |
| MinSudo.exe | Elevate to TrustedInstaller |
| DeviceCleanup | Remove phantom/hidden devices |
| RWEverything (Rw.exe) | Read/write hardware registers (XHCI IMOD) |
| Bulk-Crap-Uninstaller | Thorough program removal |
| CrystalDiskInfo / CrystalDiskMark | Storage health + benchmark |
| TaskSchedulerView (NirSoft) | Assess scheduled tasks |

---

## SOURCES

- https://github.com/valleyofdoom/PC-Tuning
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/README.md
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/docs/research.md
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/docs/configure-nvidia.md
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/docs/configure-amd.md
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/bin/registry-options.json
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/bin/XHCI-IMOD-Interval.ps1
- https://raw.githubusercontent.com/valleyofdoom/PC-Tuning/main/bin/xperf-dpcisr.bat
