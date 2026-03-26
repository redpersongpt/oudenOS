# gaming-tuner

**Purpose**: Per-game tuning wizard — applies the optimal settings stack for a specific game.

**Skills Used**: `gaming-optimization`, `process-priority`, `display-tuning`, `gpu-optimization`, `latency-reduction`

---

## Trigger
User says: "tune my PC for [game]", "optimize [game]", "how do I set up PC for [game]".

---

## Workflow

### Step 1: Read Skill Modules
```
view_file: .agents/skills/gaming-optimization/SKILL.md
view_file: .agents/skills/process-priority/SKILL.md
view_file: .agents/skills/display-tuning/SKILL.md
```

### Step 2: Gather Game Information
Ask user:
- Game name and engine (e.g., CS2 = Source 2, Fortnite = Unreal Engine 5)
- Current primary issue: low FPS / input lag / stutters / screen tearing
- GPU and CPU model
- Target resolution and refresh rate

### Step 3: Apply Universal Game Stack

```powershell
# 1. Set game to high priority
$game = Get-Process "YourGame" -ErrorAction SilentlyContinue
if ($game) { $game.PriorityClass = "High" }

# 2. Set Win32PrioritySeparation for short quanta
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" `
    -Name "Win32PrioritySeparation" -Value 38 -Type DWord

# 3. Set GPU priority
$gpuPrioPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
New-Item $gpuPrioPath -Force | Out-Null
Set-ItemProperty $gpuPrioPath -Name "GPU Priority" -Value 8 -Type DWord
Set-ItemProperty $gpuPrioPath -Name "Priority" -Value 6 -Type DWord

# 4. Disable fullscreen optimizations for this game
# Right-click .exe → Properties → Compatibility → Disable fullscreen optimizations
```

### Step 4: Per-Game Presets

#### Counter-Strike 2 (CS2)
```
Launch Options: -freq 240 -tickrate 128 +fps_max 0 -nojoy -novid
Resolution: 1280×960 (4:3 stretched or black bars) — competitive preference
Settings: All Low, Shadow Quality: Very Low, Shader Detail: Low
NVIDIA: LOW LATENCY MODE = ULTRA, Max Pre-Rendered Frames = 1
Enable Reflex in CS2 settings
```

#### Valorant
```
Launch Options: (none — anti-cheat restricts injection)
Settings: All Low except First Person Shadows: On (for game clarity)
NVIDIA Reflex: Enabled + Boost
Resolution: Native (1920×1080) OR 1280×720 for max FPS
```

#### Fortnite
```
Settings: Performance Mode (DirectX 11) for lower CPU/GPU overhead
3D Resolution: 100%
NVIDIA DLSS: Quality or Balanced
Anti-Lag 2 (AMD): Enabled
```

#### Apex Legends
```
Launch Options: +fps_max 0 +cl_showfps 1
Settings: All Low, Anti-Aliasing: Off
Adaptive Resolution FPS Target: 0 (disabled)
NVIDIA Reflex: Enabled
```

### Step 5: Verify In-Game
```
- Check FPS counter (F12 in Steam, cl_showfps in Source games)
- Monitor 1% Low and 0.1% Low (use CapFrameX)
- Verify input latency (check NVIDIA Reflex latency graph if available)
```

---

## Common Quick Wins Per Symptom

| Symptom | Fix |
|---------|-----|
| Stutters | Timer resolution, shader pre-cache, disable HPET |
| High input lag | Enable Reflex/Anti-Lag, disable V-Sync, disable FSO |
| Low FPS | GPU driver update, power plan to High Performance, XMP enabled |
| Screen tearing | Enable G-Sync/FreeSync OR cap FPS below max refresh |
