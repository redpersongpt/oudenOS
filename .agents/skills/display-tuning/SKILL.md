---
name: display-tuning
description: Monitor refresh rate configuration, identity scaling, custom resolution creation with CRU, EDID modification, overdrive settings, and display pipeline optimization for gaming.
---

# Display Tuning Skill

## Overview
This skill covers display pipeline optimization — getting the lowest latency path from GPU to monitor pixel, using native resolution scaling, and configuring the highest stable refresh rate.

---

## 1. Refresh Rate Configuration

### Set Maximum Refresh Rate
```powershell
# List available display modes
Get-CimInstance -ClassName Win32_VideoController | Select CurrentRefreshRate, MaxRefreshRate

# Or read from registry
Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Configuration" -ErrorAction SilentlyContinue
```

### Set via Display Settings (PowerShell)
```powershell
# Use SetDisplayConfig (part of Win32 API — easier via third-party tool)
# Or create a custom resolution in CRU then select in Display Settings
```

---

## 2. Custom Resolution Utility (CRU)

CRU allows adding custom resolutions and refresh rates that the GPU reports to Windows.

### Best Practices
1. Download [CRU](https://www.monitortests.com/forum/Thread-Custom-Resolution-Utility-CRU)
2. Open `CRU.exe`
3. Add a **Detailed Resolution** (not automatic) with exact timings
4. Set the exact pixel clock, HTotal, VTotal for your panel
5. Run `restart64.exe` to apply without rebooting

### Common Custom Resolutions for Competitive Gaming
| Resolution | Notes |
|-----------|-------|
| 1280×960 | 4:3 for CS2/Valorant, stretched or black bars |
| 1440×1080 | Native 16:9 width-compressed 4:3 |
| 1920×1080 | Native; use with identity scaling |

---

## 3. Identity Scaling (True No-Scaling)

As covered in project research, identity scaling occurs when:
- Desktop resolution == Monitor native resolution, OR  
- Using a CRU detailed resolution with `Perform Scaling On: GPU`

### Verify Identity Scaling is Active
```powershell
# Use QueryDisplayScaling (valleyofdoom):
.\QueryDisplayScaling.exe
# Scaling Mode: 1 = Identity ✅
# Scaling Mode: 2 = Centered (GPU Panel Fit "No Scaling") 
# Scaling Mode: 4 = Aspect Ratio
```

### Force Identity Scaling for Custom Resolution
1. Add resolution in CRU as detailed resolution
2. NVIDIA: `Perform Scaling On: GPU → No Scaling`
3. Verify with QueryDisplayScaling.exe = mode 1

---

## 4. Monitor Overdrive / Response Time

- Overdrive (AKA Response Time in OSD): Controls pixel transition speed
- **Too high**: inverse ghosting / coronas appear around moving objects
- **Too low**: motion blur / ghosting from slow pixel transitions
- Recommended: Medium or Fast — test with **PixelTestAE** or **Blur Busters TestUFO**

---

## 5. Variable Refresh Rate (VRR / G-Sync / FreeSync)

### Enable G-Sync
```powershell
# G-Sync enabled for Windowed and Fullscreen modes
# Set in NVIDIA Control Panel:
# Display → Set up G-SYNC → Enable for windowed and full screen mode
```

### FreeSync (AMD)
- Enable in AMD Adrenalin → Display → AMD FreeSync Premium

### Note
- VRR adds input latency at low framerates (< min VRR range)
- For competitive play at high FPS, **disable VRR** and use uncapped framerate + NVIDIA Reflex

---

## 6. Disable HDCP

HDCP (High-bandwidth Digital Content Protection) can cause micro-stutter on some displays.

```powershell
# NVIDIA: Disable via NVCP → Display → Change resolution → set "Enable" under HDCP
# Or registry:
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000" `
    -Name "RMHdcpKeyglobZero" -Value 1 -Type DWord
```

---

## 7. Pixel Response Time: MPRT Strobing

Some monitors support backlight strobing (ULMB on NVIDIA, ELMB on ASUS) to reduce motion blur at the cost of brightness and VRR compatibility.

- Enable in monitor OSD
- Set strobe width/phase for minimum crosstalk
- **Cannot be combined with VRR on most displays**

---

## Verification

```powershell
# Check current refresh rate
(Get-CimInstance Win32_VideoController).CurrentRefreshRate

# Confirm display pipeline with PresentMon
.\PresentMon.exe --process_name YourGame.exe --output_file displaytest.csv
```

---

## References
- [CRU by ToastyX](https://www.monitortests.com/forum/Thread-Custom-Resolution-Utility-CRU)
- [QueryDisplayScaling](https://github.com/valleyofdoom)
- [Blur Busters TestUFO](https://www.testufo.com/)
- [TFT Central — Overdrive Guide](https://www.tftcentral.co.uk/articles/input_lag.htm)
