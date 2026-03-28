# Harvest Report: QuakedK/Oneclick
Generated: 2026-03-26
Source: https://github.com/QuakedK/Oneclick
Pages crawled: 40+ (repo tree + all Help docs + all script files + linked repos)
Strategy: Deep multi-repo crawl (Oneclick + Scripting-Station + Downloads + Process-Destroyer)
Current version: V8.3

---

## 1. WHAT IT IS

Oneclick is described as "the all-in-one automatic extreme debloat and optimization tool" for Windows 11/10. It is:

- Fully automatic — most tweaks are mandatory, not optional
- Closed-source executable that downloads an open tools folder at startup
- Logs all actions to `C:\Oneclick Logs\Oneclick Log.txt`
- Targets: GPU optimization, latency reduction, telemetry removal, service debloat
- Supported: Win 11 22H2 through 26H1 (fully), Win 11 21H2 (partial), Win 10 (limited)

Design philosophy: run on a fresh Windows install with drivers pre-installed. Not reversible in all areas.

---

## 2. WHAT GETS DOWNLOADED

All downloads land in `C:\Oneclick Tools\`. Contents of OneclickTools.zip:

| Tool | Source | Purpose |
|------|--------|---------|
| NSudo (NSudoLG.exe) | github.com/M2TeamArchived/NSudo v9.0-Preview1 | System-privilege execution |
| Orca.bat | Repo: Downloads/Orca.bat | UpdateOrchestrator scheduled task disabler |
| AMD.bat | Repo: Downloads/AMD.bat | AMD service disabler |
| Sound.bat | Repo: Downloads/Sound.bat | Realtek/Sound Research/VisiSonics audio remover |
| PowerPlans.zip | Repo: Downloads/PowerPlans.zip | Custom .pow power plan files |
| Timer Resolution | github.com/valleyofdoom/TimerResolution v1.0.0 | System clock adjustment |
| DPC Checker | softpedia.com | DPC latency checker + Win10 timer delta fix |
| OOShutUp10 (OOSU10.exe) | dl5.oo-software.com/files/ooshutup10/OOSU10.exe | Privacy/telemetry policy disabler |
| OOShutUp10 Config | Repo: Downloads/QuakedOOshutup10.cfg | Pre-configured policy file |
| dControl (Defender Control) | sordum.org | Windows Defender disabler |

Optional downloads (user-prompted):
- Open Shell Menu v4.4.191 + OpenShellTheme.xml config (Windows Search replacement)
- Nvidia Profile Inspector v2.4.0.4 + QuakedOptimizedNVProfile.nip config
- Visual C++ 2015-2022 Redistributable (x64)
- Process Destroyer 2.1 (NSudo-based advanced service disabler)
- Fortnite Optimizer Tools (DX12 + Performance Mode game configs)

---

## 3. ALL SCRIPT FILES — VERBATIM CONTENT

### 3a. AMD.bat
```batch
@echo off
set "HIVE=SYSTEM\CurrentControlSet"
reg.exe add "HKLM\%HIVE%\Services\AMD Crash Defender Service" /v "Start" /t REG_DWORD /d "4" /f >nul 2>&1
reg.exe add "HKLM\%HIVE%\Services\AMD External Events Utility" /v "Start" /t REG_DWORD /d "4" /f >nul 2>&1
reg.exe add "HKLM\%HIVE%\Services\AUEPLauncher" /v "Start" /t REG_DWORD /d "4" /f >nul 2>&1
exit
```

### 3b. Orca.bat (UpdateOrchestrator + Edge + OneDrive scheduled task disabler)
Operations performed (schtasks /Change /DISABLE then /Delete /F):

**Microsoft Edge update tasks (disabled + deleted):**
- `Microsoft\EdgeUpdate\...` (various)

**OneDrive tasks (deleted):**
- OneDrive reporting/update tasks

**Windows Update / UpdateOrchestrator tasks (deleted):**
- `Microsoft\Windows\UpdateOrchestrator\Report policies`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Maintenance Work`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Scan`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Scan Static Task`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Wake To Work`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Work`
- `Microsoft\Windows\UpdateOrchestrator\Start Oobe Expedite Work`
- `Microsoft\Windows\UpdateOrchestrator\StartOobeAppsScanAfterUpdate`
- `Microsoft\Windows\UpdateOrchestrator\StartOobeAppsScan_LicenseAccepted`
- `Microsoft\Windows\UpdateOrchestrator\UIEOrchestrator`
- `Microsoft\Windows\UpdateOrchestrator\UpdateModelTask`
- `Microsoft\Windows\UpdateOrchestrator\USO_UxBroker`
- `Microsoft\Windows\UpdateOrchestrator\UUS Failover Task`
- `Microsoft\Windows\WaaSMedic\PerformRemediation`
- `Microsoft\Windows\WindowsUpdate\Scheduled Start`

*(See also Scripting-Station System Docs/Windows Updates.md for the full schtasks list)*

### 3c. Sound.bat / Audio Bloat Remover V1.0.bat
Targets three audio stacks. No revert available — must reinstall from motherboard site.

**Realtek Audio:**
- `taskkill /F /IM RtkAudUService64.exe`
- `sc stop RtkAudioUniversalService`
- `sc delete RtkAudioUniversalService`
- Deletes matching DriverStore entries

**Sound Research:**
- `taskkill /F /IM SECOMNService.exe`
- `taskkill /F /IM SECOCL.exe`
- `sc stop SECOMNService` / `sc delete SECOMNService`
- Deletes: `SECOCL64.exe`, `SECCNH64.exe` from System32

**VisiSonics:**
- `taskkill /F /F /IM VSHelper.exe`, `VSSrv.exe`
- `sc delete VSSrv`
- Deletes: `VSHelper.exe`, `VSSrv.exe` from System32

All output → `C:\Oneclick Logs\Oneclick Log.txt`

### 3d. Wifi Fixer V3.0.bat (full verbatim)
```batch
sc config LanmanWorkstation start=demand
sc config WdiServiceHost start=demand
sc config NcbService start=demand
sc config ndu start=demand
sc config Netman start=demand
sc config netprofm start=demand
sc config WwanSvc start=demand
sc config Dhcp start=auto
sc config DPS start=auto
sc config lmhosts start=auto
sc config NlaSvc start=auto
sc config nsi start=auto
sc config RmSvc start=auto
sc config Wcmsvc start=auto
sc config Winmgmt start=auto
sc config WlanSvc start=auto
reg add "HKLM\Software\Policies\Microsoft\Windows\NetworkConnectivityStatusIndicator" /v "NoActiveProbe" /t REG_DWORD /d "0" /f
reg add "HKLM\System\CurrentControlSet\Services\NlaSvc\Parameters\Internet" /v "EnableActiveProbing" /t REG_DWORD /d "1" /f
reg add "HKLM\System\CurrentControlSet\Services\BFE" /v "Start" /t REG_DWORD /d "2" /f
reg add "HKLM\System\CurrentControlSet\Services\Dnscache" /v "Start" /t REG_DWORD /d "2" /f
reg add "HKLM\System\CurrentControlSet\Services\WinHttpAutoProxySvc" /v "Start" /t REG_DWORD /d "3" /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\vwifibus" /v "Start" /t REG_DWORD /d "3" /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\vwififlt" /v "Start" /t REG_DWORD /d "3" /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\vwifimp" /v "Start" /t REG_DWORD /d "3" /f
ipconfig /release
ipconfig /renew
arp -d *
nbtstat -R
nbtstat -RR
ipconfig /flushdns
ipconfig /registerdns
shutdown /r /t 0
```

### 3e. Nvidia Container OFF.bat
```batch
sc config NVDisplay.ContainerLocalSystem start=disabled
sc stop NVDisplay.ContainerLocalSystem
sc config NvContainerLocalSystem start=disabled
sc stop NvContainerLocalSystem
```

### 3f. Nvidia Container ON.bat
```batch
sc config NVDisplay.ContainerLocalSystem start=auto
sc start NVDisplay.ContainerLocalSystem
sc config NvContainerLocalSystem start=auto
sc start NvContainerLocalSystem
```

### 3g. Gamemode Disabler.bat
```batch
reg add "HKEY_CURRENT_USER\Software\Microsoft\GameBar" /v "AllowAutoGameMode" /t REG_DWORD /d 0 /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d 0 /f
shutdown /r /t 0
```

### 3h. Split Svchost V1.0.bat
```batch
:: Sets SvcHostSplitThresholdInKB to total RAM in KB
:: Calculated via PowerShell: (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1KB
reg add "HKLM\System\CurrentControlSet\Control" /v "SvcHostSplitThresholdInKB" /t REG_DWORD /d [RAM_IN_KB] /f
shutdown /r /t 0
```

### 3i. Disable Svchost Splitting V1.0.bat
```batch
:: Sets threshold to max DWORD — disables splitting entirely
reg add "HKLM\System\CurrentControlSet\Control" /v "SvcHostSplitThresholdInKB" /t REG_DWORD /d 4294967295 /f
shutdown /r /t 0
```

### 3j. Timer Resolution Setup V1.0.bat
BCDEdit commands applied:
```batch
bcdedit /deletevalue useplatformclock
bcdedit /set useplatformtick no
bcdedit /set disabledynamictick yes
```
Registry applied:
```batch
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" /v "GlobalTimerResolutionRequests" /t REG_DWORD /d "1" /f
```
SetTimerResolution autorun key:
```batch
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "TimerResolution" /t REG_SZ /d "C:\Timer Resolution Resources\SetTimerResolution.exe --resolution [VALUE] --no-console" /f
```
Recommended resolution values to test: 5020, 5040, 5060, 5070, 5080 (units = 100ns intervals)

### 3k. Network Tweaks V1.bat
PowerShell: `Set-NetAdapterAdvancedProperty` on active adapter:

| Property | Value |
|----------|-------|
| Flow Control | Disabled |
| IPv4 Checksum Offload | Disabled |
| IPv6 Checksum Offload | Disabled |
| TCP Checksum Offload (IPv4) | Disabled |
| TCP Checksum Offload (IPv6) | Disabled |
| UDP Checksum Offload (IPv4) | Disabled |
| UDP Checksum Offload (IPv6) | Disabled |
| Large Send Offload V2 (IPv4) | Disabled |
| Large Send Offload V2 (IPv6) | Disabled |
| Advanced EEE | Disabled |
| Energy-Efficient Ethernet | Disabled |
| Green Ethernet | Disabled |
| Power Saving Mode | Disabled |
| Wake on Magic Packet | Disabled |
| Wake on Pattern Match | Disabled |
| Receive Buffers | 512 |
| Transmit Buffers | 512 |
| Maximum RSS Queues | 4 |
| Jumbo Packet/Frame | 1514 bytes |

DNS options: DNS Jumper / Google (8.8.8.8, 8.8.4.4) / Cloudflare (1.1.1.1, 1.0.0.1)

Note: "NOT RECOMMENDED — can cause connection issues"

Revert: Import `C:\Oneclick Backup\Network\NetworkBackup1.reg` via NSudo CMD

### 3l. Windows Update Exe's Remover.bat
Removes from System32, SysWOW64, WinSxS:
- `UsoClient.exe`, `MoUsoCoreWorker.exe`, `wuauclt.exe`, `wusa.exe`
- `UpdateAgent.dll`, `UpdateCompression.dll`, `updatecsp.dll`, `updatepolicy.dll`
- `UpdateReboot.dll`, `UIEOrchestrator.exe`, `DoSvc.dll`, `SIHClient.exe`
- `WaaSMedicSvc.dll`, `WaaSMedicPS.dll`, `WaaSAssessment.dll`, `WaaSMedicAgent.exe`
- `MusUpdateHandlers.dll`, `MoNotificationUx.exe`, entire `C:\Windows\UUS` directory
- All matching WinSxS paths (wildcard patterns)

Note: "some things in C:\Windows\WinSxS won't delete even with NSudo"

### 3m. Software Protection.bat
```batch
net start sppsvc
net stop sppsvc
timeout 2 > nul
exit
```
Purpose: toggle Software Protection Platform service (license activation cycle)

### 3n. GraphicsPreferences-Priority-FSO.bat
Sets GPU preference and CPU priority per-executable via registry.

**GPU Preference key:** `HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences`
- Value: `GpuPreference=2;` = High Performance (games)
- Value: `GpuPreference=1;` = Power Saving (background apps)

**CPU Priority key:** `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\[exe]\PerfOptions`
- `CpuPriorityClass` = 3 (High) for games
- `CpuPriorityClass` = 1 (Idle/Low) for non-gaming apps

**Games set to High Performance GPU + High CPU priority (49 executables):**
Includes: Apex Legends, VALORANT, CoD (various), Fortnite, GTA V, CS2, Warzone, Overwatch 2, Rainbow Six Siege, Genshin Impact, Rust, EFT, Roblox, various launchers

**Apps set to Power Saving GPU + Low CPU priority (17 executables):**
Includes: Discord, Chrome, Steam, Battle.net launcher, Edge, Epic launcher, etc.

**FSO/Compatibility Flags key:** `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers`
- Disables DirectX maximized windowed mode
- Enables high DPI awareness per-game

---

## 4. REGISTRY KEYS — COMPLETE CATALOG

### 4a. Power Plan Registry
```
HKLM\SYSTEM\CurrentControlSet\Control\Power
  PlatformAoAcOverride  REG_DWORD  0
```
Power plan settings applied (via .pow file import + powercfg):
- Allow Away Mode Policy: No
- Allow Standby States: Off
- Allow Hybrid Sleep: Off
- Allow Throttle States: Off
- USB 3 Link Power Management: Off
- USB Selective Suspend: Disabled
- Processor performance core parking min cores: 100%
- Processor performance time check interval: 5000
- Processor idle disable: enabled (Ultimate) or disabled (Idle Off variant)

### 4b. Timer Resolution Registry
```
HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel
  GlobalTimerResolutionRequests  REG_DWORD  1

HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
  TimerResolution  REG_SZ  "C:\Timer Resolution Resources\SetTimerResolution.exe --resolution [VALUE] --no-console"
```

### 4c. Priority Separation Registry
```
HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl
  Win32PrioritySeparation  REG_DWORD  [value]
    36 (0x24) = Latency focused (recommended by Oneclick)
    42 (0x2A) = FPS focused
    26 (0x1A) = Balanced
```

### 4d. SvcHost Splitting Registry
```
HKLM\System\CurrentControlSet\Control
  SvcHostSplitThresholdInKB  REG_DWORD  [RAM in KB]   (split at RAM size = 1 svchost per service)
  SvcHostSplitThresholdInKB  REG_DWORD  4294967295    (disable splitting entirely)
```

### 4e. Game Bar / Game Mode Registry
```
HKCU\Software\Microsoft\GameBar
  AllowAutoGameMode    REG_DWORD  0
  AutoGameModeEnabled  REG_DWORD  0
```

### 4f. Search Removal — Service + EXE relocation
```
HKLM\System\CurrentControlSet\Services\UdkUserSvc
  Start  REG_DWORD  3  (revert: restore to demand)
```
EXEs moved from backup to original locations:
- `C:\Windows\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\SearchHost.exe`
- `C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\StartMenuExperienceHost.exe`
- `C:\Windows\SystemApps\ShellExperienceHost_cw5n1h2txyewy\ShellExperienceHost.exe`
- `C:\Windows\System32\taskhostw.exe`

### 4g. Windows Update Registry (Scripting-Station docs)
```
HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate
  DeferUpdatePeriod           REG_DWORD  1
  DeferUpgrade                REG_DWORD  1
  DeferUpgradePeriod          REG_DWORD  1
  DisableWindowsUpdateAccess  REG_DWORD  1

HKLM\SOFTWARE\Microsoft\WindowsUpdate\UpdatePolicy\Settings
  PausedFeatureStatus  REG_DWORD  0
  PausedQualityStatus  REG_DWORD  0

HKLM\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings
  FlightSettingsMaxPauseDays      REG_DWORD  3650
  PauseFeatureUpdatesEndTime      REG_SZ     "3000-11-06T14:03:37Z"
  PauseFeatureUpdatesStartTime    REG_SZ     "2023-11-06T14:03:37Z"
  PauseQualityUpdatesEndTime      REG_SZ     "3000-11-06T14:03:37Z"
  PauseQualityUpdatesStartTime    REG_SZ     "2023-11-06T14:03:37Z"
  PauseUpdatesExpiryTime          REG_SZ     "3000-11-06T14:03:37Z"
  PauseUpdatesStartTime           REG_SZ     "2023-11-06T14:03:37Z"

HKLM\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc
  Start  REG_DWORD  4  (disabled — only disableable via reg, not sc)
```

### 4h. Nvidia GPU Registry (HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000)
The Gpu Tweaks V3.0.bat applies 80+ registry values under the Nvidia driver class key. Categories:

**Power management (disabled):**
- GC6 (GPU power gating for idle)
- ASPM (Active State Power Management)
- D3 states / runtime power management
- HD Audio D3Cold
- Various gating mechanisms (engine, clock slowdown)
- RmElcg = 1431655765 (engine-level clock gating)

**Logging/diagnostics (disabled):**
- Hardware fault buffer: `RmDisableHwFaultBuffer`
- Advanced error reporting
- Error checking
- DisplayDriverRAS components (deleted from filesystem)

**Telemetry (disabled/removed):**
- Telemetry data collection keys
- NvBackend startup entry removal from `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
- NvCamera driver deletion from System32

**UI/overlays (disabled):**
- ShowDlssIndicator = 0
- Driver notification overlays
- Tray icons
- Context menu: `reg delete "HKCR\DesktopBackground\Shell\NvidiaContainer" /f`

**Performance:**
- Forces P0 (maximum) performance state
- Memory allocation optimization
- Disables NvBackend startup

**Backup:** `C:\Nvidia GPU Tweaks\Backup\Nvidia.reg` (backup of original driver key)
**Log:** `C:\Nvidia GPU Tweaks\Nvidia Log.txt`

### 4i. Network / Wifi Registry
```
HKLM\Software\Policies\Microsoft\Windows\NetworkConnectivityStatusIndicator
  NoActiveProbe  REG_DWORD  0  (re-enable in wifi fixer)

HKLM\System\CurrentControlSet\Services\NlaSvc\Parameters\Internet
  EnableActiveProbing  REG_DWORD  1  (re-enable in wifi fixer)

HKLM\System\CurrentControlSet\Services\BFE
  Start  REG_DWORD  2  (auto — wifi fixer)

HKLM\System\CurrentControlSet\Services\Dnscache
  Start  REG_DWORD  2  (auto — wifi fixer)

HKLM\System\CurrentControlSet\Services\WinHttpAutoProxySvc
  Start  REG_DWORD  3  (demand — wifi fixer)

HKLM\SYSTEM\CurrentControlSet\Services\vwifibus
HKLM\SYSTEM\CurrentControlSet\Services\vwififlt
HKLM\SYSTEM\CurrentControlSet\Services\vwifimp
  Start  REG_DWORD  3  (demand — wifi fixer)
```

### 4j. AMD Services Registry
```
HKLM\SYSTEM\CurrentControlSet\Services\AMD Crash Defender Service
  Start  REG_DWORD  4

HKLM\SYSTEM\CurrentControlSet\Services\AMD External Events Utility
  Start  REG_DWORD  4

HKLM\SYSTEM\CurrentControlSet\Services\AUEPLauncher
  Start  REG_DWORD  4
```

---

## 5. SERVICE CHANGES — COMPLETE LIST

Registry start type values: 0=Boot, 1=System, 2=Auto, 3=Demand/Manual, 4=Disabled

### 5a. Services set to DISABLED (start=4 or sc disabled)

From Scripting-Station/System Docs/Services.md — comprehensive list:

AarSvc, AJRouter, ALG, ADPSvc, AppIDSvc, Appinfo, AppMgmt, AppReadiness, AppXSvc,
AssignedAccessManagerSvc, autotimesvc, AxInstSV, BDESVC, BFE, BITS,
BTAGService, BthAvctpSvc, bthserv, CaptureService, cbdhsvc, CDPSvc, CDPUserSvc,
CertPropSvc, ClipSVC, CloudBackupRestoreSvc, COMSysApp, ConsentUxUserSvc,
CredentialEnrollmentManagerUserSvc, CscService, dcsvc, DeviceAssociationBrokerSvc,
DeviceAssociationService, DeviceInstall, DevicePickerUserSvc, DevicesFlowUserSvc,
DevQueryBroker, diagnosticshub.standardcollector.service, DiagTrack, diagsvc,
DispBrokerDesktopSvc, DisplayEnhancementService, DmEnrollmentSvc, dmwappushservice,
dot3svc, DoSvc, DPS, DsmSvc, DsSvc, DusmSvc, Eaphost, edgeupdate, edgeupdatem,
EFS, embeddedmode, EntAppSvc, EventLog, EventSystem, fdPHost, FDResPub, fhsvc,
FontCache, FrameServer, FrameServerMonitor, GameInputSvc, GraphicsPerfSvc,
hidserv, hpatchmon, HvHost, icssvc, IKEEXT, InstallService, InventorySvc,
IpxlatCfgSvc, KeyIso, KtmRm, LanmanServer, LanmanWorkstation, lfsvc, LocalKdc,
LicenseManager, lltdsvc, lmhosts, LxpSvc, MapsBroker, McmSvc,
McpManagementService, MessagingService, MicrosoftEdgeElevationService, midisrv,
MSDTC, MSiSCSI, wuqisvc, NaturalAuthentication, NcaSvc, NcbService, NcdAutoSetup,
ndu, Netlogon, Netman, NetSetupSvc, NetTcpPortSharing, NgcCtnrSvc, NgcSvc,
NlaSvc, NPSMSvc, OneSyncSvc, p2pimsvc, p2psvc, P9RdrService, PcaSvc,
PeerDistSvc, PenService, perceptionsimulation, PerfHost, PhoneSvc,
PimIndexMaintenanceSvc, pla, PNRPAutoReg, PNRPsvc, PolicyAgent,
PrintDeviceConfigurationService, PrintNotify, PrintScanBrokerService,
PrintWorkflowUserSvc, PushToInstall, QWAVE, RasAuto, RasMan, refsdedupsvc,
RemoteAccess, RemoteRegistry, RetailDemo, RmSvc, RpcLocator, SamSs, SCardSvr,
ScDeviceEnum, SCPolicySvc, SDRSVC, seclogon, SENS, Sense, SensorDataService,
SensorService, SensrSvc, SEMgrSvc, SessionEnv, SgrmBroker, SharedAccess,
SharedRealitySvc, ShellHWDetection, shpamsvc, SmsRouter, smphost, SNMPTrap,
Spooler, SSDPSRV, ssh-agent, SstpSvc, stisvc, StorSvc, svsvc, SysMain,
SystemEventsBroker, TapiSrv, TermService, Themes, TieringEngineService, TrkWks,
TroubleshootingSvc, tzautoupdate, UdkUserSvc, UevAgentService, uhssvc,
UmRdpService, UnistoreSvc, upnphost, UserDataSvc, UsoSvc, VaultSvc, vds,
vmicguestinterface, vmicheartbeat, vmickvpexchange, vmicrdv, vmicshutdown,
vmictimesync, vmicvmsession, vmicvss, W32Time, WaaSMedicSvc, WalletService,
WarpJITSvc, wbengine, WbioSrvc, Wcmsvc, wcncsvc, WdiServiceHost, WdiSystemHost,
WebClient, webthreatdefsvc, webthreatdefusersvc, Wecsvc, WEPHOSTSVC,
wercplsupport, WerSvc, WFDSConMgrSvc, whesvc, WiaRpc, WinRM, wisvc, WlanSvc,
wlidsvc, wlpasvc, WManSvc, wmiApSrv, WMPNetworkSvc, workfolderssvc, WpcMonSvc,
WPDBusEnum, WpnService, WpnUserService, WSearch, Wuauserv, WwanSvc,
XblAuthManager, XblGameSave, XboxGipSvc, XboxNetApiSvc

Also disabled via registry (set Start=4, cannot use sc):
AppXSvc, BcastDVRUserService, BFE, BluetoothUserService, CaptureService,
cbdhsvc, CDPUserSvc, ClipSVC, CloudBackupRestoreSvc, ConsentUxUserSvc,
CredentialEnrollmentManagerUserSvc, DeviceAssociationBrokerSvc, DevicePickerUserSvc,
DevicesFlowUserSvc, DoSvc, EntAppSvc, embeddedmode, MessagingService, NgcSvc,
NgcCtnrSvc, NPSMSvc, OneSyncSvc, P9RdrService, PenService, PrintWorkflowUserSvc,
PimIndexMaintenanceSvc, SgrmBroker, TimeBrokerSvc, UdkUserSvc, UserDataSvc,
UnistoreSvc, WaaSMedicSvc, webthreatdefusersvc, WpnUserService, WinHttpAutoProxySvc

### 5b. AMD-specific services disabled (AMD.bat)
- AMD Crash Defender Service → Start=4
- AMD External Events Utility → Start=4
- AUEPLauncher → Start=4

### 5c. Nvidia-specific services disabled (Nvidia Container OFF.bat)
- NVDisplay.ContainerLocalSystem → disabled (stop + config)
- NvContainerLocalSystem → disabled (stop + config)

### 5d. Services kept AUTO (critical — must not be disabled)
AudioEndpointBuilder, AudioSrv, BrokerInfrastructure, CoreMessagingRegistrar,
CryptSvc, Dhcp, Dnscache, DcomLaunch, RpcEptMapper, RpcSs, Schedule,
StateRepository, TextInputManagementService, UserManager, Winmgmt

Note: CoreMessagingRegistrar disabled = boot loop. DcomLaunch disabled = no Windows boot.

### 5e. Services kept DEMAND/MANUAL
camsvc, cloudidsvc, defragsvc, msiserver, netprofm, PlugPlay, SecurityHealthService,
TrustedInstaller, VacSvc, VSS, WdNisSvc

### 5f. Key individual service notes
- **WaaSMedicSvc** (Windows Update Medic): cannot be disabled via sc. Must use reg Start=4
- **AppXSvc** (AppX Deployment Service): disabled → breaks Notepad++ (fix: re-enable via reg)
- **Appinfo**: disabled alongside UAC. Re-enable via Safe Mode boot to restore UAC
- **TimeBrokerSvc**: disabled → breaks Task Scheduler
- **EventLog** disabled → not needed functionally but breaks some system tools
- **Spooler** disabled → printing disabled
- **WlanSvc** disabled → Wi-Fi disabled (restore with Wifi Fixer)
- **bthserv, BTAGService, BthAvctpSvc** disabled → Bluetooth disabled (hard to revert)

---

## 6. SCHEDULED TASK MODIFICATIONS

All tasks below are deleted (`schtasks /Delete /TN "..." /F`):

### Windows Update / UpdateOrchestrator
- `Microsoft\Windows\UpdateOrchestrator\Report policies`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Maintenance Work`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Scan`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Scan Static Task`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Wake To Work`
- `Microsoft\Windows\UpdateOrchestrator\Schedule Work`
- `Microsoft\Windows\UpdateOrchestrator\Start Oobe Expedite Work`
- `Microsoft\Windows\UpdateOrchestrator\StartOobeAppsScanAfterUpdate`
- `Microsoft\Windows\UpdateOrchestrator\StartOobeAppsScan_LicenseAccepted`
- `Microsoft\Windows\UpdateOrchestrator\UIEOrchestrator`
- `Microsoft\Windows\UpdateOrchestrator\UpdateModelTask`
- `Microsoft\Windows\UpdateOrchestrator\USO_UxBroker`
- `Microsoft\Windows\UpdateOrchestrator\UUS Failover Task`
- `Microsoft\Windows\WaaSMedic\PerformRemediation`
- `Microsoft\Windows\WindowsUpdate\Scheduled Start`

### Microsoft Edge
- Various EdgeUpdate scheduled tasks (disabled + deleted)

### OneDrive
- OneDrive reporting and update tasks (deleted)

### Additional (from Changelog and Autologger Destroyer)
- Autologger-related tasks
- Various telemetry and diagnostic tasks

---

## 7. BCDEDIT COMMANDS

Applied by Timer Resolution Setup V1.0.bat and documented in Timer Resolution Options.md:

```batch
bcdedit /deletevalue useplatformclock
bcdedit /set useplatformtick no
bcdedit /set disabledynamictick yes
```

Purpose:
- `useplatformclock` removed: stop using HPET/legacy platform clock
- `useplatformtick no`: disable platform tick
- `disabledynamictick yes`: prevent Windows from dynamically adjusting timer frequency

These ensure the high-resolution timer (`SetTimerResolution.exe`) operates consistently.

---

## 8. PERFORMANCE TWEAKS

### 8a. CPU / Scheduler
```
HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl
  Win32PrioritySeparation = 36 (Latency) or 42 (FPS) or 26 (Balanced)
```
- Per-process CPU priority: CpuPriorityClass=3 (High) for games, =1 (Idle) for background apps
- Core Parking disabled (processor performance core parking min cores = 100%)
- Idle States disabled in "Idle Off" power plan variant

### 8b. System Timer
- `GlobalTimerResolutionRequests = 1` (global timer — Win 11 only)
- SetTimerResolution.exe at startup with custom value (recommended: ~5040)
- BCDEdits above applied
- DPC Checker used on Win 10 for delta fixing

### 8c. GPU (Nvidia)
- P0 performance state forced
- 80+ registry tweaks under `HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}`
- Engine gating disabled: `RMElcg = 1431655765`
- ASPM, GC6, D3 states, HD Audio D3Cold all disabled
- NvBackend removed from startup
- DLSS indicator hidden
- Context menu NvidiaContainer entry removed: `HKCR\DesktopBackground\Shell\NvidiaContainer`
- NvidiaProfileInspector: imports `QuakedOptimizedNVProfile.nip` (custom profile)
- Nvidia containers (Control Panel, App/Overlays) optionally disabled

### 8d. GPU (AMD)
- AMD Crash Defender Service, AMD External Events Utility, AUEPLauncher → Start=4

### 8e. Power Plan
Two custom plans imported:
1. **Quaked Ultimate Performance** — Ultimate Performance base + no standby/throttle/core parking
2. **Quaked Ultimate Performance Idle Off** — Same + processor idle disabled (caution: high heat/power)

### 8f. Memory / Process
- SvcHostSplitThresholdInKB set to total RAM (or max DWORD to disable splitting)
- SysMain (Superfetch) disabled
- Various memory-consuming services disabled

### 8g. Network (optional, NOT recommended)
- 20+ NIC offloading features disabled
- Buffers reduced to 512
- See Section 3k for full list
- Applied via `Set-NetAdapterAdvancedProperty` PowerShell

### 8h. DPC/ISR (interrupt latency)
- DPC Checker tool included (softpedia — not open source)
- Used to measure and fix DPC latency
- On Win 10: DPC Checker must stay open to restore timer resolution behavior
- BCDEdits (dynamic tick disabled) reduce interrupt coalescing
- Nvidia Container disabled removes continuous NVDPC interrupt source
- Timer resolution directly reduces scheduler tick interval → lower DPC scheduling latency

---

## 9. PRIVACY / TELEMETRY

### 9a. DiagTrack (Connected User Experiences and Telemetry)
- Service disabled: `DiagTrack` → Start=4
- Also disabled as Autologger via `HKLM\SYSTEM\CurrentControlSet\Control\WMI\Autologger\Diagtrack-Listener`

### 9b. OOShutUp10++ (OOSU10.exe + QuakedOOshutup10.cfg)
Applies ~300+ privacy policy settings via pre-configured .cfg file. Categories:
- P codes (P001-P081): Core privacy + system settings
- A codes (A001-A006): Additional configs
- S codes (S001-S014): Service-related settings
- E codes (E001-E228): Extended privacy options
- Y codes (Y001-Y007): Additional system options
- C codes (C002-C201): Configuration settings
- L codes (L001-L005): Local settings
- U codes (U001-U007): User settings
- W codes (W001-W011): Windows-related options
- M codes (M001-M024): Mixed settings
- K, N, O codes: Additional options

Executed silently: `OOSU10.exe QuakedOOshutup10.cfg /quiet`

### 9c. Windows Defender
Option to fully disable via dControl (Sordum). Process:
1. User disables Real Time Protection + Tamper Protection manually
2. Oneclick installs + opens dControl
3. User confirms full disable

Known issues if Defender kept: Windows Security infinite black screen, aggressive flagging of tweak tools

### 9d. Autologger Destroyer
Disables WMI autologgers at: `HKLM\SYSTEM\CurrentControlSet\Control\WMI\Autologger\[name]`
Set `Start = 0` (disabled) for all listed loggers.

Full autologger list (40+):
Cellcore, DefenderApiLogger, DefenderAuditLogger, DiagLog, EventLog-Application,
EventLog-Security, EventLog-System, FilterMgr-Logger, NetCore, RadioMgr, TileStore,
Tpm, TPMProvisioningService, CloudExperienceHostOobe, Diagtrack-Listener, ...
(and ~30 more)

**Keep enabled (critical):**
- EventLog-Application, EventLog-System → required for Windows 11 File Explorer
- Tpm, TPMProvisioningService → may affect anti-cheat
- DiagLog → affects Diagnostic Policy Service (Minecraft compatibility)

**Require NSudo for modification:**
- DefenderApiLogger, DefenderAuditLogger, EventLog-Security, NetCore, RadioMgr

### 9e. dmwappushservice
Disabled: WAP Push Message Routing Service (telemetry delivery)

### 9f. IPv6 disabled
Oneclick natively disables IPv6. Revert: `IPv6 Reenable.bat` or manual

### 9g. NCSI/Active Probing disabled
```
HKLM\Software\Policies\Microsoft\Windows\NetworkConnectivityStatusIndicator
  NoActiveProbe = 1 (disabled by Oneclick, set to 0 to revert)
HKLM\System\CurrentControlSet\Services\NlaSvc\Parameters\Internet
  EnableActiveProbing = 0 (disabled by Oneclick, set to 1 to revert)
```

---

## 10. APPX / MICROSOFT APP REMOVAL

Oneclick removes the following Microsoft/Xbox/Store components:

### Removed permanently (EXE deletion + service disable):
- Microsoft Edge (EdgeUpdate service, MicrosoftEdgeElevationService)
- OneDrive (service + scheduled tasks)
- Microsoft Store (AppXSvc disabled, related tasks removed)
- Xbox Game Bar: `GameBarPresenceWriter.exe`, `GameBarPresenceWriter.proxy.dll`
- Xbox DVR: `GameChatOverlayExt.dll`, `GameChatTranscription.dll`
- Xbox Gaming: `XblAuthManager.dll`, `XblGameSave.dll`, `XblGameSaveExt.dll`, `XboxNetApiSvc.dll`
- Xbox services: XblAuthManager, XblGameSave, XboxGipSvc, XboxNetApiSvc → Start=4
- SmartScreen: `CHXSmartScreen.exe`, `smartscreen.exe` (backed up before removal)
- LockApp: `LockApp.exe` (backed up)
- Sync Programs: `mobsync.exe` (backed up)
- Windows Search: `SearchHost.exe`, `StartMenuExperienceHost.exe`, `ShellExperienceHost.exe`, `taskhostw.exe` — moved to backup
- Copilot: disabled
- Clipboard history: disabled
- Widgets: disabled
- Snipping Tool shortcut: Win+Shift+S disabled
- Sticky Keys: disabled
- Storage Sense: disabled
- Printing (Spooler service disabled)
- Virtual Hard Disk support
- Hyper-V Support / Virtualization
- UAC (User Account Control) — disabled (Appinfo service disabled)

### PowerShell AppX re-registration (revert method only)
Microsoft apps can be re-registered via:
```powershell
Get-AppxPackage -AllUsers | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"}
```

---

## 11. UNIQUE / ADVANCED TWEAKS NOT IN WIN11DEBLOAT OR PC-TUNING

### 11a. Nvidia Driver Registry (80+ keys under {4d36e968...})
Most tools touch a few Nvidia registry keys. Oneclick/Quaked applies 80+ under the driver class key — engine gating constants (`RMElcg = 1431655765`), fault buffers, telemetry DLL removal from System32, DisplayDriverRAS deletion.

### 11b. SvcHost Splitting Threshold = RAM Size
`SvcHostSplitThresholdInKB` set to total installed RAM in KB. This forces one service per svchost.exe process (like the default behavior when RAM > threshold), reducing service co-tenancy. Most tools ignore this. The "disable splitting" variant (max DWORD) goes the other direction.

### 11c. Per-Process GPU Preference + CPU Priority (GraphicsPreferences-Priority-FSO.bat)
Systematic application of:
- `HKCU\SOFTWARE\Microsoft\DirectX\UserGpuPreferences` per executable
- `HKLM\...Image File Execution Options\[exe]\PerfOptions\CpuPriorityClass` per executable

49 games → High GPU + High CPU. 17 background apps → Power Saving GPU + Low CPU. FSO compatibility flags applied. Most debloat tools don't touch IFEO PerfOptions.

### 11d. GlobalTimerResolutionRequests = 1 (Win 11 specific)
Restores pre-Win10-2004 global timer resolution behavior. Paired with BCDEdits. Win10 2004+ broke this; Win 11 can re-enable it via this key. Most tools don't document this correctly.

### 11e. Autologger Destroyer (40+ WMI Autologgers)
`HKLM\SYSTEM\CurrentControlSet\Control\WMI\Autologger\[name] → Start=0`
Disables ETW (Event Tracing for Windows) providers that run at boot continuously. Most debloat tools touch DiagTrack but not the full autologger set. Quaked documents which ones are safe to disable vs. critical (EventLog, Tpm, DiagLog).

### 11f. Windows Update Medic Service (WaaSMedicSvc) via Registry
Cannot be disabled via `sc config`. Must use:
```
HKLM\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc → Start = 4
```
Many tools attempt `sc config WaaSMedicSvc start=disabled` and silently fail. Oneclick uses the registry path.

### 11g. BCD: useplatformtick + disabledynamictick + deletevalue useplatformclock
Three-part BCDEdit combo for consistent high-res timer behavior. Most timer resolution guides only set `disabledynamictick`. Quaked adds `useplatformtick no` and removes `useplatformclock`.

### 11h. Nvidia Container Context Menu Toggle
Adds right-click desktop option to toggle Nvidia Container on/off:
```
HKCR\DesktopBackground\Shell\NvidiaContainer
```
With sub-entries for "Nvidia Container ON" and "Nvidia Container OFF" pointing to the respective .bat files.

### 11i. Search Removal by EXE Relocation (not just service disable)
Instead of only disabling the UdkUserSvc service, Oneclick physically moves:
- SearchHost.exe, StartMenuExperienceHost.exe, ShellExperienceHost.exe, taskhostw.exe
to a backup directory. This is deeper than a policy disable and requires EXE restore + edge install for 24H2+ (web2 dependency).

### 11j. Audio Bloat Removal (Realtek/Sound Research/VisiSonics)
Targets three audio stacks at once: kills processes, deletes services, removes DriverStore entries. No other mainstream tool does this systematically for Sound Research (SECOMNService, SECOCL) and VisiSonics (VSSrv).

### 11k. OOShutUp10 Config with 300+ settings
Pre-configured .cfg file with 300+ telemetry/privacy toggles applied silently. More granular than most approaches (covers E001-E228 extended privacy keys, service-level S codes, etc.).

### 11l. Power Plan with Standby + Throttle States + Core Parking all disabled
The "Quaked Ultimate Performance" .pow file is a modified version of Microsoft's Ultimate Performance plan with additional modifications:
- Standby States Off
- Throttle States Off
- Core Parking min = 100% (all cores always active)
Combined with the "Idle Off" variant that also disables processor idle states.

---

## 12. UNSUPPORTED / BROKEN FEATURES AFTER RUNNING

| Feature | Status | Revert |
|---------|--------|--------|
| Microsoft Store | Removed | Reinstall Windows or re-register AppX |
| Microsoft Edge | Removed | Manual reinstall |
| OneDrive | Removed | Manual reinstall |
| Xbox Game Bar / DVR / App | Removed | Restore backup files |
| Minecraft Bedrock/Store | Broken | Use Java + Lunar/Badlion client |
| Wi-Fi | Disabled | Wi-Fi Fixer V3.0 |
| Bluetooth | Disabled | Complex — re-enable many services |
| VPN (Exitlag, Cloudflare Warp) | May break | Wi-Fi Fixer may help |
| Nvidia Control Panel | Disabled | Nvidia Container ON.bat |
| Nvidia App / Clipping / Overlays | Disabled | Nvidia Container ON.bat |
| UAC | Disabled | Safe Mode → re-enable AppInfo + UAC reg |
| Notepad++ | Broken | Re-enable AppXSvc via reg |
| Rockstar Games Launcher | Broken | Re-enable RockstarService + Wi-Fi |
| Razer Synapse/Chroma | Broken | Re-enable Razer services (still reportedly broken) |
| Logitech GHUB | Disabled | Re-enable logi_lamparray_service + LGHUBUpdaterService |
| Opera Browser | Broken | Unknown driver/service dependency |
| Spotify (Store version) | May break | Use website version |
| Task Scheduler | Deleted tasks | Restore from TaskSchedulerBackup.reg |
| Windows Updates | Disabled | Revert Update Disabler reg keys |
| Snipping Tool (Win+Shift+S) | Disabled | Use LightShot / Free Snipping Tool |
| Clipboard history | Disabled | Use ClipClip or Ditto |
| IPv6 | Disabled | IPv6 Reenable.bat |
| Power Saving / Hibernation | Disabled | Manual re-enable |
| Storage Sense | Disabled | — |
| Printing | Disabled (Spooler) | Re-enable Spooler |
| Hyper-V / Virtualization | Disabled | — |
| HVCI / Core Isolation | Disabled | Re-enable HypervisorEnforcedCodeIntegrity key |

---

## 13. BACKUP SYSTEM

Oneclick creates backups before modifications:

| What | Location |
|------|---------|
| Registry hives (HKCC, HKCR, HKCU, HKLM, HKU) | `C:\Oneclick Backup\` |
| Network registry backup | `C:\Oneclick Backup\Network\NetworkBackup1.reg` |
| Nvidia driver registry | `C:\Nvidia GPU Tweaks\Backup\Nvidia.reg` |
| Search EXEs | `C:\Oneclick Tools\Backup\Search\` |
| Xbox EXEs | `C:\Oneclick Tools\Backup\Xbox\` |
| Smartscreen EXEs | `C:\Oneclick Tools\Backup\Smartscreen\` |
| Task Scheduler | `System Backup/Task Scheduler/Win 11 22H2/TaskSchedulerBackup.reg` |
| Autologger | `System Backup/Autologger/Win 11 22H2/AutologgerBackup.reg` |
| Windows Update files | `C:\Oneclick Tools\Backup\WU\` |

---

## 14. REPO STRUCTURE SUMMARY

```
QuakedK/Oneclick (main repo — executable + docs)
  README.md, Changelog.md, Version.md (V8.3), License, Unsupported Features.md
  Downloads/
    AMD.bat, Orca.bat, Sound.bat          <- Open scripts
    QuakedOOshutup10.cfg                   <- OOShutUp10 config (300+ settings)
    QuakedOptimizedNVProflie.nip           <- Nvidia Profile Inspector profile
    OneclickTools.zip, PowerPlans.zip      <- Bundled tools
    Revert/                                <- WiFi Fixer, Enable Optional Features, Enable Devices
    V7.5/, V8.0/                           <- Archived version downloads
  Help/
    Audio Bloat Remover.md, Device Manager Tweaks.md
    Network Tweaks.md, Oneclick Fixes.md, Oneclick Recommendations.md
    Oneclick Revert.md, Oneclick Tools Help.md, Optional Features.md
    Power Plan Options.md, Priority Separation Options.md
    Search Removal Options.md, Supported Windows Versions.md
    Timer Resolution Options.md, Windows Defender Options.md

QuakedK/Scripting-Station (supplemental scripts + docs)
  Scripts/
    Nvidia GPU/Nvidia Tweaks/Gpu Tweaks V3.0.bat    <- 80+ Nvidia reg tweaks
    Priority/GraphicsPreferences-Priority-FSO.bat    <- Per-game GPU/CPU priority
    Split Schost/Split Svchost V1.0.bat
    Split Schost/Disable Svchost Splitting V1.0.bat
    Windows Updates/Windows Update Exe's Remover.bat
    Software Protection/Software Protection.bat
    Power Plan/(Quaked) Power Plan Import.bat
  System Docs/
    Services.md         <- Full 200+ service list with start types
    Windows Autologgers.md
    Priority Separation.md
    Split Svchost.md, Windows Updates.md, Timer Resolution.md, Taskbar.md
  System Backup/
    Autologger, Search, Smartscreen, Sync Programs, Task Scheduler,
    Windows Update Files, Xbox Files, Services Registry Backups (Win 11 22H2)

QuakedK/Downloads (standalone tools)
  Network Tweaks.cmd / Network Tweaks V1.bat
  Gpu Tweaks V3.0.bat
  AMD Bloat.bat
  Nvidia Container ON/OFF.bat
  Gamemode Disabler.bat, LTD V1.0.bat
  Wifi Fixer V3.0.bat
  Various service enablers/disablers

QuakedK/Process-Destroyer (optional extreme service disabler — not default)
  Uses NSudo to disable 30+ additional services beyond Oneclick's defaults
  Documents what services can't be deleted even with NSudo
```

---

## Sources

- https://github.com/QuakedK/Oneclick
- https://github.com/QuakedK/Scripting-Station
- https://github.com/QuakedK/Downloads
- https://github.com/QuakedK/Process-Destroyer
- All raw file URLs accessed via raw.githubusercontent.com
