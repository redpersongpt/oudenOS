# bloatware-cleaner

**Purpose**: Remove UWP bloatware, disable Xbox services, and clean startup entries.

**Skills Used**: `bloatware-removal`, `privacy-hardening`

---

## Trigger
User says: "remove bloatware", "clean up Windows", "disable Xbox", "slow startup".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/bloatware-removal/SKILL.md
view_file: .agents/skills/privacy-hardening/SKILL.md
```

### Step 2: List Installed UWP Apps
```powershell
# Show all installed AppX packages
Get-AppxPackage -AllUsers | Select Name, PackageFullName | Sort Name | Format-Table -AutoSize
```

### Step 3: Remove Common Bloatware
```powershell
$bloatware = @(
    "Microsoft.3DBuilder", "Microsoft.BingNews", "Microsoft.BingSports",
    "Microsoft.BingFinance", "Microsoft.BingWeather", "Microsoft.GetHelp",
    "Microsoft.Getstarted", "Microsoft.MicrosoftOfficeHub",
    "Microsoft.MicrosoftSolitaireCollection", "Microsoft.MixedReality.Portal",
    "Microsoft.People", "Microsoft.SkypeApp", "Microsoft.Wallet",
    "Microsoft.WindowsMaps", "Microsoft.Xbox.TCUI", "Microsoft.XboxApp",
    "Microsoft.XboxGameOverlay", "Microsoft.XboxGamingOverlay",
    "Microsoft.XboxIdentityProvider", "Microsoft.YourPhone",
    "Microsoft.ZuneVideo", "Microsoft.ZuneMusic", "Microsoft.Teams"
)

foreach ($app in $bloatware) {
    $pkg = Get-AppxPackage -Name $app -AllUsers -ErrorAction SilentlyContinue
    if ($pkg) {
        Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers -ErrorAction SilentlyContinue
        Write-Host "Removed: $app"
    }
}
```

### Step 4: Disable Xbox Services
```powershell
@("XblAuthManager", "XblGameSave", "XboxGipSvc", "XboxNetApiSvc") | ForEach-Object {
    Stop-Service $_ -Force -ErrorAction SilentlyContinue
    Set-Service $_ -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Host "Disabled: $_"
}
```

### Step 5: Disable Unnecessary Services
```powershell
@("DiagTrack", "SysMain", "MapsBroker", "lfsvc", "WerSvc", "RetailDemo") | ForEach-Object {
    Stop-Service $_ -Force -ErrorAction SilentlyContinue
    Set-Service $_ -StartupType Disabled -ErrorAction SilentlyContinue
}
```

### Step 6: Clean Startup
```powershell
# Review startup items
Get-CimInstance Win32_StartupCommand | Select Name, Command, Location

# Disable specific vendor items (common examples):
Remove-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "RtkNGUI64" -ErrorAction SilentlyContinue
Remove-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "OneDrive" -ErrorAction SilentlyContinue
```

### Step 7: Verify
```powershell
# Check removed app is gone
Get-AppxPackage -Name "Microsoft.XboxApp" -AllUsers  # Should be empty

# Check startup time improved:
# Windows Performance Analyzer → Boot trace
```
