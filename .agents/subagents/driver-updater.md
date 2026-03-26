# driver-updater

**Purpose**: Safe GPU, NIC, and chipset driver update workflow with rollback capability.

**Skills Used**: `driver-optimization`

---

## Trigger
User says: "update my GPU driver", "install new drivers safely", "driver rollback".

---

## Workflow

### Step 1: Read Driver Optimization Skill
```
view_file: .agents/skills/driver-optimization/SKILL.md
```

### Step 2: Record Current Versions
```powershell
# GPU driver
Get-WmiObject Win32_VideoController | Select Name, DriverVersion, DriverDate

# NIC driver
Get-WmiObject Win32_PnPSignedDriver | Where-Object { $_.DeviceName -like "*Ethernet*" -or $_.DeviceName -like "*WiFi*" } |
    Select DeviceName, DriverVersion, DriverDate

# Chipset
Get-WmiObject Win32_PnPSignedDriver | Where-Object { $_.DeviceName -like "*chipset*" -or $_.DeviceName -like "*SMBus*" } |
    Select DeviceName, DriverVersion
```

### Step 3: Create System Restore Point
```powershell
Checkpoint-Computer -Description "Before Driver Update $(Get-Date -Format 'yyyy-MM-dd')" -RestorePointType MODIFY_SETTINGS
```

### Step 4: Download New Drivers (Do NOT install yet)
- GPU: From NVIDIA.com or AMD.com only (not Windows Update, not GeForce Experience auto)
- NIC: From Intel.com, Realtek.com, or manufacturer site
- Chipset: From AMD.com (for Ryzen) or Intel.com (for Intel)

### Step 5: DDU Clean Install (GPU Only)
```
1. Download DDU from wagnardsoft.com
2. Disconnect from internet (prevent Windows Update re-installing old driver)
3. Boot into Safe Mode
4. Run DDU → Select GPU brand → "Clean and Restart"
5. After reboot: run downloaded GPU installer
6. Custom Install → Clean Installation → uncheck GeForce Experience
```

### Step 6: Post-Install Validation
```powershell
# Verify new driver loaded
Get-WmiObject Win32_VideoController | Select Name, DriverVersion

# Check for device errors
Get-PnpDevice | Where-Object { $_.Status -ne "OK" } | Select FriendlyName, Status, Problem

# Run 3DMark or Unigine Heaven to validate stability
```

### Step 7: Rollback (if instability detected)
```
Option A: Windows Device Manager → GPU → Properties → Driver → Roll Back Driver
Option B: Boot into Safe Mode → DDU clean → install previous driver version
Option C: System Restore → restore to point created in Step 3
```

---

## Driver Sources
- NVIDIA: https://www.nvidia.com/en-us/drivers/
- AMD: https://www.amd.com/en/support
- Intel Network: https://www.intel.com/content/www/us/en/download-center/home.html
- Realtek NIC: https://www.realtek.com/en/component/zoo/category/network-interface-controllers-10-100-1000m-gigabit-ethernet-pci-express-software
