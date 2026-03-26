# audio-tuner

**Purpose**: Configure low-latency audio for gaming — exclusive mode, ASIO, enhancements off.

**Skills Used**: `audio-latency`

---

## Trigger
User says: "audio latency", "crackling audio", "low latency audio", "game audio config".

---

## Workflow

### Step 1: Read Skill
```
view_file: .agents/skills/audio-latency/SKILL.md
```

### Step 2: Identify Audio DPC Latency
```batch
cd bin
xperf-dpcisr.bat
:: Look for HDAudBus.sys or portcls.sys in WPA output
```

### Step 3: Disable Audio Enhancements
```
Control Panel → Sound → Playback →
Right-click active device → Properties → Enhancements → Disable all enhancements
Also: Advanced → Allow applications to take exclusive control of this device ✅
```

Or via registry:
```powershell
$devPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render"
Get-ChildItem $devPath -ErrorAction SilentlyContinue | Get-ChildItem -ErrorAction SilentlyContinue |
    Where-Object { $_.PSChildName -eq "Properties" } | ForEach-Object {
        Set-ItemProperty $_.PSPath -Name "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5" `
            -Value 0 -Type DWord -ErrorAction SilentlyContinue
    }
```

### Step 4: Disable Unused Audio Devices
```powershell
# Disable anything that isn't the primary headset/speaker
# In Device Manager → Sound → Disable unused endpoints
Get-PnpDevice | Where-Object { $_.Class -eq "AudioEndpoint" } | Select FriendlyName, Status
```

### Step 5: Install ASIO4ALL (If No Hardware Interface)
```
1. Download ASIO4ALL v2 from https://www.asio4all.com/
2. Install and configure via system tray icon:
   - Select your audio device
   - Set buffer size to 32 or 64 samples (lowest = lowest latency)
   - Test for dropouts — raise to 128 if clicking occurs
```

### Step 6: Configure Audio Buffer in OS
```
Sound → Playback → Properties → Advanced:
- Format: 24 bit, 48000 Hz (Studio Quality) or 16 bit, 48000 Hz (for gaming)
- Shared Mode: 16ms buffer (3ms with quality audio hardware)
```

### Step 7: Elevate audiodg.exe Priority
```powershell
$audiodg = Get-Process audiodg -ErrorAction SilentlyContinue
if ($audiodg) {
    try { $audiodg.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High } catch {}
}
```

### Step 8: Remove Realtek Startup Bloat
```powershell
Remove-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "RtkNGUI64" -ErrorAction SilentlyContinue
Remove-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "RAVBg64" -ErrorAction SilentlyContinue
```

### Step 9: Verify with LatencyMon
```
Run LatencyMon for 5 minutes — audio driver should not appear in top offenders
Play audio while monitoring — no crackles = success
```
