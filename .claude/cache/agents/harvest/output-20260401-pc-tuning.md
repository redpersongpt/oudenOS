# Harvest Report: valleyofdoom/PC-Tuning
**Generated:** 2026-04-01
**Source:** https://github.com/valleyofdoom/PC-Tuning
**Pages crawled:** 7 (README.md, docs/registry-opts.md, docs/configure-nvidia.md, docs/configure-amd.md, docs/image-customization.md, docs/research.md, bin/registry-options.json)
**Strategy:** Deep crawl — raw GitHub files downloaded and read in full

---

> CRITICAL DISCLAIMER (from source):
> "Do NOT blindly trust or believe everything you read online (including this resource). Validate statements through evidence, research and benchmarks."
> "Do NOT apply random, unknown or undocumented changes without a comprehensive understanding of what they are changing and impact they have on security, privacy and performance."

---

## Table of Contents
1. [Privacy](#1-privacy)
2. [Performance](#2-performance)
3. [Services](#3-services)
4. [Network](#4-network)
5. [Gaming](#5-gaming)
6. [Power](#6-power)
7. [Security](#7-security)
8. [Debloat](#8-debloat)
9. [BIOS/UEFI Settings](#9-biosuefi-settings)
10. [GPU Configuration — NVIDIA](#10-gpu-configuration--nvidia)
11. [GPU Configuration — AMD](#11-gpu-configuration--amd)
12. [File System Optimizations](#12-file-system-optimizations)
13. [Kernel Scheduling & Interrupts](#13-kernel-scheduling--interrupts)
14. [Timer Resolution & Clock Interrupts](#14-timer-resolution--clock-interrupts)
15. [CPU Idle States](#15-cpu-idle-states)
16. [Memory Management](#16-memory-management)
17. [Presentation Mode & Game Bar](#17-presentation-mode--game-bar)

---

## 1. PRIVACY

### 1.1 Disable Telemetry
**What it does:** Disables DiagTrack service (Connected User Experiences and Telemetry), limits data collection levels, disables PowerShell telemetry opt-out.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Environment]
"POWERSHELL_TELEMETRY_OPTOUT"="1"

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\DiagTrack]
"Start"=dword:00000004

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DataCollection]
"AllowTelemetry"=dword:00000000           ; Win10+ only (Enterprise/Education/Server editions)
"LimitDiagnosticLogCollection"=dword:00000001  ; Win10 18363+
"LimitDumpCollection"=dword:00000001           ; Win10 18363+
"LimitEnhancedDiagnosticDataWindowsAnalytics"=dword:00000000  ; Win10 16299+
"DoNotShowFeedbackNotifications"=dword:00000001  ; Win10+
```
**Why it matters:** Eliminates background CPU/network usage for telemetry uploads and Microsoft data collection.
**Risk level:** Safe
**Reversible:** Yes — delete the keys or set values back
**Windows versions:** 10/11 (AllowTelemetry=0 requires Enterprise/Education/Server edition; Home/Pro can only go to 1)

---

### 1.2 Disable Advertising ID
**What it does:** Prevents Windows from assigning and using an advertising ID to track app usage and interests.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo]
"DisabledByGroupPolicy"=dword:00000001   ; Win8.1+
```
**Why it matters:** Prevents personalized advertising tracking across applications.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 8.1, 10, 11

---

### 1.3 Disable Activity Feed (Timeline)
**What it does:** Disables Windows Timeline/Activity Feed that records and syncs activity history.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\System]
"EnableActivityFeed"=dword:00000000    ; Win10+
"PublishUserActivities"=dword:00000000 ; Win10+
"UploadUserActivities"=dword:00000000  ; Win10+
```
**Why it matters:** Stops activity from being recorded locally and synced to Microsoft servers.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 1.4 Disable Clipboard History
**What it does:** Prevents Windows from storing a history of clipboard contents and syncing it across devices.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\System]
"AllowClipboardHistory"=dword:00000000      ; Win10+
"AllowCrossDeviceClipboard"=dword:00000000  ; Win10+
```
**Why it matters:** Clipboard data can include sensitive information; sync poses privacy risk.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 1.5 Disable Customer Experience Improvement Program (CEIP)
**What it does:** Opts out of Microsoft's data collection program.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\SQMClient\Windows]
"CEIPEnable"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\SQMClient\Windows]
"CEIPEnable"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\VSCommon\15.0\SQM]
"OptIn"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Messenger\Client]
"CEIP"=dword:00000002
```
**Why it matters:** Reduces data sent to Microsoft; recommended by privacyguides.org.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 1.6 Disable Windows Error Reporting
**What it does:** Prevents Windows from sending crash/error reports to Microsoft.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\PCHealth\ErrorReporting]
"DoReport"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting\Consent]
"DefaultConsent"=dword:00000001   ; Win8.1 and earlier

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting]
"Disabled"=dword:00000001

[HKEY_CURRENT_USER\Software\Microsoft\Windows\Windows Error Reporting]
"DontSendAdditionalData"=dword:00000001
```
**Why it matters:** Crash dumps can contain sensitive information; background service uses resources.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 1.7 Disable Notifications Network Usage
**What it does:** Disables Windows push notifications that phone home (WNS — Windows Notification Service).

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\PushNotifications]
"NoCloudApplicationNotification"=dword:00000001  ; Win8+
```
**Why it matters:** Mitigates telemetry and phoning home; reduces live tiles network traffic.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 8, 10, 11

---

### 1.8 Disable Cloud Content
**What it does:** Disables cloud-optimized content, consumer features, Windows Spotlight, and soft-landing suggestions.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\CloudContent]
"DisableCloudOptimizedContent"=dword:00000001       ; Win10 18363+
"DisableConsumerAccountStateContent"=dword:00000001 ; Win10 18363+
"DisableSoftLanding"=dword:00000001                 ; Win10+
"DisableWindowsConsumerFeatures"=dword:00000001     ; Win10+
```
**Why it matters:** Prevents unsolicited app installations and cloud-pushed content changes.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 1.9 Disable Search Box Web Results and Cortana
**What it does:** Prevents the Start/Search from sending queries to Bing/internet; disables Cortana.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Windows Search]
"AllowCortana"=dword:00000000    ; Win10+

[HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Windows\Explorer]
"DisableSearchBoxSuggestions"=dword:00000001
```
**Why it matters:** Every search query typed in Start is sent to Microsoft by default.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 1.10 Disable Sending Inking and Typing Data
**What it does:** Prevents Windows from sending handwriting and typing samples to Microsoft for "personalization".

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\TextInput]
"AllowLinguisticDataCollection"=dword:00000000  ; Win10 17134+
```
**Why it matters:** Keystrokes/handwriting are sensitive; this stops them being sent to Microsoft.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10 1803+, 11

---

### 1.11 Disable Typing Insights
**What it does:** Disables typing analytics collection.

**Registry keys:**
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\input\Settings]
"InsightsEnabled"=dword:00000000  ; Win10+
```
**Why it matters:** Privacy — stops typing pattern analysis.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 1.12 Disable Online Tips in Control Panel
**What it does:** Prevents Control Panel from fetching online tips and help content from Microsoft.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer]
"AllowOnlineTips"=dword:00000000  ; Win10 16299+
```
**Why it matters:** Eliminates unnecessary outbound connections to Microsoft servers.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10 1709+, 11

---

### 1.13 Disable NetBIOS over TCP/IP
**What it does:** Disables NetBIOS over TCP/IP on all network adapters to stop Windows listening on ports 137-139.

**How to apply:**
- Open `ncpa.cpl`
- Right-click adapter → Properties → TCP/IPv4 → Properties → Advanced → WINS tab
- Set "NetBIOS setting" to "Disable NetBIOS over TCP/IP"

**Why it matters:** Prevents unnecessary system listening and reduces attack surface; NetBIOS is a legacy protocol.
**Risk level:** Safe (unless legacy NetBIOS-dependent apps are used)
**Reversible:** Yes
**Windows versions:** All

---

### 1.14 Disable Remote Assistance
**What it does:** Disables Windows Remote Assistance feature.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Remote Assistance]
"fAllowToGetHelp"=dword:00000000
```
**Why it matters:** Attack surface reduction; Remote Assistance can be used to gain access to the machine.
**Risk level:** Safe (only impacts Remote Assistance, not RDP)
**Reversible:** Yes
**Windows versions:** All

---

### 1.15 Disable Widgets (Windows 11)
**What it does:** Disables the Windows 11 News and Interests / Widgets feature.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Dsh]
"AllowNewsAndInterests"=dword:00000000  ; Win10+
```
**Why it matters:** Security risk (web content rendering surface) and unnecessary background process.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 1.16 Disable File Zone-of-Origin Marking
**What it does:** Prevents Windows from adding the "Mark of the Web" (Zone ID) to downloaded files.

**Registry keys:**
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Attachments]
"SaveZoneInformation"=dword:00000001
```
**Why it matters:** Removes the security prompt for downloaded files. Trade-off: convenience vs. security warning.
**Risk level:** MODERATE — security trade-off; you lose the "This file came from the internet" warnings
**Reversible:** Yes
**Windows versions:** All

---

### 1.17 Disable Malicious Software Removal Tool Updates
**What it does:** Prevents Windows from offering the MSRT tool through Windows Update.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\MRT]
"DontOfferThroughWUAU"=dword:00000001
```
**Why it matters:** Reduces Windows Update activity; MSRT scans consume CPU resources.
**Risk level:** MODERATE — removes an active malware scanning tool
**Reversible:** Yes
**Windows versions:** All

---

### 1.18 Privacy — Windows Settings (UI, no registry)
**What it does:** Additional privacy settings accessible via Win+I → Privacy.

**Steps:**
- Disable all unnecessary permissions (Location, Camera, Microphone, Notifications, etc.)
- Disable "Personalized Experiences" in Microsoft Store settings
- Applies to Windows 8+

**Risk level:** Safe
**Reversible:** Yes via Settings
**Windows versions:** 8, 10, 11

---

## 2. PERFORMANCE

### 2.1 Disable 8.3 Filename Creation (NTFS)
**What it does:** Prevents Windows from creating short 8.3-character filenames on NTFS/FAT volumes.

**Commands:**
```bat
; Disable globally
fsutil 8dot3name set 1

; Disable per-volume (replace D: with target drive letter)
fsutil.exe 8dot3name set D: 1

; Strip existing 8.3 names (run during setup before first boot)
fsutil.exe 8dot3name strip /s /f D:

; Scan to verify (should show ~0 names found)
fsutil 8dot3name scan /s C:
```
**Why it matters:** Aids performance and security; reduces file system overhead.
**Risk level:** Safe (run strip before first boot to avoid access errors)
**Reversible:** Yes (`fsutil 8dot3name set 0` re-enables; cannot restore already-stripped names)
**Windows versions:** All

---

### 2.2 Disable Last Access Time Stamp (NTFS)
**What it does:** Stops NTFS from updating the Last Access Time on every directory listing.

**Command:**
```bat
fsutil behavior set disablelastaccess 1
```
**Why it matters:** Reduces I/O overhead; every directory listing triggers a write without this.
**Risk level:** Safe (may affect backup/remote storage programs — documented caveat)
**Reversible:** Yes (`fsutil behavior set disablelastaccess 0`)
**Windows versions:** All

---

### 2.3 Disable Superfetch / SysMain
**What it does:** Disables the SysMain service (Superfetch/Prefetch) which preloads apps into memory.

**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v "Start" /t REG_DWORD /d "4" /f
```
**Why it matters:** On SSD/NVMe systems prefetching provides no benefit; Microsoft recommends disabling for real-time performance. Eliminates periodic background CPU/disk usage.
**Risk level:** Safe (only beneficial if no HDD is present)
**Reversible:** Yes (set Start back to 2 or 3)
**Windows versions:** All

---

### 2.4 Disable Search Indexing (Windows Search Service)
**What it does:** Disables the WSearch service which indexes directories for search.

**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" /v "Start" /t REG_DWORD /d "4" /f
```
**Why it matters:** Indexing creates notable CPU overhead running periodically in background; visible in Process Explorer.
**Risk level:** Safe (search features are limited without it)
**Reversible:** Yes (set Start back to 2)
**Windows versions:** All

---

### 2.5 Disable Transparency Effects
**What it does:** Disables Acrylic/transparency in taskbar and Start menu.

**Registry keys:**
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize]
"EnableTransparency"=dword:00000000  ; Win10+
```
**Why it matters:** Reduces minor CPU overhead from compositing transparency effects.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 2.6 Disable Background Apps
**What it does:** Globally prevents UWP apps from running in the background.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy]
"LetAppsRunInBackground"=dword:00000002  ; Win10+
```
**Why it matters:** Background UWP apps consume CPU and memory; setting this via policy works on Win11 where the UI toggle was removed.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 2.7 Disable Automatic Maintenance
**What it does:** Disables the Windows Automatic Maintenance scheduler.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance]
"MaintenanceDisabled"=dword:00000001
```
**Audit tasks:** `Get-ScheduledTask | ? {$_.Settings.MaintenanceSettings}` in PowerShell
**Why it matters:** Maintenance tasks (defrag, scan, updates) run at unexpected times and consume CPU/disk resources.
**Risk level:** MODERATE — you lose scheduled disk maintenance; manual intervention needed
**Reversible:** Yes
**Windows versions:** All

---

### 2.8 Disable Fault Tolerant Heap
**What it does:** Prevents Windows from autonomously applying crash mitigation behaviors to applications.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\FTH]
"Enabled"=dword:00000000
```
**Why it matters:** FTH can silently apply compatibility shims to crashing applications, causing unexpected performance issues.
**Risk level:** MODERATE — reduced automatic crash recovery
**Reversible:** Yes
**Windows versions:** All

---

### 2.9 Disable Fast Startup
**What it does:** Forces the system to fully shut down (S5) instead of using hibernate-based Fast Startup (which leaves the kernel in a saved state).

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Power]
"HiberbootEnabled"=dword:00000000
```
**Also via CMD:**
```bat
powercfg /h off
```
**Why it matters:** Fast Startup doesn't perform a true shutdown; this leads to unexpected state issues and prevents proper S5 entry. Also removes hiberfil.sys.
**Risk level:** Safe (slightly longer boot times)
**Reversible:** Yes
**Windows versions:** All

---

### 2.10 Disable Pointer Acceleration
**What it does:** Disables mouse pointer acceleration (Enhance Pointer Precision).

**Registry keys:**
```
[HKEY_CURRENT_USER\Control Panel\Mouse]
"MouseSpeed"="0"
"MouseThreshold1"="0"
"MouseThreshold2"="0"
```
**Why it matters:** Ensures 1:1 physical-to-on-screen mouse movement; critical for aiming consistency. Modern games use raw input so this mainly affects the Desktop.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 2.11 Disable Sticky Keys
**What it does:** Disables the Sticky Keys accessibility dialog.

**Registry keys:**
```
[HKEY_CURRENT_USER\Control Panel\Accessibility\StickyKeys]
"Flags"="506"
```
**Why it matters:** The Sticky Keys dialog triggers when Shift is pressed 5 times rapidly — severely intrusive in games using Shift as a control.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 2.12 Disable Memory Integrity (HVCI)
**What it does:** Disables Hypervisor-Protected Code Integrity.

**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" /v "Enabled" /t REG_DWORD /d "0" /f
```
**Why it matters:** HVCI has a significant measured performance impact (benchmarked by Tom's Hardware). Should be disabled when BIOS virtualization is disabled.
**Risk level:** RISKY — reduces security; required for Vanguard and FACEIT anticheats
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 2.13 Disable Virtualization Based Security (VBS)
**What it does:** Disables Windows Virtualization-Based Security.

**Registry path to check:** `msinfo32` → "Virtualization-based security"
**Steps:** Settings → System → Recovery → Advanced Startup OR via Group Policy
**Why it matters:** VBS has measured gaming performance impact; should be disabled when not using Hyper-V/Sandbox.
**Risk level:** RISKY — security reduction
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 2.14 Disable Sign-in After Restart
**What it does:** Prevents Windows from auto-signing in and locking the last interactive user after a restart.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System]
"DisableAutomaticRestartSignOn"=dword:00000001  ; Win10 18362+
```
**Why it matters:** Mitigates security risk; prevents unexpected auto-login behavior.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10 1903+, 11

---

### 2.15 Disable Store App Updates (Automatic)
**What it does:** Prevents Microsoft Store from automatically downloading and installing app updates.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\WindowsStore]
"AutoDownload"=dword:00000002  ; Win8.1+
```
**Why it matters:** Prevents surprise bandwidth/CPU usage from background app updates.
**Risk level:** MODERATE — apps won't auto-update; manual updates required
**Reversible:** Yes
**Windows versions:** 8.1, 10, 11

---

### 2.16 Show File Extensions
**What it does:** Makes Windows Explorer display file extensions for all file types.

**Registry keys:**
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"HideFileExt"=dword:00000000
```
**Why it matters:** Security — prevents social engineering attacks using "file.pdf.exe" renamed to look like "file.pdf".
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 2.17 Process Mitigations (Exploit Protection)
**What it does:** Disables OS-level process mitigations in Windows Defender Exploit Protection.

**How to apply:** Windows Security → App & Browser Control → Exploit Protection → System Settings
**PowerShell:** `Set-ProcessMitigation` / `Get-ProcessMitigation`
**Why it matters:** Mitigations reduce attack surface but can have minor performance impact; disabling them is a security tradeoff.
**Risk level:** RISKY — security reduction
**Reversible:** Yes
**Windows versions:** 10 1709+, 11

---

### 2.18 Disable MSI ISA Bridge (IRQ 0 Sharing Fix)
**What it does:** Disables the `msisadrv` driver to resolve IRQ 0 sharing between System Timer and HPET.

**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\msisadrv" /v "Start" /t REG_DWORD /d "4" /f
```
**Why it matters:** IRQ 0 sharing between System Timer and HPET causes high interrupt latency.
**Risk level:** MODERATE — breaks keyboard on mobile/laptop devices
**Reversible:** Yes
**Windows versions:** All

---

### 2.19 Disable MPOs (MultiPlane Overlay — stuck on iFlip fix)
**What it does:** Forces DWM out of Hardware Composed Independent Flip presentation mode.

**Command:**
```bat
reg add "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /t REG_DWORD /d "5" /f
```
**Why it matters:** Some users are stuck in MPO presentation mode which can cause stuttering or compatibility issues.
**Risk level:** MODERATE — benchmark before/after
**Reversible:** Yes (delete the value)
**Windows versions:** 10, 11

---

### 2.20 Disable Auto-Restart Sign-On After Update
**What it does:** Prevents Windows from automatically signing in after a restart triggered by updates.

**Registry keys:** (see 2.14 above — same key)
**Windows versions:** 10 1903+, 11

---

## 3. SERVICES

### 3.1 Service: DiagTrack (Connected User Experiences and Telemetry)
**Service name:** `DiagTrack`
**Registry:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\DiagTrack]
"Start"=dword:00000004
```
**Start values:** 0=Boot, 1=System, 2=Auto, 3=Manual, 4=Disabled
**Why:** Telemetry collection; CPU/network overhead
**Risk level:** Safe
**Windows versions:** 10+

---

### 3.2 Service: WSearch (Windows Search)
**Service name:** `WSearch`
**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" /v "Start" /t REG_DWORD /d "4" /f
```
**Why:** Periodic indexing causes CPU spikes
**Risk level:** Safe (search limited)
**Windows versions:** All

---

### 3.3 Service: SysMain (Superfetch)
**Service name:** `SysMain`
**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v "Start" /t REG_DWORD /d "4" /f
```
**Why:** No benefit on SSD/NVMe; Microsoft recommends disabling for real-time performance
**Risk level:** Safe
**Windows versions:** All

---

### 3.4 Service: Windows Defender Services
**Services disabled when `disable windows defender` = true:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WinDefend]
"Start"=dword:00000004

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\MsSecCore]
"Start"=dword:00000004  ; Win11+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\wscsvc]
"Start"=dword:00000004  ; Security Center

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WdFilter]
"Start"=dword:00000004  ; Win8+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WdBoot]
"Start"=dword:00000004  ; Win8+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WdNisSvc]
"Start"=dword:00000004  ; Win8+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WdNisDrv]
"Start"=dword:00000004  ; Win8+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SecurityHealthService]
"Start"=dword:00000004  ; Win10+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Sense]
"Start"=dword:00000004  ; Win10+ (Advanced Threat Protection)
```
**Additional Defender-related registry:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows Defender]
"DisableAntiSpyware"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Microsoft Antimalware\Real-Time Protection]
"DisableScanOnRealtimeEnable"=dword:00000001
"DisableOnAccessProtection"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection]
"DisableScanOnRealtimeEnable"=dword:00000001
"DisableBehaviorMonitoring"=dword:00000001  ; Win8+

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows Defender\Spynet]
"SpyNetReporting"=dword:00000000       ; Win10+
"SubmitSamplesConsent"=dword:00000000  ; Win10+

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer]
"SmartScreenEnabled"="Off"             ; Win10+

[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\AppHost]
"EnableWebContentEvaluation"=dword:00000000  ; Win10+

[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Edge\SmartScreenEnabled]
@=dword:00000000                             ; Win10+

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\WTDS\Components]
"ServiceEnabled"=dword:00000000              ; Win11+

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\CI\Policy]
"VerifiedAndReputablePolicyState"=dword:00000000  ; Win11+

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run]
"SecurityHealth"=-     ; removes startup entry, Win10+
"WindowsDefender"=-    ; removes startup entry, Win10+
```
**SmartScreen disable — must rename binary for later Windows versions:**
```bat
; Run as TrustedInstaller (via MinSudo.exe --TrustedInstaller --Privileged)
taskkill /f /im smartscreen.exe > nul 2>&1 & ren C:\Windows\System32\smartscreen.exe smartscreen.exee
```
**Why:** Significant CPU reduction; can prevent CPU C-State 0 issue on Intel CPUs
**Risk level:** RISKY — no antivirus protection
**Reversible:** Yes (rename file back, re-enable services)
**Windows versions:** Service names vary by version (noted inline)

---

### 3.5 Service: msisadrv (ISA Bridge)
**Service name:** `msisadrv`
**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\msisadrv" /v "Start" /t REG_DWORD /d "4" /f
```
**Why:** Resolves IRQ 0 sharing between System Timer and HPET
**Risk level:** MODERATE — breaks keyboard on laptops
**Windows versions:** All

---

### 3.6 Service: Windows Audio (Windows Server Only)
**What it does:** On Windows Server, audio services are not set to Automatic by default.

**Steps:** `services.msc` → Set `Windows Audio` and `Windows Audio Endpoint Builder` to Automatic
**Windows versions:** Server editions only

---

### 3.7 Service Dependency Check (IMPORTANT)
**Before disabling any service, check dependencies:**
```bat
sc EnumDepend <service_name>
```
Services that depend on the target service must also be disabled or the system will generate dependency errors.

---

## 4. NETWORK

### 4.1 Disable Windows Update Driver Searching
**What it does:** Prevents Windows from automatically fetching drivers from Windows Update.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\DriverSearching]
"SearchOrderConfig"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata]
"PreventDeviceMetadataFromNetwork"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DriverSearching]
"SearchOrderConfig"=dword:00000000
"DontSearchWindowsUpdate"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate]
"ExcludeWUDriversInQualityUpdate"=dword:00000001  ; Win10+

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings]
"ExcludeWUDriversInQualityUpdate"=dword:00000001
```
**Why it matters:** Windows Update drivers can be outdated, vulnerable, or poorly performing. Install drivers directly from manufacturers.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All (some keys Win10+ specific)

---

### 4.2 Disable Windows Update (Full)
**What it does:** Completely disables Windows Update service and access.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate]
"WUServer"=" "
"WUStatusServer"=" "
"UpdateServiceUrlAlternate"=" "
"DisableWindowsUpdateAccess"=dword:00000001
"DisableOSUpgrade"=dword:00000001          ; Win8 9200+
"SetDisableUXWUAccess"=dword:00000001      ; Win10+
"ExcludeWUDriversInQualityUpdate"=dword:00000001  ; Win10+
"DoNotConnectToWindowsUpdateInternetLocations"=dword:00000001  ; Win8.1+

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU]
"NoAutoUpdate"=dword:00000001
"UseWUServer"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update]
"AUOptions"=dword:00000001        ; Win8.1 and earlier
"SetupWizardLaunchTime"=-         ; Win8.1 and earlier
"AcceleratedInstallRequired"=-    ; Win8.1 and earlier
```
**Note:** Breaks Microsoft Store. Recommended only for performance-critical setups.
**Why it matters:** Update processes consume significant CPU/RAM resources.
**Risk level:** RISKY — no security updates
**Reversible:** Yes
**Windows versions:** All

---

### 4.3 Disable Automatic Windows Updates Only
**What it does:** Keeps Windows Update functional but disables automatic downloading/installation.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU]
"NoAutoUpdate"=dword:00000001
```
**Why it matters:** Prevents update CPU/memory spikes at random times; you still update manually.
**Risk level:** MODERATE — manual update discipline required
**Reversible:** Yes
**Windows versions:** All

---

### 4.4 QoS Policy for Network Packet Tagging
**What it does:** Ensures DSCP QoS tags are correctly applied to packets, especially with multiple NICs.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\QoS]
"Do not use NLA"="1"   ; REG_SZ value
```
**Command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS" /v "Do not use NLA" /t REG_SZ /d "1" /f
```
**Group Policy:** Computer Config → Windows Settings → Policy-based QoS → Create new policy
**DSCP value:** 46 (Expedited Forwarding — highest priority for latency-sensitive traffic)
**Why it matters:** Without this, DSCP values may not be applied when multiple NICs are present.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 4.5 Disable NetBIOS over TCP/IP
See Privacy section 1.13.

---

### 4.6 Message Signaled Interrupts (MSI) for NIC
**What it does:** Enables MSI/MSI-X mode for the network adapter interrupt delivery.

**Tools:** MSI Utility v3, GoInterruptPolicy
**Registry path (example — varies by device):**
```
HKLM\SYSTEM\CurrentControlSet\Enum\PCI\<device-id>\<instance>\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties
"MSISupported"=dword:00000001
```
**Why it matters:** MSIs are faster than line-based interrupts; required for RSS to function properly on NICs that support MSI-X.
**Risk level:** MODERATE — BSOD risk on some drivers (test carefully)
**Reversible:** Yes
**Windows versions:** All

---

### 4.7 Receive Side Scaling (RSS)
**What it does:** Distributes network packet processing across multiple CPU cores.

**RSS Base CPU:** Set in NIC advanced properties or via PowerShell
**Requirements:** NIC must support MSI-X for RSS to function
**Research finding:** Gaming typically uses at most 2 RSS queues; don't reserve excessive CPUs for RSS.
**Why it matters:** Prevents all NIC interrupts landing on CPU 0; reduces latency and jitter.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 4.8 Network Adapter Power-Saving Disable
**What it does:** Disables power-saving features in the network adapter driver.

**Steps:**
- Device Manager → Network Adapters → Properties → Advanced
- Disable: "Energy-Efficient Ethernet", "Green Ethernet", "Power Saving Mode", etc.

**PowerShell (disable system-level power management for all devices):**
```powershell
Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | ForEach-Object { $_.enable = $false; $_.psbase.put(); }
```
**Why it matters:** Power-saving causes wake-up delays that increase network latency.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 4.9 XHCI Interrupt Moderation (IMOD)
**What it does:** Reduces or eliminates the XHCI controller's interrupt coalescing delay.

**Default values:** Windows 7 = 1ms interval; Windows 8+ = 0.05ms (50µs)
**For gaming/high-polling mice:** Set to 0 (disable moderation entirely)
**Script:** `C:\XHCI-IMOD-Interval.ps1` (sets interval to 0x0 for all XHCI controllers)
**Vulnerable Driver Blocklist disable (if needed for RW-Everything driver):**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\CI\Config" /v "VulnerableDriverBlocklistEnable" /t REG_DWORD /d "0" /f
```
**Test:** Set interval to `0xFA00` (62.5Hz) — mouse should visibly stutter if changes take effect
**Why it matters:** With 8kHz mice, the default IMOD creates a bottleneck; interrupts from keyboard+audio cause data loss at 1ms intervals.
**Risk level:** MODERATE — requires kernel-level memory access via RW-Everything
**Reversible:** Yes
**Windows versions:** All

---

## 5. GAMING

### 5.1 Disable GameBarPresenceWriter
**What it does:** Disables the GameBarPresenceWriter process that runs persistently in background.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter]
"ActivationType"=dword:00000000  ; Win10+
```
**Why it matters:** Runs persistently without being required for Game Mode or Game Bar to function.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 5.2 Game Bar Toggle
**What it does:** Enable or disable Xbox Game Bar (Win+G).

**Enable:**
```bat
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d "1" /f
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d "1" /f
```
**Disable:**
```bat
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" /v "AppCaptureEnabled" /t REG_DWORD /d "0" /f
reg add "HKCU\System\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d "0" /f
```
**Note:** Game Bar is needed to register games in Config Store for proper presentation mode control.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 5.3 Hardware: Legacy Flip Presentation Mode
**What it does:** Forces games to use Hardware: Legacy Flip (exclusive fullscreen) presentation mode.

**Registry keys:**
```bat
reg add "HKCU\SYSTEM\GameConfigStore" /v "GameDVR_DXGIHonorFSEWindowsCompatible" /t REG_DWORD /d "1" /f
reg add "HKCU\SYSTEM\GameConfigStore" /v "GameDVR_FSEBehavior" /t REG_DWORD /d "2" /f
```
**Also:** Tick "Disable fullscreen optimizations" in the game's .exe Properties
**Why it matters:** Legacy Flip bypasses DWM compositing for lowest possible latency.
**Risk level:** MODERATE — some games may not work properly; benchmark required
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 5.4 Game Mode
**What it does:** Windows Game Mode prevents Windows Update and some notifications during gaming.

**Note:** Can interfere with process/thread priority boosts — benchmark enabled vs. disabled.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** 10 1703+, 11

---

### 5.5 Autoplay Disable
**What it does:** Disables AutoPlay/AutoRun for all drive types.

**Registry keys:**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer]
"NoDriveTypeAutoRun"=dword:000000FF
"NoAutorun"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Explorer]
"NoAutoplayfornonVolume"=dword:00000001
```
**Why it matters:** Security — prevents auto-executing malware from USB/CD.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 5.6 Resizable Bar (ReBAR)
**What it does:** Enables PCIe Resizable BAR which allows CPU to access full GPU VRAM.

**Requirements:** GPT/UEFI BIOS mode, Above 4G Decoding enabled in BIOS
**Verification:** GPU-Z → Advanced → GPU Memory Bus Interface
**Note:** Can cause performance regression in some games — always benchmark.
**Risk level:** Safe (BIOS setting, not OS)
**Reversible:** Yes
**Windows versions:** 10 2004+, 11 (required for HAGS)

---

### 5.7 GPU Scheduling (HAGS)
**What it does:** Hardware Accelerated GPU Scheduling moves GPU scheduling from CPU to GPU hardware.

**Why it matters:** Required for DLSS Frame Generation; reduces CPU-GPU scheduling overhead.
**Enable:** Settings → System → Display → Graphics Settings → "Hardware-accelerated GPU scheduling"
**Risk level:** Safe (benchmark — not always positive)
**Reversible:** Yes
**Windows versions:** 10 2004+, 11

---

### 5.8 Register Game in Config Store
**What it does:** Ensures Xbox Game Bar and Game Mode recognize the application as a game.

**Steps:**
1. Launch game
2. Press Win+G to open Game Bar
3. Enable "Remember this is a game"
4. Verify entry created at `HKCU\SYSTEM\GameConfigStore`

**Why it matters:** Required for proper presentation mode behavior and Game Mode activation.
**Risk level:** Safe
**Windows versions:** 10, 11

---

### 5.9 Disable NVIDIA Ansel
**What it does:** Disables the NVIDIA Ansel screenshot feature in NVIDIA Inspector.

**Tool:** NVIDIA Profile Inspector → disable "Enable Ansel"
**Why it matters:** Ansel hooks into games and can introduce minor overhead.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 5.10 Disable CUDA Force P2 State
**What it does:** Prevents NVIDIA GPU from running CUDA in P2 (reduced clock) state.

**Tool:** NVIDIA Profile Inspector → disable "CUDA - Force P2 State"
**Why it matters:** Ensures GPU runs at full performance during CUDA operations.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

## 6. POWER

### 6.1 CPU Idle States — Enable (Default)
**What it does:** Allows the CPU to enter deeper C-States (C1, C2, C3+) to save power when idle.

**Command:**
```bat
powercfg /setacvalueindex scheme_current sub_processor 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 && powercfg /setactive scheme_current
```
**Sub-key GUID:** `5d76a2ca-e8c0-402f-a133-2158492d58ad` (Processor idle disable)
**Value 0** = idle states enabled (default)
**Why it matters:** Saves power; needed for Turbo Boost/PBO to work correctly.
**Risk level:** Safe
**Windows versions:** All

---

### 6.2 CPU Idle States — Disable (Force C-State 0)
**What it does:** Forces the CPU to stay in C-State 0 (maximum performance state) at all times.

**Command:**
```bat
powercfg /setacvalueindex scheme_current sub_processor 5d76a2ca-e8c0-402f-a133-2158492d58ad 1 && powercfg /setactive scheme_current
```
**Value 1** = idle states disabled (force C0)
**Why it matters:** Eliminates C-State exit latency (delay when waking CPU from sleep); Microsoft recommends for real-time performance. Trade-off: higher temperatures, higher power consumption.
**Risk level:** MODERATE — can cause thermal throttling; power issues; do NOT use with HT/SMT enabled (degrades single-thread performance)
**Reversible:** Yes (run enable command above)
**Windows versions:** All

---

### 6.3 Hibernation / Fast Startup Disable
**What it does:** Disables hibernation, Fast Startup, and removes hiberfil.sys.

**Command:**
```bat
powercfg /h off
```
**Why it matters:** Forces true S5 shutdown; eliminates kernel state persistence issues.
**Risk level:** Safe (slightly longer boot times; loses resume-from-hibernate)
**Reversible:** `powercfg /h on`
**Windows versions:** All

---

### 6.4 Device Power-Saving Disable
**What it does:** Disables "Allow the computer to turn off this device to save power" for all applicable devices.

**PowerShell:**
```powershell
Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | ForEach-Object { $_.enable = $false; $_.psbase.put(); }
```
**Note:** Re-plugging devices may re-enable this; consider adding to Task Scheduler startup.
**Why it matters:** Prevents devices from having wake-up latency due to power gating.
**Risk level:** Safe
**Reversible:** Yes
**Windows versions:** All

---

### 6.5 BIOS Power-Saving Features (BIOS-level)
**What it does:** Disables PCIe/SATA power-management in BIOS.

**Settings to disable:**
- ASPM (Active State Power Management) — look for L0, L1 options
- ALPM (Aggressive Link Power Management)
- Power/Clock Gating
- Any setting named "Power Management" or "Power Saving"

**Why it matters:** These BIOS features cause PCIe link state transitions that add latency.
**Risk level:** MODERATE — higher power consumption; evaluate thermal impact
**Reversible:** Yes (BIOS reset)
**Windows versions:** N/A (BIOS)

---

### 6.6 Disable "Out of Support" Message
**What it does:** Disables the Windows 7/8 end-of-support notification.

**Registry keys:**
```
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\EOSNotify]
"DiscontinueEOS"=dword:00000001  ; Win8.1 and earlier
```
**Risk level:** Safe
**Windows versions:** 7, 8, 8.1

---

## 7. SECURITY

### 7.1 User Account Control (UAC)
**What it does:** Sets UAC to highest level "Always notify".

**How:** Run `useraccountcontrolsettings` in Win+R → set slider to highest
**Why it matters:** Default UAC level is bypassable by malicious programs; highest level adds more protection.
**Risk level:** Safe (more prompts)
**Reversible:** Yes
**Windows versions:** All

---

### 7.2 Spectre / Meltdown Mitigations
**What it does:** CPU vulnerability mitigations that can be disabled for performance (older platforms).

**Tool:** InSpectre (GRC)
**Renaming microcode DLLs (via MinSudo TrustedInstaller):**
```bat
ren C:\Windows\System32\mcupdate_GenuineIntel.dll mcupdate_GenuineIntel.dlll
ren C:\Windows\System32\mcupdate_AuthenticAMD.dll mcupdate_AuthenticAMD.dlll
```
**Notes:**
- Meltdown does not affect AMD CPUs
- FACEIT anticheat requires Meltdown mitigations (Kernel Page-Table Isolation) to be enabled
- On modern platforms (Zen 4, Intel 12th+), disabling mitigations can actually cause regression

**Why it matters:** These mitigations had significant impact on older platforms; negligible on modern ones.
**Risk level:** RISKY — CPU vulnerabilities exposed
**Reversible:** Yes (rename files back)
**Windows versions:** All

---

### 7.3 Secure Boot
**What it does:** UEFI Secure Boot verifies the boot chain integrity.

**Note:** Required for: Vanguard, FACEIT, THE FINALS anticheats on Windows 11
**Why it matters:** Prevents bootkit malware; required by some anticheats.
**Risk level:** RISKY to disable — reduces boot security
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 7.4 TPM (Trusted Platform Module)
**What it does:** BIOS hardware security chip used for key storage, BitLocker, etc.

**Why disable:** Can cause SMIs (System Management Interrupts) which preempt all CPU activity including the OS — measurable latency impact.
**Note:** Required for Vanguard and FACEIT on Windows 11
**Risk level:** RISKY to disable
**Reversible:** Yes (BIOS)
**Windows versions:** Requirement for Windows 11 upgrade

---

### 7.5 Vulnerable Driver Blocklist
**What it does:** Controls whether Windows blocks loading of known-vulnerable kernel drivers.

**Command to disable:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\CI\Config" /v "VulnerableDriverBlocklistEnable" /t REG_DWORD /d "0" /f
```
**Why:** Required to load RW-Everything driver for XHCI IMOD configuration. Some anticheats don't respect this setting and will block game launch.
**Risk level:** RISKY — allows potentially vulnerable drivers
**Reversible:** Yes (set to 1)
**Windows versions:** 10, 11

---

### 7.6 Memory Integrity (HVCI) — See Performance section 2.12

---

### 7.7 Virtualization Based Security (VBS) — See Performance section 2.13

---

## 8. DEBLOAT

### 8.1 Remove OneDrive
**What it does:** Completely uninstalls OneDrive.

**Command:**
```bat
for %a in ("SysWOW64" "System32") do (if exist "%windir%\%~a\OneDriveSetup.exe" ("%windir%\%~a\OneDriveSetup.exe" /uninstall)) && reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" /f
```
**Why it matters:** Privacy and bloat reduction; OneDrive runs background sync processes.
**Risk level:** Safe
**Reversible:** Reinstall from Microsoft
**Windows versions:** 10, 11

---

### 8.2 Disable Microsoft Edge Startup
**What it does:** Disables Edge startup boost and background running.

**Steps:**
1. In Edge Settings → On Startup: disable "Startup boost"
2. Disable "Continue running background extensions and apps when Microsoft Edge is closed"
3. Use Autoruns → Everything tab → search "edge" → disable all entries
4. Remove shortcuts: `for /f "delims=" %a in ('where /r C:\ *edge.lnk*') do (del /f /q "%a")`

**Why it matters:** Edge startup boost causes persistent background processes even when browser isn't open.
**Risk level:** Safe (WebView2 runtime is preserved)
**Reversible:** Yes
**Windows versions:** 10, 11

---

### 8.3 Remove Appx Packages (UWP Bloatware)
**Tool:** AppxPackagesManager (https://github.com/valleyofdoom/AppxPackagesManager)
**Recommended to keep:** `Microsoft.WindowsStore` (for future app installs)

**PowerShell alternative:** `Get-AppxPackage | Remove-AppxPackage`
**Why it matters:** Preinstalled UWP apps (Candy Crush, Xbox apps, etc.) run background processes.
**Risk level:** MODERATE — some system components are packaged as Appx; removing wrong packages can break things
**Reversible:** `wsreset -i` restores Microsoft Store; some packages cannot be restored without reinstall
**Windows versions:** 10, 11

---

### 8.4 Disable Autorun / Autoplay
**See Gaming section 5.5**

---

### 8.5 Optional Features Removal
**How:** `OptionalFeatures` in Win+R
**Remove:** Any Windows optional features you don't use (e.g., Internet Explorer, Media Features, Telnet, etc.)
**Windows versions:** All

---

### 8.6 Disable ASUS/Gigabyte/MSI/ASRock Bloatware from BIOS
**What it does:** Prevents motherboard software (Armoury Crate, Gigabyte Control Center, etc.) from being auto-installed.

**ASUS:** Disable "Armoury Crate Install" in BIOS → Tools
**Gigabyte:** Disable APP Center in BIOS → Settings → Miscellaneous
**MSI:** Disable MSI Center auto-install in BIOS
**ASRock:** Disable auto driver install in BIOS
**Why it matters:** Bloatware runs persistent background processes and is often hard to fully remove.
**Risk level:** Safe
**Reversible:** Yes (re-enable in BIOS)
**Windows versions:** N/A (BIOS)

---

### 8.7 Scheduled Tasks Audit
**Tool:** TaskSchedulerView (NirSoft)
**What to look for:** Columns: Last Run, Next Run, Triggers
**Commonly disabled (assess per system):**
- Telemetry-related tasks (Microsoft\Windows\Application Experience)
- Defender-related tasks (when Defender is disabled)
- Update-related tasks (when updates are managed manually)

**Command to view maintenance tasks:**
```powershell
Get-ScheduledTask | ? {$_.Settings.MaintenanceSettings}
```
**Risk level:** MODERATE — assess each task individually
**Windows versions:** All

---

### 8.8 Disk Cleanup Configuration
**Commands:**
```bat
; Configure (check all boxes except DirectX Shader Cache)
cleanmgr /sageset:0

; Run cleanup
cleanmgr /sagerun:0
```
**Residual locations to manually clean:**
- `C:\Windows\Prefetch` — prefetch files (should be empty if SysMain disabled)
- `C:\Windows\SoftwareDistribution` — Windows Update cache
- `C:\Windows\Temp`
- `%userprofile%\AppData\Local\Temp`

**WinSxS cleanup:**
```bat
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```
**Windows versions:** All

---

## 9. BIOS/UEFI Settings

| Setting | Recommendation | Reason | Risk |
|---------|---------------|---------|------|
| Partition Style | GPT/UEFI | Required for ReBAR, Secure Boot, modern features | Safe |
| Virtualization/SVM | Disable | Memory access latency; affects BCLK stability | Moderate (breaks VMs, HVCI) |
| Intel VT-d / AMD-Vi (IOMMU) | Disable | Same as virtualization — latency impact | Moderate |
| ASPM | Disable | PCIe link state transitions add latency | Moderate |
| ALPM | Disable | Aggressive link power management overhead | Moderate |
| Power/Clock Gating | Disable | Eliminates gating-related delays | Moderate |
| TPM | Disable | SMI-based; preempts CPU — measured latency | Risky |
| Legacy USB Support | Disable | Causes SMIs — latency impact | Moderate (need for installs) |
| CSM | Disable (if GPT) | Not needed with UEFI; required only for MBR | Safe |
| Secure Boot | Enable if anticheat requires; otherwise optional | Security + anticheat | Moderate |
| Fast Startup (BIOS) | Disable | S3/S4 states can cause unexpected issues | Safe |
| Spread Spectrum | Disable | Ensures stable BCLK frequency | Safe |
| Resizable Bar (ReBAR) | Enable if supported | Performance; requires Above 4G Decoding | Moderate |
| Above 4G Decoding | Enable (required for ReBAR) | Required for ReBAR | Safe |
| Hyper-Threading / SMT | Benchmark dependent | Can hurt single-thread latency; can help multi-thread | Risky |
| PCIe Link Speed | Set to maximum (Gen 4.0) | Avoids unexpected behavior at lower speeds | Safe |
| Fan Curves | Configure aggressive curves | Maximizes thermal headroom | Safe |
| Software Auto-Install | Disable (Armoury Crate etc.) | Prevents bloatware | Safe |
| Unnecessary Devices (WLAN, BT, iGPU) | Disable what you don't use | Reduces IRQ sharing and resource contention | Moderate |

---

## 10. GPU Configuration — NVIDIA

### 10.1 Stripped Driver Installation
**What it does:** Installs only the necessary driver components, removing telemetry/GeForce Experience.

**Keep these files from the installer:**
- `Display.Driver`
- `NVI2`
- `EULA.txt`
- `ListDevices.txt`
- `setup.cfg`
- `setup.exe`

**Remove from setup.cfg:**
```
<file name="${{EulaHtmlFile}}"/>
<file name="${{FunctionalConsentFile}}"/>
<file name="${{PrivacyPolicyFile}}"/>
```

---

### 10.2 NVIDIA Control Panel — 3D Settings
**Benchmark before applying (not all are universally beneficial):**
- Low Latency Mode: **On** (inserts frame before GPU queue)
- Power management mode: **Prefer maximum performance** (prevents GPU clock reduction)
- Shader Cache Size: **Unlimited**
- Texture filtering — Quality: **High performance**
- Threaded Optimization: Test; may impact frame pacing

---

### 10.3 NVIDIA Control Panel — Display
- Output dynamic range: **Full** (prevents limited color range crush)

---

### 10.4 NVIDIA Control Panel — Video Color Settings
- Dynamic range: **Full**

---

### 10.5 Lock GPU Clocks / P-State 0
**What it does:** Forces GPU into P-State 0 (maximum performance clocks) permanently, preventing dynamic clock scaling.

**Registry command:**
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableDynamicPstate" /t REG_DWORD /d "1" /f
```
**Note:** The `\0000` suffix is the device instance — verify correct index in Device Manager (may be 0001, 0002, etc.)
**Why it matters:** Eliminates GPU clock ramp-up latency during transitions.
**Risk level:** MODERATE — higher power/heat; benchmark required
**Reversible:** Yes (delete the value)
**Windows versions:** All

---

### 10.6 NVIDIA Profile Inspector
- Disable **Enable Ansel**
- Experiment with **rBAR** settings (Feature, Options, Size Limit) if ReBAR is enabled
- Disable **CUDA - Force P2 State**

---

## 11. GPU Configuration — AMD

### 11.1 Installation Method
1. Download latest driver from AMD support page
2. Extract Display driver folder to desktop
3. Use Device Manager to update display adapter driver (avoids Adrenalin Software bloat)
4. Optionally install Radeon Software separately via extracted MSI

### 11.2 Disable AMD Background Services
**Tool:** Autoruns
**Disable:** AMD Crash Defender, other non-essential AMD background entries
**Keep:** Core kernel-mode driver components
**Keep (if using VRR):** AMD External Events Utility (required for Variable Refresh Rate)

**Note:** Author no longer owns AMD GPU; Calypto's Latency Guide is recommended for AMD-specific tuning.

---

## 12. FILE SYSTEM OPTIMIZATIONS

### 12.1 NTFS 8.3 Name Disable
```bat
fsutil 8dot3name set 1              ; Disable globally
fsutil.exe 8dot3name set D: 1       ; Per-volume
fsutil.exe 8dot3name strip /s /f D: ; Strip existing (before first boot)
```

### 12.2 NTFS Last Access Time Disable
```bat
fsutil behavior set disablelastaccess 1
```

### 12.3 WinSxS Cleanup
```bat
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

### 12.4 Apply Windows Image (DISM)
```bat
DISM /Get-WimInfo /WimFile:<path\to\wim>
DISM /Apply-Image /ImageFile:<path\to\wim> /Index:<index> /ApplyDir:<drive letter>
bcdboot <windir>
```

---

## 13. KERNEL SCHEDULING & INTERRUPTS

### 13.1 Message Signaled Interrupts (MSI/MSI-X)
**Tools:** MSI Utility v3, GoInterruptPolicy
**What to enable MSI on:** GPU, NIC, Audio controller, XHCI controllers
**Why:** MSIs don't share IRQs; eliminate interrupt sharing latency; faster than line-based interrupts
**Verification:** After restart, device should show negative IRQ in MSI Utility

---

### 13.2 Interrupt Affinity Policies
**Tools:** Microsoft Interrupt Affinity Tool, GoInterruptPolicy
**What it does:** Assigns specific device interrupts (ISRs/DPCs) to specific CPU cores
**Best practice:** ISR and DPC for same device should land on same CPU core

**AutoGpuAffinity** (GPU-specific): https://github.com/valleyofdoom/AutoGpuAffinity
**Benchmarks:** Use xperf DPC/ISR report to see which CPUs modules are using
**Script:** `/bin/xperf-dpcisr.bat`

---

### 13.3 Process/Thread CPU Affinity
**Start process with affinity:**
```bat
start /affinity 0x6 notepad.exe     ; CPU 1 and 2
```
**Set affinity for running processes:**
```powershell
Get-Process @("svchost", "audiodg") -ErrorAction SilentlyContinue | ForEach-Object { $_.ProcessorAffinity=0x8 }
```
**Affinity Mask Calculator:** https://bitsum.com/tools/cpu-affinity-calculator

---

### 13.4 Reserved CPU Sets (Windows 10+)
**Tool:** ReservedCpuSets — https://github.com/valleyofdoom/ReservedCpuSets
**What it does:** Prevents Windows from scheduling ISRs/DPCs/threads on reserved CPU cores
**Use cases:**
- Reserve E-Cores on Intel 12th+ to force tasks to P-Cores
- Reserve cores for exclusive use by game or interrupt handling
- Combine with affinity policies for guaranteed isolation

**Important:** Do not mix reserved and unreserved CPUs in a single affinity mask — causes unexpected behavior.

---

### 13.5 Network RSS Configuration
**RSS Base CPU:** Set in NIC properties or via registry
**RSS Queue Count:** Gaming typically needs at most 2 queues; consecutive CPUs are used
**Example:** RSS base CPU 2 + 4 queues = CPU 2, 3, 4, 5 (or 2, 4, 6, 8 with HT)
**Reference:** https://github.com/Duckleeng/TweakCollection#receive-side-scaling-rss-configuration

---

## 14. TIMER RESOLUTION & CLOCK INTERRUPTS

### 14.1 Timer Resolution Overview
| Value | Frequency | Interrupt Period | Effect |
|-------|-----------|-----------------|--------|
| Default | 64Hz | 15.625ms | Low CPU overhead, poor timing precision |
| Raised (typical) | 1000Hz | 1ms | Good precision, moderate overhead |
| Maximum | 2000Hz | 0.5ms | Highest precision, highest overhead |
| Optimal (research) | ~1969Hz | ~0.507ms | Often better precision than 0.5ms |

### 14.2 Restore Global Timer Resolution (Win Server 2022+ / Win 11+ only)
**Registry key:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\kernel]
"GlobalTimerResolutionRequests"=dword:00000001
```
**Why:** On Win10 2004+, timer resolution is per-process. This restores global behavior allowing a separate process to raise resolution for all processes (including games). Not available on Win10 2004-22H2.

### 14.3 Tools for Timer Resolution Testing
- **SetTimerResolution**: Request specific resolutions — https://github.com/valleyofdoom/TimerResolution
- **MeasureSleep**: Measure actual sleep precision
- **micro-adjust-benchmark.ps1**: Automate finding optimal resolution
- **ClockRes** (Sysinternals): View current min/current/max timer resolution

### 14.4 Background Window Message Rate (Win 11 22H2+)
**What it does:** Controls how often background windows receive mouse messages.

**Registry key:**
```
[HKEY_CURRENT_USER\Control Panel\Mouse]
"RawMouseThrottleDuration"=dword:00000008   ; Default ~8ms/125Hz; min: 0x3, max: 0x14
```
**Why it matters:** Mouse Tester will show polling rate dropping to this value when sent to background. Can be reduced for better background input responsiveness.

---

## 15. CPU IDLE STATES

### 15.1 Enable Idle States (Default)
```bat
powercfg /setacvalueindex scheme_current sub_processor 5d76a2ca-e8c0-402f-a133-2158492d58ad 0 && powercfg /setactive scheme_current
```

### 15.2 Disable Idle States (Force C0)
```bat
powercfg /setacvalueindex scheme_current sub_processor 5d76a2ca-e8c0-402f-a133-2158492d58ad 1 && powercfg /setactive scheme_current
```
**GUID:** `5d76a2ca-e8c0-402f-a133-2158492d58ad` = Processor idle disable
**Sub-group:** `sub_processor` = Processor Power Management

**Considerations:**
- Do NOT disable idle states with HT/SMT enabled
- Do NOT disable if using Turbo Boost / PBO (dynamic frequency)
- Increases CPU temperature — ensure thermal headroom exists
- May cause 100% CPU utilization in Task Manager (cosmetic — use Process Explorer instead)
- Microsoft recommendation for real-time performance systems

---

## 16. MEMORY MANAGEMENT

### 16.1 Memory Compression
**PowerShell query:**
```powershell
Get-MMAgent
```
**Disable memory compression:**
```powershell
Disable-MMAgent -MemoryCompression
```
**Note:** If Superfetch/Prefetch are enabled, keep prefetching-related MMAgent features enabled.
**Windows versions:** 8+

### 16.2 Paging File
**Recommendation:** Keep enabled for most users
**Issue:** Specific games stutter with page file disabled despite RAM headroom
**Best practice:** Allocate to SSD; set to "System managed size"; deallocate from HDD
**Windows versions:** All

### 16.3 Install Windows Setup Bypass Keys
**For Windows 11 installation without TPM/SecureBoot/RAM requirements:**
```
[HKEY_LOCAL_MACHINE\SYSTEM\Setup\LabConfig]
"BypassTPMCheck"=dword:00000001
"BypassRAMCheck"=dword:00000001
"BypassSecureBootCheck"=dword:00000001
```
**For OOBE bypass (skip Microsoft Account requirement on Win11):**
```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE]
"BypassNRO"=dword:00000001
```

---

## 17. PRESENTATION MODE & GAME BAR

### 17.1 Presentation Modes Summary
| Mode | DWM | Latency | How to Force |
|------|-----|---------|-------------|
| Hardware: Legacy Flip | Bypassed | Lowest | Disable FSO + registry keys |
| Hardware: Independent Flip | Bypassed | Low | Native fullscreen |
| Hardware Composed: Independent Flip (MPO) | Active | Medium | Default on many systems |
| Composed: Flip | Active | Higher | Windowed/borderless |

### 17.2 Force Hardware Legacy Flip
```bat
reg add "HKCU\SYSTEM\GameConfigStore" /v "GameDVR_DXGIHonorFSEWindowsCompatible" /t REG_DWORD /d "1" /f
reg add "HKCU\SYSTEM\GameConfigStore" /v "GameDVR_FSEBehavior" /t REG_DWORD /d "2" /f
```
+ Tick "Disable fullscreen optimizations" on game .exe

### 17.3 Disable MPOs (fix stuck iFlip)
```bat
reg add "HKLM\SOFTWARE\Microsoft\Windows\Dwm" /v "OverlayTestMode" /t REG_DWORD /d "5" /f
```

### 17.4 NVIDIA GPU P-State Lock (related to presentation)
```bat
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" /v "DisableDynamicPstate" /t REG_DWORD /d "1" /f
```

---

## QUICK REFERENCE: All Registry Keys by Category

### PRIVACY (safe to apply)
| Key | Value | Data | Notes |
|-----|-------|------|-------|
| `HKLM\SYSTEM\CurrentControlSet\Services\DiagTrack` | Start | 4 | Telemetry service |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection` | AllowTelemetry | 0 | Enterprise/EDU/Server only |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo` | DisabledByGroupPolicy | 1 | Win8.1+ |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\System` | EnableActivityFeed | 0 | Win10+ |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\System` | AllowClipboardHistory | 0 | Win10+ |
| `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Attachments` | SaveZoneInformation | 1 | Zone marking |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\CurrentVersion\PushNotifications` | NoCloudApplicationNotification | 1 | Win8+ |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent` | DisableWindowsConsumerFeatures | 1 | Win10+ |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search` | AllowCortana | 0 | Win10+ |

### PERFORMANCE (benchmark required)
| Key | Value | Data | Notes |
|-----|-------|------|-------|
| `HKLM\SYSTEM\CurrentControlSet\Services\WSearch` | Start | 4 | Disable Search |
| `HKLM\SYSTEM\CurrentControlSet\Services\SysMain` | Start | 4 | Disable Superfetch |
| `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize` | EnableTransparency | 0 | Win10+ |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy` | LetAppsRunInBackground | 2 | Win10+ |
| `HKLM\SOFTWARE\Microsoft\FTH` | Enabled | 0 | Fault Tolerant Heap |
| `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power` | HiberbootEnabled | 0 | Fast Startup |
| `HKCU\Control Panel\Mouse` | MouseSpeed/Threshold1/2 | 0 | Pointer accel |
| `HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity` | Enabled | 0 | HVCI off |
| `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel` | GlobalTimerResolutionRequests | 1 | Win11/Server 2022+ |

### GAMING
| Key | Value | Data | Notes |
|-----|-------|------|-------|
| `HKLM\SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter` | ActivationType | 0 | GameBar writer |
| `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR` | AppCaptureEnabled | 0 | Game Bar off |
| `HKCU\System\GameConfigStore` | GameDVR_Enabled | 0 | Game DVR off |
| `HKCU\SYSTEM\GameConfigStore` | GameDVR_DXGIHonorFSEWindowsCompatible | 1 | Legacy Flip |
| `HKCU\SYSTEM\GameConfigStore` | GameDVR_FSEBehavior | 2 | Legacy Flip |
| `HKLM\SOFTWARE\Microsoft\Windows\Dwm` | OverlayTestMode | 5 | Disable MPOs |
| `HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-...}\0000` | DisableDynamicPstate | 1 | NVIDIA P-State lock |

### NETWORK
| Key | Value | Data | Notes |
|-----|-------|------|-------|
| `HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\QoS` | Do not use NLA | "1" (REG_SZ) | QoS DSCP tagging |
| `HKLM\SYSTEM\CurrentControlSet\Control\CI\Config` | VulnerableDriverBlocklistEnable | 0 | For XHCI IMOD (risky) |
| `HKLM\SYSTEM\CurrentControlSet\Services\msisadrv` | Start | 4 | IRQ 0 sharing fix |

### WINDOWS UPDATE
| Key | Value | Data | Notes |
|-----|-------|------|-------|
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU` | NoAutoUpdate | 1 | Auto-update off |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\DriverSearching` | DontSearchWindowsUpdate | 1 | Driver update off |
| `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` | ExcludeWUDriversInQualityUpdate | 1 | Win10+ |

---

## TOOLS REFERENCED

| Tool | Purpose | URL |
|------|---------|-----|
| MSI Utility v3 | Enable MSI interrupts | Guru3D forums |
| GoInterruptPolicy | MSI + affinity | https://github.com/spddl/GoInterruptPolicy |
| AutoGpuAffinity | GPU affinity benchmark | https://github.com/valleyofdoom/AutoGpuAffinity |
| ReservedCpuSets | CPU core reservation | https://github.com/valleyofdoom/ReservedCpuSets |
| AppxPackagesManager | Appx bloat removal | https://github.com/valleyofdoom/AppxPackagesManager |
| SetTimerResolution | Set timer resolution | https://github.com/valleyofdoom/TimerResolution |
| MeasureSleep | Measure sleep precision | https://github.com/valleyofdoom/TimerResolution |
| MinSudo | TrustedInstaller shell | In repo bin/ folder |
| XHCI-IMOD-Interval.ps1 | XHCI IMOD interval | In repo bin/ folder |
| apply-registry.ps1 | Registry batch apply | In repo bin/ folder |
| Process Explorer | Task Manager replacement | Sysinternals |
| Autoruns | Startup management | Sysinternals |
| TaskSchedulerView | Scheduled task audit | NirSoft |
| DeviceCleanup | Remove hidden devices | Uwe Sieber |
| LowAudioLatency | Minimize audio buffer | https://github.com/spddl/LowAudioLatency |
| NVIDIA Profile Inspector | NVIDIA profile tweaks | TechPowerUp |
| Custom Resolution Utility | Display overclock | monitortests.com |
| QueryDisplayScaling | Check scaling mode | https://github.com/valleyofdoom/QueryDisplayScaling |
| xtw | DPC/ISR analysis | https://github.com/valleyofdoom/xtw |
| PresentMon | Frame time analysis | Intel/GitHub |

---

## WINDOWS VERSION COMPATIBILITY MATRIX

| Feature | Win7 | Win8/8.1 | Win10 (pre-2004) | Win10 2004+ | Win11 |
|---------|------|----------|------------------|-------------|-------|
| GlobalTimerResolutionRequests | No | No | No | No | Yes (22H2+) |
| Per-process timer resolution | No (global only) | No (global) | No (global) | Yes | Yes |
| HAGS | No | No | No | Yes (2004) | Yes |
| VBS/HVCI | No | No | Yes | Yes | Yes |
| Background App Policy | No | No | Yes | Yes | Yes |
| Reserved CPU Sets | No | No | Yes | Yes | Yes |
| Background Window Rate | No | No | No | No | Yes (22H2) |
| AllowTelemetry=0 | No | No | Enterprise/EDU only | Enterprise/EDU only | Enterprise/EDU only |
| GameConfigStore | No | No | Yes | Yes | Yes |
| BypassNRO (OOBE) | No | No | No | No | Yes |

---

## RISK SUMMARY TABLE

| Optimization | Risk Level | Security Impact | Performance Impact |
|-------------|-----------|----------------|-------------------|
| Disable telemetry | Safe | None | Minor CPU/net reduction |
| Disable auto-updates | Moderate | No security patches | CPU/disk overhead removed |
| Disable Windows Defender | Risky | No AV protection | Significant CPU reduction |
| Disable HVCI/VBS | Risky | Reduced code integrity | Measurable perf gain |
| Disable idle states | Moderate | None | C-state exit latency gone; thermal risk |
| Disable 8.3 names | Safe | Minor benefit | Minor FS overhead reduction |
| Disable Last Access Time | Safe | None | Minor I/O reduction |
| Disable Superfetch | Safe | None | Background CPU/disk removed |
| Disable Search Indexing | Safe | None | CPU spikes removed |
| Enable MSI interrupts | Moderate | None | Lower interrupt latency |
| XHCI IMOD = 0 | Moderate | None | Consistent USB interrupt timing |
| Disable Spectre/Meltdown | Risky | CPU vulnerability exposed | Platform-dependent |
| Disable TPM | Risky | Boot security reduced | SMI latency removed |
| Disable Secure Boot | Risky | Boot integrity removed | None |
| Disable pointer acceleration | Safe | None | 1:1 mouse input |
| Disable transparency | Safe | None | Minor compositor savings |
| Remove OneDrive | Safe | None | Background sync removed |
| Disable Fast Startup | Safe | None | True S5 shutdown |
| GlobalTimerResolutionRequests | Safe | None | Higher timing precision (Win11+) |

---

*Source repository: https://github.com/valleyofdoom/PC-Tuning*
*All registry keys extracted from: docs/registry-opts.md, bin/apply-registry.ps1, bin/registry-options.json, README.md*
*Full 170KB README.md downloaded and read in its entirety*
