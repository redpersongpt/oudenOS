# power-plan-configurator

**Purpose**: Apply and configure the optimal Windows power plan for gaming performance.

**Skills Used**: `power-management`, `cpu-optimization`

---

## Trigger
User says: "power plan", "apply high performance", "PC throttling on battery", "disable idle states".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/power-management/SKILL.md
view_file: .agents/skills/cpu-optimization/SKILL.md
```

### Step 2: Check Current Plan
```powershell
powercfg /getactivescheme
powercfg /list
```

### Step 3: Apply Ultimate Performance (Preferred)
```powershell
# Unhide and create Ultimate Performance plan
powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
# Grab the newly created GUID from output and set it:
$guid = (powercfg /list | Select-String "Ultimate").ToString().Split()[3]
powercfg /setactive $guid
```

### Step 4: Configure Processor Settings
```powershell
$scheme = (powercfg /getactivescheme).Split()[3]

# Min/Max processor state: 100%
powercfg /setacvalueindex $scheme SUB_PROCESSOR PROCTHROTTLEMIN 100
powercfg /setacvalueindex $scheme SUB_PROCESSOR PROCTHROTTLEMAX 100
# Performance boost mode: Aggressive (2)
powercfg /setacvalueindex $scheme SUB_PROCESSOR PERFBOOSTMODE 2
# Disable core parking
powercfg /setacvalueindex $scheme SUB_PROCESSOR CPMINCORES 100
```

### Step 5: Disable USB Selective Suspend
```powershell
powercfg /setacvalueindex $scheme 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
```

### Step 6: Disable PCI Express LPM
```powershell
powercfg /setacvalueindex $scheme 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0
```

### Step 7: Disable Sleep and Display Timeout
```powershell
powercfg /setacvalueindex $scheme SUB_VIDEO VIDEOIDLE 0
powercfg /setacvalueindex $scheme SUB_SLEEP STANDBYIDLE 0
powercfg /setacvalueindex $scheme SUB_SLEEP HIBERNATEIDLE 0
powercfg /setactive $scheme
```

### Step 8: Disable Dynamic Ticks (BCD)
```powershell
bcdedit /set disabledynamictick yes
```

### Step 9: Verify
```powershell
powercfg /getactivescheme
powercfg /query SCHEME_CURRENT SUB_PROCESSOR | Select-String "PROCTHROTTLEMIN|PROCTHROTTLEMAX|CPMINCORES"
```
