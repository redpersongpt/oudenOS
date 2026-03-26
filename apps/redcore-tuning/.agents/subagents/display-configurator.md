# display-configurator

**Purpose**: Configure optimal monitor resolution, scaling mode, and refresh rate for gaming.

**Skills Used**: `display-tuning`, `gpu-optimization`

---

## Trigger
User says: "configure display", "set up monitor", "refresh rate", "identity scaling", "custom resolution".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/display-tuning/SKILL.md
view_file: .agents/skills/gpu-optimization/SKILL.md
```

### Step 2: Get Current Display Info
```powershell
Get-CimInstance Win32_VideoController | Select CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate, Name
```

### Step 3: Set Maximum Refresh Rate
```powershell
# In Windows: Settings → System → Display → Advanced display settings
# Or use GPU control panel:
# NVIDIA: Control Panel → Change Resolution → Refresh Rate dropdown → select highest
# AMD: Radeon Settings → Display → set refresh rate
```

### Step 4: Create Custom Resolution (CRU)
```
1. Download CRU
2. Run CRU.exe as admin
3. Add Detailed Resolution:
   - Set horizontal/vertical timing manually for your panel spec
   - Set exact refresh rate (e.g., 144.00 or 240.00 Hz)
4. Run restart64.exe (included with CRU) to apply without reboot
```

### Step 5: Verify Identity Scaling
```powershell
# Use QueryDisplayScaling.exe (valleyofdoom):
.\QueryDisplayScaling.exe
# Scaling Mode: 1 = Identity ✅ (GPU output == monitor input, no scaling hardware used)
```

### Step 6: NVIDIA Scaling Configuration
```
NVIDIA Control Panel → Adjust desktop size and position:
- Perform scaling on: GPU
- Scaling mode: No Scaling
→ Apply

Then verify with QueryDisplayScaling.exe = mode should become 1 (if using CRU detailed resolution)
```

### Step 7: Enable/Disable G-Sync / FreeSync
```
NVIDIA Control Panel:
- Display → Set up G-SYNC → Enable for selected displays
- Or disable entirely for max competitive performance
```

### Step 8: Disable HDCP (if causing issues)
```powershell
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" `
    -Name "RMHdcpKeyglobZero" -Value 1 -Type DWord
```

### Step 9: Color Settings
```
NVIDIA Control Panel → Display → Adjust desktop color settings:
- Output dynamic range: Full
- Output color depth: 8 bpc (or 10 bpc for HDR capable monitors)
AMD: Radeon Settings → Display → Pixel Format: RGB Full Range
```

### Step 10: Verify Final Config
```powershell
Get-CimInstance Win32_VideoController | Select CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate
.\QueryDisplayScaling.exe  # Confirm scaling mode
```
