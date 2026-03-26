# system-analyzer

**Purpose**: Full PC audit — audits every subsystem and generates a prioritized recommendations report.

**Skills Used**: all 20 skills

---

## Trigger
User says: "analyze my PC", "audit my system", "what should I tune?", or similar.

---

## Workflow

### Step 1: Read All Skill Modules
```
view_file: .agents/skills/cpu-optimization/SKILL.md
view_file: .agents/skills/gpu-optimization/SKILL.md
view_file: .agents/skills/memory-optimization/SKILL.md
view_file: .agents/skills/latency-reduction/SKILL.md
view_file: .agents/skills/thermal-management/SKILL.md
```

### Step 2: Gather System Information
Ask the user for or help them run:
```powershell
# OS Build
[System.Environment]::OSVersion.Version

# CPU info
Get-CimInstance Win32_Processor | Select Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed

# RAM
Get-CimInstance Win32_PhysicalMemory | Select Manufacturer, Speed, ConfiguredClockSpeed, Capacity

# GPU
Get-CimInstance Win32_VideoController | Select Name, DriverVersion, CurrentRefreshRate

# Storage
Get-PhysicalDisk | Select FriendlyName, MediaType, BusType, Size

# Power plan
powercfg /getactivescheme

# Current Win32PrioritySeparation
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl").Win32PrioritySeparation
```

### Step 3: Audit Key Settings
```powershell
# Timer resolution
.\ClockRes.exe  # or check GlobalTimerResolutionRequests

# Telemetry state
Get-Service DiagTrack | Select StartType

# Paging file
Get-WmiObject Win32_PageFileSetting

# Prefetch
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters").EnablePrefetcher
```

### Step 4: Generate Report
Produce a prioritized list:
1. **Critical** (e.g., XMP not enabled, power plan on balanced, C-states not tuned)
2. **High Impact** (e.g., Win32PrioritySeparation at default, DiagTrack running)
3. **Optional** (e.g., transparency effects, autoplay enabled)

### Step 5: Apply Recommended Tweaks
Direct user to relevant skills/subagents for each issue found.

---

## Output Format
```markdown
## System Audit Results

### Critical Issues
- ⛔ RAM running at 2400 MHz (XMP not enabled) → see bios-optimization skill
- ⛔ Power plan: Balanced → see power-plan-configurator subagent

### High Impact
- ⚠️ Win32PrioritySeparation = 2 (default) → should be 38 (0x26)
- ⚠️ DiagTrack service running → see privacy-hardening skill

### Recommendations Applied
- ✅ GlobalTimerResolutionRequests enabled
- ✅ DisablePointerAcceleration applied
```
