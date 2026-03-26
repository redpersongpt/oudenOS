# service-manager

**Purpose**: Audit and disable unnecessary Windows services to free RAM and CPU.

**Skills Used**: `bloatware-removal`, `privacy-hardening`

---

## Trigger
User says: "disable services", "reduce background processes", "free up RAM", "unnecessary services".

---

## Workflow

### Step 1: List All Running Services
```powershell
Get-Service | Where-Object { $_.Status -eq "Running" } |
    Select Name, DisplayName, StartType |
    Sort Name | Format-Table -AutoSize
```

### Step 2: Apply Safe Service Disablements

#### Telemetry & Diagnostics
```powershell
@("DiagTrack", "dmwappushservice", "WerSvc", "PcaSvc") | ForEach-Object {
    Stop-Service $_ -Force -ErrorAction SilentlyContinue
    Set-Service $_ -StartupType Disabled -ErrorAction SilentlyContinue
}
```

#### Xbox Services (if gaming without Xbox features)
```powershell
@("XblAuthManager", "XblGameSave", "XboxGipSvc", "XboxNetApiSvc") | ForEach-Object {
    Stop-Service $_ -Force -ErrorAction SilentlyContinue
    Set-Service $_ -StartupType Disabled -ErrorAction SilentlyContinue
}
```

#### Search (if using Everything or other search tool)
```powershell
Stop-Service WSearch -Force -ErrorAction SilentlyContinue
Set-Service WSearch -StartupType Disabled -ErrorAction SilentlyContinue
```

#### Location & Maps
```powershell
@("lfsvc", "MapsBroker") | ForEach-Object {
    Stop-Service $_ -Force -ErrorAction SilentlyContinue
    Set-Service $_ -StartupType Disabled -ErrorAction SilentlyContinue
}
```

#### Superfetch (disable on NVMe systems)
```powershell
Stop-Service SysMain -Force
Set-Service SysMain -StartupType Disabled
```

### Step 3: Conditional Disablements (Ask User First)

| Service | Safe to Disable? | Condition |
|---------|-----------------|-----------|
| Spooler | ✅ | No printer attached |
| Fax | ✅ | Always |
| WMPNetworkSvc | ✅ | Not using Windows Media Player network share |
| RemoteRegistry | ✅ | Not using remote management |
| TabletInputService | ✅ | No tablet/touchscreen |
| WSearch | ⚠️ | Only if using alternative search (Everything) |
| BITS | ⚠️ | Required for Windows Update |
| wuauserv | ⚠️ | Disable ONLY if updates are fully managed elsewhere |

### Step 4: Verify RAM Freed
```powershell
# Before / after comparison
Get-CimInstance Win32_OperatingSystem | Select FreePhysicalMemory, TotalVisibleMemorySize |
    ForEach-Object {
        $free = [math]::Round($_.FreePhysicalMemory / 1MB, 2)
        $total = [math]::Round($_.TotalVisibleMemorySize / 1MB, 2)
        Write-Host "RAM: $free GB free / $total GB total"
    }
```

### Step 5: Rollback (if issues arise)
```powershell
# Re-enable a service if needed
Set-Service <ServiceName> -StartupType Automatic
Start-Service <ServiceName>
```
