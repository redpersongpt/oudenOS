# storage-optimizer

**Purpose**: Optimize NVMe/SSD settings for fastest game load times and I/O responsiveness.

**Skills Used**: `storage-optimization`

---

## Trigger
User says: "slow game loading", "optimize SSD", "NVMe settings", "storage optimization".

---

## Workflow

### Step 1: Read Skill
```
view_file: .agents/skills/storage-optimization/SKILL.md
```

### Step 2: Identify Storage Devices
```powershell
Get-PhysicalDisk | Select FriendlyName, MediaType, BusType, HealthStatus, Size |
    Format-Table -AutoSize

Get-Disk | Select Number, FriendlyName, OperationalStatus, BusType, Size | Format-Table
```

### Step 3: Verify TRIM is Enabled
```powershell
fsutil behavior query disabledeletenotify
# 0 = TRIM enabled (correct)
# 1 = TRIM disabled (fix this)

# If disabled, enable:
fsutil behavior set disabledeletenotify 0
```

### Step 4: Enable Write Caching
```powershell
# Via Dev Manager: Disk → Properties → Policies → Enable write caching on the device
Get-Disk | ForEach-Object {
    $num = $_.Number
    Write-Host "Disk $num: $(Get-StorageReliabilityCounter -PhysicalDisk (Get-PhysicalDisk | Where-Object { $_.DeviceId -eq $num }) | Select -ExpandProperty WriteErrorsTotal) write errors"
}
```

### Step 5: Disable Superfetch/Prefetch
```powershell
Stop-Service SysMain -Force -ErrorAction SilentlyContinue
Set-Service SysMain -StartupType Disabled
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" `
    -Name "EnablePrefetcher" -Value 0 -Type DWord
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" `
    -Name "EnableSuperfetch" -Value 0 -Type DWord
```

### Step 6: Filesystem Tweaks
```powershell
# Disable last access timestamps
fsutil behavior set disablelastaccess 1

# Disable 8.3 filename generation
fsutil behavior set disable8dot3 1

# Check current settings
fsutil behavior query disablelastaccess
fsutil behavior query disable8dot3
```

### Step 7: AHCI Power Management
```powershell
$powerScheme = (powercfg /getactivescheme).Split()[3]
# Disable AHCI link power management
powercfg /setacvalueindex $powerScheme 0012ee47-9041-4b5d-9b77-535fba8b1442 dbc9e238-6de9-49e3-92cd-8c2b4946b472 0
powercfg /setactive $powerScheme
```

### Step 8: Benchmark Before/After
```powershell
# Built-in storage benchmark
winsat disk -drive C
winsat disk -drive D  # Game drive
```

Use **CrystalDiskMark** for detailed IOPS and sequential speed measurements.
