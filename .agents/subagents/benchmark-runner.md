# benchmark-runner

**Purpose**: Run latency and FPS benchmarks to measure before/after improvement from tweaks.

**Skills Used**: `latency-reduction`, `timer-resolution`, `gaming-optimization`

---

## Trigger
User says: "benchmark my system", "test latency before/after", "measure DPC latency".

---

## Workflow

### Step 1: Baseline DPC Latency (Before Tweaks)
```batch
# From bin/ folder
cd bin
xperf-dpcisr.bat
# Then analyze in WPA — record max DPC latency (μs)
```

### Step 2: Timer Resolution Test
```powershell
# Download MeasureSleep.exe from valleyofdoom/TimerResolution
.\MeasureSleep.exe
# Record default Sleep(1) delta (should be ~15ms at default resolution)

# Apply SetTimerResolution
.\SetTimerResolution.exe --resolution 5000 --no-console

# Measure again — should be ~1.5ms or less
.\MeasureSleep.exe
```

### Step 3: Frame Time Benchmark (In-Game)
```
1. Install CapFrameX or NVIDIA FrameView
2. Run game at target settings
3. Record 1% Low, 0.1% Low, Average FPS, and Max Frame Time
4. Apply tweaks (see gaming-tuner subagent)
5. Re-run same benchmark
6. Compare results
```

### Step 4: Network Latency Test
```powershell
# Ping baseline (100 samples)
ping 8.8.8.8 -n 100 -l 32
# Record min/avg/max

# Apply network tweaks (see network-optimizer subagent)
# Re-run ping comparison
```

### Step 5: Storage Benchmark
```powershell
# Built-in Windows Storage Assessment
winsat disk -drive C

# For detailed scores: use CrystalDiskMark (sequential + 4K random)
```

### Step 6: Report Results
```markdown
## Benchmark Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Max DPC Latency | 1200μs | 280μs | -77% |
| Sleep(1) Delta | 14.5ms | 0.012ms | -99.9% |
| 1% Low FPS | 87 | 104 | +19% |
| Ping Avg | 22ms | 18ms | -18% |
```

---

## Tools Required
- `bin/xperf-dpcisr.bat` — DPC trace
- `MeasureSleep.exe` — timer resolution test (download from valleyofdoom/TimerResolution)
- `CapFrameX` or `FrameView` — frame time capture
- `CrystalDiskMark` — storage benchmark
