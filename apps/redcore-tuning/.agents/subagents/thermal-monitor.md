# thermal-monitor

**Purpose**: Monitor temperatures and detect CPU/GPU thermal throttling during gaming.

**Skills Used**: `thermal-management`

---

## Trigger
User says: "check temps", "is my PC throttling?", "thermal monitoring", "hot CPU".

---

## Workflow

### Step 1: Read Skill
```
view_file: .agents/skills/thermal-management/SKILL.md
```

### Step 2: Quick Temperature Check
```powershell
# CPU temp (limited in PowerShell — use HWiNFO64 for accuracy)
Get-CimInstance -Namespace "root\WMI" -Class "MSAcpi_ThermalZoneTemperature" |
    ForEach-Object { [math]::Round(($_.CurrentTemperature - 2732) / 10, 1) }

# GPU temp (NVIDIA only)
nvidia-smi --query-gpu=temperature.gpu,clocks.gr,clocks.max.gr,power.draw,power.limit --format=csv,noheader,nounits
```

### Step 3: Full Monitoring with HWiNFO64
```
1. Download HWiNFO64 from https://www.hwinfo.com/
2. Run in "Sensors Only" mode
3. Look for:
   - CPU Temperature (should be < 85°C under load on modern Intel/AMD)
   - CPU Thermal Throttling: false
   - GPU Temperature: < 85°C
   - GPU Performance Limit - Thermal: false
   - GPU Performance Limit - Power: false
```

### Step 4: Stress Test
```powershell
# CPU stress test (built-in PowerShell — rough test)
$jobs = 1..(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors | ForEach-Object {
    Start-Job { while($true) { [Math]::Sqrt(123456789) } }
}
# Monitor temps for 5 minutes in HWiNFO64
# Then stop:
$jobs | Stop-Job | Remove-Job
```

### Step 5: Identify Throttling Type
| HWiNFO64 Sensor | True = Problem |
|-----------------|----------------|
| CPU Thermal Throttling | Thermal paste needed / better cooler |
| CPU VR Thermal Throttle | MOSFET thermals — check VRM heatsink |
| GPU Performance Limit - Thermal | GPU thermal paste / fan curve too conservative |
| GPU Performance Limit - Power | Power limit hit — raise or OC elsewhere |

### Step 6: Apply Fixes
- **Thermal throttle**: Re-paste with Kryonaut, improve airflow, add case fans
- **Power limit**: Raise GPU TDP slider in NVIDIA Control Panel / AMD Adrenalin
- **Fan curve**: Set aggressive curve in BIOS or MSI Afterburner

### Step 7: Verify Fix
```
Re-run stress test + HWiNFO64
Compare: max temp before vs after
Target: sustained load temp stays below TjMax - 10°C
```
