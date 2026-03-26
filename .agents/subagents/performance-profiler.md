# performance-profiler

**Purpose**: Run xperf/WPA profiling session to identify CPU bottlenecks, DPC offenders, and scheduling issues.

**Skills Used**: `interrupt-affinity`, `latency-reduction`

---

## Trigger
User says: "profile my system", "run xperf", "CPU profiling", "find performance bottleneck".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/interrupt-affinity/SKILL.md
view_file: .agents/skills/latency-reduction/SKILL.md
```

### Step 2: Run xperf DPC/ISR Trace
```batch
cd bin
xperf-dpcisr.bat
:: Wait 30 seconds while reproducing the problem (play game, load level, etc.)
:: Press Enter to stop trace
```

### Step 3: CPU Sampling Profile
```powershell
# Capture CPU sampling data (admin required)
xperf -on PROC_THREAD+LOADER+PROFILE -stackwalk PROFILE -BufferSize 1024 -MinBuffers 128 -MaxFile 256 -FileMode Circular

# Reproduce issue for 30 seconds...

xperf -d C:\traces\cpu_profile.etl
# Open in WPA
```

### Step 4: WPA Analysis Walkthrough

**For DPC/ISR Latency**:
1. Graph Explorer → Computation → DPC
2. Sort by Exclusive Duration (μs) descending
3. Note driver name and stack

**For CPU Scheduling**:
1. Graph Explorer → Computation → CPU Scheduling
2. Look for Ready Thread Waits (how long threads wait for CPU)
3. Long waits on game threads = scheduling starvation

**For Interrupt Analysis**:
1. Graph Explorer → Computation → CPU Idle States
2. Check interrupt frequency per CPU

### Step 5: Common Findings and Fixes

| Finding | Fix |
|---------|-----|
| Game thread waiting on CPU | Set game to High priority, set Win32PrioritySeparation = 0x26 |
| High ndis.sys DPC | Tune RSS, disable interrupt coalescing |
| High HDAudBus.sys DPC | Switch to ASIO, disable audio enhancements |
| Frequent timer interrupts | Disable dynamic ticks, HPET |
| High MpKsl DPC | Add game to Defender exclusions |

### Step 6: Produce Summary
```markdown
## Profiler Findings — [Date]

### Top DPC Offenders
1. tcpip.sys — 2400μs max — Fix: RSS 2 queues, disable coalescing
2. HDAudBus.sys — 850μs max — Fix: ASIO driver
3. ntoskrnl.exe — 300μs — Fix: Disable dynamic ticks

### CPU Scheduling
- Game thread avg ready time: 4.2ms — HIGH
  Fix: Boost Win32PrioritySeparation to 0x26
```
