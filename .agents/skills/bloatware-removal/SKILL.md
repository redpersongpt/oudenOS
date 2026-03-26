---
name: bloatware-removal
description: Remove pre-installed UWP applications, provisioned packages, Windows Store apps, and unnecessary inbox services to reduce memory usage and background CPU load.
---

# Bloatware Removal Skill

## Overview
This skill removes unnecessary Windows inbox apps, provisioned packages, and background services that consume RAM and CPU time without providing value to a gamer.

---

## 1. Remove UWP Apps (AppX Packages)

### Common Bloatware to Remove
```powershell
$bloatware = @(
    "Microsoft.3DBuilder",
    "Microsoft.BingFinance",
    "Microsoft.BingNews",
    "Microsoft.BingSports",
    "Microsoft.BingWeather",
    "Microsoft.GetHelp",
    "Microsoft.Getstarted",
    "Microsoft.MicrosoftOfficeHub",
    "Microsoft.MicrosoftSolitaireCollection",
    "Microsoft.MixedReality.Portal",
    "Microsoft.Office.OneNote",
    "Microsoft.People",
    "Microsoft.SkypeApp",
    "Microsoft.Wallet",
    "Microsoft.WindowsMaps",
    "Microsoft.Xbox.TCUI",
    "Microsoft.XboxApp",
    "Microsoft.XboxGameOverlay",
    "Microsoft.XboxGamingOverlay",
    "Microsoft.XboxIdentityProvider",
    "Microsoft.XboxSpeechToTextOverlay",
    "Microsoft.YourPhone",
    "Microsoft.ZuneVideo",
    "Microsoft.ZuneMusic",
    "Microsoft.Teams"
)

foreach ($app in $bloatware) {
    Get-AppxPackage -Name $app -AllUsers | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online | Where-Object { $_.PackageName -like "*$app*" } |
        Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
}
```

---

## 2. Remove Provisioned Packages (Prevents Reinstall on New Users)

```powershell
# List all provisioned packages
Get-AppxProvisionedPackage -Online | Select DisplayName, PackageName

# Remove a specific provisioned package
Get-AppxProvisionedPackage -Online |
    Where-Object { $_.DisplayName -like "*SkypeApp*" } |
    Remove-AppxProvisionedPackage -Online
```

---

## 3. Disable Xbox Game Bar & Overlay

```powershell
# Disable Xbox Game Bar (not needed if not streaming)
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" `
    -Name "AllowGameDVR" -Value 0 -Type DWord

# Disable GameBarPresenceWriter
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter" `
    -Name "ActivationType" -Value 0 -Type DWord

# Kill Xbox services
$xboxServices = @("XblAuthManager", "XblGameSave", "XboxGipSvc", "XboxNetApiSvc")
foreach ($svc in $xboxServices) {
    Stop-Service $svc -Force -ErrorAction SilentlyContinue
    Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
}
```

---

## 4. Disable Unnecessary Windows Services

```powershell
$unnecessaryServices = @(
    "DiagTrack",            # Telemetry
    "dmwappushservice",     # WAP Push Message Routing (telemetry)
    "WSearch",              # Windows Search (disable if not needed)
    "SysMain",              # Superfetch
    "RetailDemo",           # Retail Demo Service
    "MapsBroker",           # Downloaded Maps Manager
    "lfsvc",                # Geolocation Service
    "SharedAccess",         # Internet Connection Sharing
    "WMPNetworkSvc",        # Windows Media Player network sharing
    "icssvc",               # Windows Mobile Hotspot
    "WerSvc",               # Windows Error Reporting
    "Fax",                  # Fax service
    "TapiSrv",              # Telephony
    "PrintNotify",          # Printer notifications (if no printer)
    "Spooler"               # Print Spooler (if no printer)
)

foreach ($svc in $unnecessaryServices) {
    Stop-Service $svc -Force -ErrorAction SilentlyContinue
    Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Host "Disabled: $svc"
}
```

---

## 5. Remove Optional Windows Features

```powershell
# See installed optional features
Get-WindowsOptionalFeature -Online | Where-Object { $_.State -eq "Enabled" } |
    Select FeatureName | Sort FeatureName

# Disable specific unused features
$unusedFeatures = @(
    "MediaPlayback",          # Windows Media Player
    "WindowsMediaPlayer",
    "Internet-Explorer-Optional-amd64",
    "WorkFolders-Client",
    "FaxServicesClientPackage",
    "MicrosoftWindowsPowerShellV2Root"
)

foreach ($feature in $unusedFeatures) {
    Disable-WindowsOptionalFeature -Online -FeatureName $feature -NoRestart -ErrorAction SilentlyContinue
}
```

---

## 6. Clean Up Startup Programs

```powershell
# List startup programs
Get-CimInstance Win32_StartupCommand | Select Name, Command, Location | Format-Table -AutoSize

# Disable via registry
$startupKeys = @(
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
)
foreach ($key in $startupKeys) {
    Get-ItemProperty $key -ErrorAction SilentlyContinue | 
        Format-List  # Review before deleting!
}
```

---

## Verification
```powershell
# Verify removed apps are gone
Get-AppxPackage -Name "Microsoft.XboxApp" -AllUsers
# Should return empty

# Check service states
Get-Service DiagTrack, SysMain, WSearch | Select Name, Status, StartType
```

---

## References
- [O&O ShutUp10](https://www.oo-software.com/en/shutup10) — GUI privacy/bloat tool
- [Debloat Windows 10](https://github.com/W4RH4WK/Debloat-Windows-10)
