---
name: gaming-optimization
description: Windows Game Mode, Hardware-Accelerated GPU Scheduling (HAGS), fullscreen optimizations, DirectX settings, FSO vs exclusive fullscreen, and per-game tuning for maximum FPS and minimum input lag.
---

# Gaming Optimization Skill

## Overview
This skill covers the Windows gaming stack — from the Game Mode scheduler to fullscreen presentation modes, DirectX configuration, and per-game optimizations.

---

## 1. Windows Game Mode

```powershell
# Enable Game Mode (focuses scheduler resources on the game)
Set-ItemProperty "HKCU:\SOFTWARE\Microsoft\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord

# Disable Game Bar UI (keep Game Mode, remove overlay)
Set-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" `
    -Name "AppCaptureEnabled" -Value 0 -Type DWord
Set-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" `
    -Name "AllowGameDVR" -Value 0 -Type DWord
```

---

## 2. Fullscreen Presentation Modes

### Exclusive Fullscreen (FSE)
- Direct GPU→Display path, lowest latency
- Enables GPU-specific optimizations (Reflex, Anti-Lag)
- **Set in-game**: select "Fullscreen" (not "Borderless Window")

### Fullscreen Optimizations (FSO / Borderless)
- Windows intercepts the fullscreen surface
- Higher compositor overhead but faster Alt-Tab
- **Disable FSO for competitive games**:
```powershell
# Disable fullscreen optimizations for a specific game
$gameExe = "C:\Games\YourGame\game.exe"
$regPath = "HKCU:\System\GameConfigStore\Children"
# Or right-click .exe → Properties → Compatibility → "Disable fullscreen optimizations"

# Via registry for all games:
Set-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -Value 2 -Type DWord
Set-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Type DWord
Set-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehavior" -Value 2 -Type DWord
Set-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -Type DWord
```

---

## 3. NVIDIA Reflex / AMD Anti-Lag

- **NVIDIA Reflex**: Reduces render queue depth, minimizes GPU-to-display latency
  - Enable in supported games (Apex, Valorant, Fortnite, etc.)
  - Pair with: `Low Latency Mode = Off` in NVCP (Reflex overrides it)

- **AMD Anti-Lag 2**: Supported in DX11/DX12 games with driver-level API
  - Enable in AMD Adrenalin: Performance → Anti-Lag: On

---

## 4. Frame Time Consistency Settings

```powershell
# Prevent Windows from throttling the game thread during low GPU usage
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" `
    -Name "GlobalTimerResolutionRequests" -Value 1 -Type DWord

# Set maximum pre-rendered frames to 1 (NVCP)
# See gpu-optimization skill for NVCP settings

# Disable DVR / background recording
Set-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" `
    -Name "AppCaptureEnabled" -Value 0 -Type DWord
```

---

## 5. DirectX Diagnostic & Optimization

```powershell
# Run DirectX diagnostic
Start-Process dxdiag

# Enable DirectX debug layer (for development only — hurts performance)
# Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "D3D12SDKLayers" -Value 1

# Shader pre-compilation (game-specific) — many games do this on first launch
# Ensure adequate storage speed so shader cache doesn't bottleneck
```

---

## 6. Per-Game Launch Options

### Steam Launch Options
```
# Disable Steam Overlay (reduces CPU overhead)
# In Steam → Game Properties → Launch Options:
-nojoy -novid -high

# For Source Engine games, add:
-freq 144 -refresh 144 +fps_max 0

# Force DirectX 12 (if game supports it):
-dx12
```

### Epic Games Launcher
```
# In game settings → Additional Command Line Arguments:
-DX12 -PREFERREDPROCESSOR=4
```

---

## 7. Anti-Cheat & Security Software Exceptions

```powershell
# Add game folders to Windows Defender exclusions (if Defender is enabled)
Add-MpPreference -ExclusionPath "C:\Games"
Add-MpPreference -ExclusionProcess "YourGame.exe"
```

---

## 8. Verification

```powershell
# Check Game Mode status
(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\GameBar").AutoGameModeEnabled

# Check FSO behavior
(Get-ItemProperty "HKCU:\System\GameConfigStore").GameDVR_FSEBehaviorMode

# Use FrameView (NVIDIA) or FCAT VR for frame time testing
# Use PresentMon for presentation mode analysis
```

---

## References
- [PresentMon](https://github.com/GameTechDev/PresentMon) — Presentation mode analysis
- [NVIDIA FrameView](https://www.nvidia.com/en-us/games/frameview/)
- [Microsoft: Fullscreen Optimizations](https://devblogs.microsoft.com/directx/demystifying-full-screen-optimizations/)
