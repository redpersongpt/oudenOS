# gpu-tuner

**Purpose**: GPU overclock, power limit tuning, fan curve, and VRAM optimization wizard.

**Skills Used**: `gpu-optimization`, `thermal-management`

---

## Trigger
User says: "overclock GPU", "GPU tuning", "GPU fan curve", "optimize GPU", "increase VRAM speed".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/gpu-optimization/SKILL.md
view_file: .agents/skills/thermal-management/SKILL.md
```

### Step 2: Baseline GPU Metrics
```powershell
# NVIDIA
nvidia-smi --query-gpu=name,temperature.gpu,clocks.gr,clocks.mem,power.draw,power.limit,utilization.gpu --format=csv,noheader

# Or use GPU-Z for detailed VRAM and memory clocks
```

### Step 3: Set Stable Power Limit First
```powershell
# NVIDIA: raise TDP to allow higher sustained boost clocks
nvidia-smi -pl 120  # Set to desired wattage (default usually ~100% of listed TDP)
```

### Step 4: Memory Clock OC (Highest FPS Impact)
```
Use MSI Afterburner:
1. Raise Memory Clock by +200 MHz
2. Run Unigine Heaven for 10 minutes — check for artifacts
3. If stable: raise +100 MHz more
4. If crashes/artifacts: drop back by 50 MHz — that's your limit

For GDDR6X (RTX 3080/3090): be conservative (+100–150 MHz max, generates significant heat)
```

### Step 5: Core Clock OC
```
In MSI Afterburner:
1. Use Voltage/Frequency Curve Editor (Ctrl+F in Afterburner)
2. Select a stable clockspeed on the curve
3. Raise voltage/clock point by 50 MHz
4. Apply and test with TimeSpy 3DMark
5. Repeat until unstable, then back off 25 MHz
```

### Step 6: Set Fan Curve
```
In MSI Afterburner → Fan → Enable Auto Fan → Custom:
30°C → 0%
50°C → 30%
60°C → 50%
70°C → 75%
80°C → 100%

Check GPU temps during gaming never exceed 85°C with this curve
```

### Step 7: Undervolting (Lower Temps, Same Performance)
```
In MSI Afterburner → Ctrl+F:
1. Shift+click on the curve at a high clock (e.g., 1950 MHz)
2. Press Ctrl+L to flatten everything above that point to the same voltage
3. This caps voltage saving heat while maintaining max boost clock
4. Test stability with 3DMark TimeSpy 3 runs
```

### Step 8: Verify Stability
```powershell
# Run 3DMark TimeSpy
# Run Unigine Superposition 1080p Extreme for 20 minutes
# Monitor temps and clocks in GPU-Z sensor log
```

---

## Safety Notes
- Always increase by small increments
- Test stability after each step before proceeding
- GPU OC crashes are safe (driver timeout recovery) — not hardware damage
- Memory OC artifacts = reduce memory clock
- Use ASUS GPU Tweak III, EVGA Precision X1, or MSI Afterburner depending on GPU brand
