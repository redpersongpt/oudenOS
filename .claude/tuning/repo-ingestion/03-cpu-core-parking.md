# CPU Optimization & Core Parking — PC-Tuning Deep Dive

**Source:** https://github.com/valleyofdoom/PC-Tuning
**Date ingested:** 2026-03-24
**Purpose:** Implementation-ready findings for redcore-Tuning scanner/planner/executor/rollback

---

## 1. Repository Structure Notes

The PC-Tuning repo does **not** have a dedicated CPU config file. CPU-related content lives in:
- `README.md` — BIOS and Windows OS configuration sections
- `docs/research.md` — technical deep dives (TscSyncPolicy, timer resolution, Win32PrioritySeparation)
- `docs/registry-opts.md` — registry tweaks (mostly non-CPU, but some power-adjacent)
- `bin/registry-options.json` — boolean flags applied by `apply-registry.ps1`

No `configure-cpu.md`, `configure-power-plan.md`, or `post-install.md` exist in this repo.

---

## 2. Core Parking — Complete Registry Map

### 2.1 Power Management Subgroup

All processor power settings live under this registry key structure:

```
HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\
  {54533251-82be-4824-96c1-47b60b740d00}\   ← Processor Power Management subgroup
    {SETTING-GUID}\
      DefaultPowerSchemeValues\
        {SCHEME-GUID}\
          ACSettingIndex    REG_DWORD    ← plugged-in value
          DCSettingIndex    REG_DWORD    ← on-battery value
```

Common power scheme GUIDs:
- `381b4222-f694-41f0-9685-ff5bb260df2e` — Balanced
- `8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c` — High Performance
- `a1841308-3541-4fab-bc81-f71556f20b4a` — Power Saver
- `e9a42b02-d5df-448d-aa00-03f14749eb61` — Ultimate Performance

### 2.2 Core Parking Settings (Hidden from UI by default)

| Setting Name | GUID | Alias | Default (Balanced) | Recommended Gaming | Notes |
|---|---|---|---|---|---|
| Min Cores (%) | `0cc5b647-c1df-4637-891a-dec35c318583` | CPMINCORES | varies | 100 | 100% = disable parking |
| Max Cores (%) | `ea062031-0e34-4ff1-9b6d-eb1059334028` | CPMAXCORES | 100 | 100 | keep at 100 |
| Increase Time (intervals) | `2ddd5a84-5a71-437e-912a-db0b8c788732` | — | — | 1 | faster unparking |
| Decrease Time (intervals) | `dfd10d17-d5eb-45dd-877a-9a34ddd15c82` | — | — | 1 | faster parking |
| Increase Threshold (%) | `df142941-20f3-4edf-9a4a-9c83d3d717d1` | — | — | 10 | unpark sooner |
| Decrease Threshold (%) | `68dd2f27-a4ce-4e11-8487-3794e4135dfa` | — | — | 8 | park later |
| Overutilization Threshold (%) | `943c8cb6-6f93-4227-ad87-e9a3feec08d1` | — | — | 10 | emergency unpark |
| Increase Policy | `c7be0679-2817-4d69-9d02-519a537ed0c6` | — | 0=Ideal | 2=Rocket | all at once |
| Decrease Policy | `71021b41-c749-4d21-be74-a00f335d582b` | — | 0=Ideal | 0=Ideal | gradual parking |
| Affinity History Dec Factor | `8f7b45e3-c393-480a-878c-f67ac3d07082` | — | — | — | advanced |
| Affinity History Threshold | `5b33697b-e89d-4d38-aa46-9e7dfb7cd2f9` | — | — | — | advanced |
| Affinity Weighting | `e70867f1-fa2f-4f4e-aea1-4d8a0ba23b20` | — | — | — | advanced |
| Overutil History Dec Factor | `1299023c-bc28-4f0a-81ec-d3295a8d815d` | — | — | — | advanced |
| Overutil History Threshold | `9ac18e92-aa3c-4e27-b307-01ae37307129` | — | — | — | advanced |
| Overutil Weighting | `8809c2d8-b155-42d4-bcda-0d345651b1db` | — | — | — | advanced |
| Core Override | `a55612aa-f624-42c6-a443-7397d064c04f` | — | 0=Off | — | advanced |
| Parked Perf State | `447235c7-6a8d-4cc0-8e24-9eaf70b96e2b` | — | 0=No Pref | 2=Highest (P0) | parked cores still P0 |

**Increase/Decrease Policy values:**
- `0` = Ideal (OS decides how many cores to park/unpark)
- `1` = Single (one core at a time)
- `2` = Rocket (all cores at once)

**Parked Perf State values:**
- `0` = No Preference
- `1` = Lowest (Pmax)
- `2` = Highest (P0) — recommended, parked cores stay at max freq for fast wake

### 2.3 Disabling Core Parking Completely

The simplest approach: set min cores to 100%.

**Via powercfg (preferred, applies to active scheme):**
```powershell
# Disable core parking — set min cores to 100%
powercfg /SETACVALUEINDEX SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100
powercfg /SETDCVALUEINDEX SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100
powercfg /setactive SCHEME_CURRENT
```

**Via registry (direct write — for use when no active scheme manipulation is needed):**
```
HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\
  54533251-82be-4824-96c1-47b60b740d00\
  0cc5b647-c1df-4637-891a-dec35c318583\
  DefaultPowerSchemeValues\
  {ACTIVE-SCHEME-GUID}\
    ACSettingIndex = 100 (REG_DWORD)
    DCSettingIndex = 100 (REG_DWORD)
```

**Note on Windows 11 + Modern CPUs:** Windows 11 overrides core parking defaults for hybrid-architecture CPUs (Intel 12th gen+, AMD Ryzen 7000+). The OS may re-enable parking via QoS mechanisms regardless of power plan settings. Setting CPMINCORES=100 is still the correct approach.

---

## 3. Processor Idle States (C-States)

### 3.1 Registry Paths

| Setting | GUID | Values | Notes |
|---|---|---|---|
| Idle Disable | `5d76a2ca-e8c0-402f-a133-2158492d58ad` | 0=Allow idle, 1=Disable idle | Prevents C1+ |
| Idle State Maximum | `9943e905-9a30-4ec1-9b99-44dd3b76f7a2` | 0=C0 only, varies | Caps deepest C-state |
| Idle Time Check (μs) | `c4581c31-89ab-4597-8e2b-9c9cab440e6b` | 1–200000 μs | How often to evaluate |
| Idle Demote Threshold (%) | `4b92d758-5a24-4851-a470-815d78aee119` | 0–100% | Move to deeper C-state |
| Idle Promote Threshold (%) | `7b224883-b3cc-4d79-819f-8374152cbe7c` | 0–100% | Move to shallower C-state |
| Idle Threshold Scaling | `6c2993b0-8f48-481f-bcc6-00dd2742aa06` | 0=Disabled, 1=Enabled | — |

### 3.2 Disable Idle States

```powershell
# Disable C-states (forces C0 = fully active)
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE 1
powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE 1
powercfg /setactive SCHEME_CURRENT
```

### 3.3 ⚠️ Critical Compatibility Warnings from PC-Tuning

**DO NOT disable idle states if:**
1. **Hyper-Threading / SMT is enabled** — "avoid disabling idle states with Hyper-Threading/SMT enabled as single-threaded performance is usually negatively impacted." C-states are needed for SMT efficiency.
2. **Turbo Boost / Precision Boost Overdrive (PBO) is in use** — "you certainly wouldn't want to disable idle states when relying on PBO, Turbo Boost, or similar features." These boost mechanisms depend on thermal headroom from idle states.
3. **Laptop / battery-powered device** — disabling idle states significantly increases power consumption and heat.

**Safe to disable idle states when:**
- Running a static all-core overclock with SMT disabled
- Desktop-only system with adequate cooling
- Latency-critical workloads (audio production, competitive gaming with very low CPU utilization)

**Risk level:** EXPERT-ONLY — never expose as a default or "safe" toggle.

### 3.4 C-State ACPI Levels

| Level | Name | Resume Latency | Power Savings |
|---|---|---|---|
| C0 | Active | 0 | None |
| C1 | Halt | ~1 μs | Low |
| C2 | Stop-Clock | ~5 μs | Medium |
| C3 | Sleep | ~50–100 μs | High |

BIOS may expose additional vendor-specific deeper states (C6, C7, C8, C10 on Intel; CC6 on AMD).

---

## 4. Processor Performance States (P-States) & Boost

### 4.1 Registry Paths

| Setting | GUID | Alias | Values | Notes |
|---|---|---|---|---|
| Min Processor State (%) | `893dee8e-2bef-41e0-89c6-b55d0929964c` | PROCTHROTTLEMIN | 0–100 | 0% = allow deepest P-state |
| Max Processor State (%) | `bc5038f7-23e0-4960-96da-33abaf5935ec` | PROCTHROTTLEMAX | 0–100 | 100% = allow full turbo |
| Performance Boost Mode | `be337238-0d82-4146-a960-4f3749d470c7` | PERFBOOSTMODE | see below | key turbo control |
| Performance Boost Policy | `45bcc044-d885-43e2-8605-ee0ec6e96b59` | — | 0–100% | aggressiveness |
| Perf Increase Threshold (%) | `06cadf0e-64ed-448a-8927-ce7bf90eb35d` | PERFINCTHRESHOLD | 0–100 | — |
| Perf Decrease Threshold (%) | `12a0ab44-fe28-4fa9-b3bd-4b64f44960a6` | PERFDECTHRESHOLD | 0–100 | — |
| Perf Increase Policy | `465e1f50-b610-473a-ab58-00d1077dc418` | — | 0=Ideal,1=Single,2=Rocket | — |
| Perf Decrease Policy | `40fbefc7-2e9d-4d25-a185-0cfd8574bac6` | — | 0=Ideal,1=Single,2=Rocket | — |
| Perf Increase Time (intervals) | `984cf492-3bed-4488-a8f9-4286c97bf5aa` | — | 1–100 | — |
| Perf Decrease Time (intervals) | `d8edeb9b-95cf-4f95-a73c-b061973693c8` | — | 1–100 | — |
| Time Check Interval (ms) | `4d2b0152-7d5c-498b-88e2-34345392a2c5` | — | 1–5000 ms | P-state eval frequency |
| History Count (intervals) | `7d24baa7-0b84-480f-840c-1b0743c00f5f` | — | 1–128 | — |
| Allow Throttle States | `3b04d4fd-1cc7-4f23-ab1c-d1337819c4bb` | — | 0=No, 1=Yes | T-states |

### 4.2 PERFBOOSTMODE Values

| Value | Mode | Description | Recommendation |
|---|---|---|---|
| `0` | Disabled | Turbo/boost disabled | Latency-sensitive, power-limited |
| `1` | Enabled | Standard boost | Desktop balanced |
| `2` | Aggressive | More aggressive boost | Gaming |
| `3` | Efficient Enabled | Same as 1, energy-aware | Laptop |
| `4` | Efficient Aggressive | Same as 2, energy-aware | Laptop gaming |

### 4.3 Setting Boost Mode

```powershell
# Enable aggressive boost (gaming/performance)
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE 2
powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE 1
powercfg /setactive SCHEME_CURRENT

# Disable boost entirely
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE 0
powercfg /setactive SCHEME_CURRENT
```

### 4.4 Max Processor State

Setting PROCTHROTTLEMAX=99 is a known trick to disable turbo boost on Intel (forces P1 not P0):
```powershell
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX 99
```
⚠️ Risk: reduces single-core performance significantly. Only for thermal emergencies or power capping. **Expert-only.**

---

## 5. Reserved CPU Sets (Core Isolation)

### 5.1 What It Does

Reserves specific CPU cores exclusively for interrupt/DPC handling, removing them from the normal Windows scheduler. Reduces latency jitter on gaming cores by ensuring ISRs don't compete with game threads.

### 5.2 Registry Path

```
HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel
  Value: ReservedCpuSets
  Type:  REG_BINARY
  Format: Little-endian bitmask, 8 bytes per processor group
```

**Examples:**
- CPU 0 reserved: `01 00 00 00 00 00 00 00`
- CPUs 0+1 reserved: `03 00 00 00 00 00 00 00`
- No reservations (default): key absent or all zeros

### 5.3 PowerShell via NtSetSystemInformation API

The registry write must be coordinated with the kernel. The `ReservedCpuSets` tool from valleyofdoom:
- GitHub: https://github.com/valleyofdoom/ReservedCpuSets
- Uses `NtSetSystemInformation(SystemCpuSetInformation, ...)` directly

```powershell
# Requires custom tool — registry write alone is insufficient
# The kernel caches the value; a reboot or API call is needed

# Read current reservation
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel").ReservedCpuSets

# Remove reservation (delete key = no reservations)
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" -Name "ReservedCpuSets"
```

### 5.4 ⚠️ Critical Warning

> "Unexpected behavior occurs when a process affinity is set to reserved and unreserved CPUs simultaneously."

- Reserved cores should only be assigned to interrupt handlers, NOT to game processes
- Setting game process affinity to include reserved cores causes undefined behavior
- This is an **EXPERT-ONLY** feature — do not expose without CPU topology detection

### 5.5 Compatibility

- Windows 10 build 1703+ (Creators Update) — `NtSetSystemInformation` support
- NUMA awareness required for multi-socket systems
- Not applicable to single-core CPUs

---

## 6. Hyperthreading / SMT

### 6.1 PC-Tuning Recommendation

From README section 6.9:
- Consider disabling if sufficient physical cores exist for your workload
- Benefits: reduced contention on CPU resources, lower latency/jitter, better overclocking headroom
- Trade-offs: worse multi-threaded workloads (encoding, compiling, rendering, streaming)

### 6.2 Windows-Side Detection

```powershell
# Check HT/SMT status
(Get-WmiObject -Class Win32_Processor).NumberOfCores
(Get-WmiObject -Class Win32_Processor).NumberOfLogicalProcessors
# If LogicalProcessors > Cores * Sockets: HT is enabled

# Via CIM (newer approach)
$cpu = Get-CimInstance Win32_Processor
$htEnabled = $cpu.NumberOfLogicalProcessors -gt $cpu.NumberOfCores
```

### 6.3 Disabling via BIOS Only

**There is no Windows registry or OS-level control for HT/SMT.** It must be disabled in BIOS/UEFI. However, Windows has per-process "ideal CPU" controls and CPU sets that can constrain threads to physical cores only.

### 6.4 Interaction with Idle States

⚠️ **Never disable C-states while SMT is enabled** — this causes single-threaded performance regression. The HT sibling thread uses idle C-state transitions to allow the active thread to boost.

---

## 7. TSC Synchronization Policy

### 7.1 BCD Setting

```cmd
rem Default (Windows default behavior)
bcdedit /deletevalue tscsyncpolicy

rem Explicit values
bcdedit /set tscsyncpolicy default    rem 0x00000000
bcdedit /set tscsyncpolicy legacy     rem 0x00000001
bcdedit /set tscsyncpolicy enhanced   rem 0x00000002
```

### 7.2 PC-Tuning Research Finding

From `docs/research.md`: The Windows **default** behavior is `0x00000000` (same as "default"), NOT "enhanced" as is widely believed online. `HalpTscSyncPolicy` in kernel debugging confirms this. The common advice to set `enhanced` is **not based on evidence**.

### 7.3 Compatibility

- Only relevant on multi-socket NUMA systems or systems where TSC is not invariant
- Modern single-socket systems with invariant TSC: no observable difference
- Scanner should detect: `cpuid` TSC invariant bit and socket count before suggesting this

---

## 8. Timer Resolution

### 8.1 Global Timer Resolution Requests

```
HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel
  Value: GlobalTimerResolutionRequests
  Type:  REG_DWORD
  Data:  1 (enabled) | 0 (disabled)
```

### 8.2 Compatibility

**Windows 11 22H2+ and Windows Server 2022+ ONLY.**
Not available on Windows 10 — key is ignored.

### 8.3 What It Does

When enabled, any process calling `timeBeginPeriod(1)` or `NtSetTimerResolution` affects the global system timer resolution (as it did pre-Windows 11). When disabled (Windows 11 default), timer resolution is per-process only.

### 8.4 Interaction with CPU Performance

Higher timer resolution = more frequent scheduler preemptions = slightly higher CPU utilization but lower scheduling latency. Important for games that rely on sleep-based timing loops.

---

## 9. Processor Performance Boost via BIOS / Static Frequencies

### 9.1 PC-Tuning Core Philosophy

> "Hardware > BIOS > Operating System" in order of performance impact scaling.

Static all-core overclocking eliminates frequency transition jitter:
- Intel: manually set all-core ratio in BIOS
- AMD: Precision Boost Overdrive (PBO) as dynamic alternative

### 9.2 Scanner Detection — What to Check

```powershell
# Current CPU max boost frequency (indicator of boost capability)
(Get-WmiObject -Class Win32_Processor).MaxClockSpeed

# Actual current frequencies via performance counters
Get-Counter '\Processor Information(*)\% Processor Performance' -SampleInterval 1 -MaxSamples 3

# Check for Intel Turbo Boost or AMD Boost enabled (via WMI)
(Get-WmiObject -Class Win32_Processor).Name  # Check vendor from name string
```

### 9.3 Windows Power Plan — Boost Detection

Current boost mode in active power scheme:
```powershell
powercfg /query SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE
```

---

## 10. Win32PrioritySeparation (Scheduler Quantum)

### 10.1 Registry Path

```
HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl
  Value: Win32PrioritySeparation
  Type:  REG_DWORD
```

### 10.2 Values and Effects (from PC-Tuning research.md)

| Value | Quantum | Priority Boost | Foreground Boost | Use Case |
|---|---|---|---|---|
| `0x00` | Short | None | None | — |
| `0x02` | Short | None | Max | — |
| `0x14` (dec 20) | Short | None | None | — |
| `0x16` (dec 22) | Short | Variable | Max | Windows default (Balanced) |
| `0x18` (dec 24) | Long | Fixed | None | **Server/latency workloads** |
| `0x26` (dec 38) | Short | Variable | Max | Windows default (Balanced, alt) |
| `0x28` (dec 40) | Long | Fixed | None | Fixed long quantums |
| `0x29` | Long | Fixed | Slight | — |
| `0x2a` | Long | Fixed | Max | — |

**Bits breakdown:**
- Bits 0–1: Quantum type (0=Variable short, 1=Fixed short, 2=Fixed long)
- Bits 2–3: Quantum length (0=Short, 1=Short, 2=Long, 3=Long)
- Bits 4–5: Foreground boost (0=None, 1=Low, 2=Medium, 3=Max)

### 10.3 Recommended Values

```powershell
# Gaming: short variable quantums, max foreground boost (Windows default for gaming)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 0x26 -Type DWord

# Low latency / server-style: fixed long quantums, no foreground boost
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 0x18 -Type DWord
```

---

## 11. CPU Affinity & NUMA

### 11.1 No Registry-Level CPU Affinity

Windows does not have global CPU affinity registry settings. Affinity is:
- Per-process: `SetProcessAffinityMask` API
- Per-thread: `SetThreadAffinityMask` API
- Persistent per-process: Start Menu shortcut properties or Process Lasso (third-party)

### 11.2 NUMA Awareness

For multi-socket systems:
```powershell
# Detect NUMA topology
(Get-WmiObject -Class Win32_Processor) | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
[Environment]::ProcessorCount
```

NUMA-aware thread scheduling happens automatically in Windows. No registry control needed for standard configurations.

### 11.3 CPU Sets (Soft Affinity)

Available since Windows 10 via `SetProcessDefaultCpuSets` API. No registry equivalent. Softer than hard affinity — OS can override. Used by Xbox Game Mode internally.

---

## 12. Virtualization / SVM Impact on CPU Performance

### 12.1 PC-Tuning Recommendation (README section 6.11)

- Disable Intel VT-x/VT-d and AMD SVM/IOMMU if not using virtual machines
- Reasons: can cause latency differences for memory access, potential BCLK fluctuation effects
- Windows detection: Task Manager → Performance → CPU → "Virtualization: Enabled/Disabled"

### 12.2 Detection Registry

```powershell
# Check if Hyper-V is running (requires virtualization)
(Get-WmiObject -Class Win32_ComputerSystem).HypervisorPresent

# Check WSL2 status (also uses Hyper-V)
(Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux).State
```

---

## 13. Safety Classification Matrix

| Setting | Risk Level | Reversible | Requires Reboot | Vendor Specific |
|---|---|---|---|---|
| Disable Core Parking (CPMINCORES=100) | **SAFE** | Yes (powercfg) | No | No |
| Aggressive Boost Mode (PERFBOOSTMODE=2) | **SAFE** | Yes | No | No |
| Max Processor State = 100% | **SAFE** | Yes | No | No |
| Min Processor State = 0% | **SAFE** | Yes | No | No |
| Parked Core Perf State = Highest | **SAFE** | Yes | No | No |
| Win32PrioritySeparation = 0x26 | **SAFE** | Yes | No | No |
| Win32PrioritySeparation = 0x18 | MODERATE | Yes | No | No |
| GlobalTimerResolutionRequests = 1 | **SAFE** (Win11 only) | Yes | No | Win11+ only |
| Disable Idle States (IDLEDISABLE=1) | **EXPERT** | Yes | No | No, but SMT-dependent |
| Max Processor State = 99% (no turbo) | MODERATE | Yes | No | Intel-specific effect |
| Reserved CPU Sets | **EXPERT** | Yes (delete key) | Partial | No |
| TSC Sync Policy change | EXPERT | Yes (bcdedit) | Yes | Multi-socket only |
| HT/SMT disable | EXPERT | BIOS only | Yes (reboot) | BIOS-level |

---

## 14. Architecture Mapping — redcore-Tuning

### 14.1 Scanner Actions (`service-core/src/scanner/`)

```rust
// Detect core parking status
pub async fn scan_core_parking(conn: &Connection) -> Result<CoreParkingState> {
    // Run: powercfg /query SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583
    // Parse ACSettingIndex value
    // Return: { min_cores_pct: u32, parked: bool }
}

// Detect boost mode
pub async fn scan_boost_mode(conn: &Connection) -> Result<BoostModeState> {
    // Run: powercfg /query SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE
    // Return: { mode: u32, mode_name: String }
}

// Detect idle state policy
pub async fn scan_idle_policy(conn: &Connection) -> Result<IdlePolicyState> {
    // Run: powercfg /query SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE
    // Return: { idle_disabled: bool }
}

// Detect HT/SMT status (for idle state gate check)
pub async fn scan_smt_status() -> Result<SmtState> {
    // WMI: SELECT NumberOfCores, NumberOfLogicalProcessors FROM Win32_Processor
    // Return: { cores: u32, logical: u32, smt_enabled: bool }
}

// Detect Win32PrioritySeparation
pub async fn scan_scheduler_quantum() -> Result<SchedulerState> {
    // Read: HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl\Win32PrioritySeparation
    // Return: { value: u32, quantum_type: String, foreground_boost: String }
}
```

### 14.2 Planner Rules (`service-core/src/planner/`)

```rust
// Rule: Enable core parking optimization
pub fn rule_core_parking(state: &SystemState) -> Vec<TuningAction> {
    if state.core_parking.min_cores_pct < 100 {
        vec![TuningAction {
            id: "cpu.core_parking.disable",
            name: "Disable Core Parking",
            category: TuningCategory::Cpu,
            risk: RiskLevel::Safe,
            requires_reboot: false,
            // ...
        }]
    } else { vec![] }
}

// Rule: Set aggressive boost mode (only if boost not already optimal)
pub fn rule_boost_mode(state: &SystemState) -> Vec<TuningAction> {
    if state.boost_mode.mode < 2 {
        vec![TuningAction {
            id: "cpu.boost_mode.aggressive",
            risk: RiskLevel::Safe,
            // ...
        }]
    } else { vec![] }
}

// Rule: Idle state disable — GATE ON: SMT disabled, desktop, non-laptop
pub fn rule_idle_states(state: &SystemState) -> Vec<TuningAction> {
    if state.smt.smt_enabled {
        return vec![]; // Never suggest with SMT enabled
    }
    if state.power.is_battery || state.system.is_laptop {
        return vec![]; // Never on battery/laptop
    }
    vec![TuningAction {
        id: "cpu.idle_states.disable",
        risk: RiskLevel::Expert,
        premium_gate: Some(LicenseTier::Pro),
        // ...
    }]
}
```

### 14.3 Executor Actions (`service-core/src/executor/`)

**Action: `cpu.core_parking.disable`**
```rust
// Rollback: snapshot current min_cores_pct value BEFORE write
// Execute: powercfg /SETACVALUEINDEX SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100
//          powercfg /SETDCVALUEINDEX SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 100
//          powercfg /setactive SCHEME_CURRENT
// Verify: re-query and confirm value = 100
```

**Action: `cpu.boost_mode.aggressive`**
```rust
// Rollback: snapshot current PERFBOOSTMODE
// Execute: powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE 2
//          powercfg /setactive SCHEME_CURRENT
```

**Action: `cpu.idle_states.disable`** (expert-only)
```rust
// Gate: verify SMT disabled, verify not battery/laptop
// Rollback: snapshot current IDLEDISABLE value
// Execute: powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_PROCESSOR IDLEDISABLE 1
//          powercfg /setactive SCHEME_CURRENT
// Warning shown in UI before execution
```

**Action: `cpu.scheduler_quantum.gaming`**
```rust
// Rollback: snapshot Win32PrioritySeparation before write
// Execute: reg write HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl Win32PrioritySeparation 0x26
// No reboot needed (takes effect immediately)
```

**Action: `cpu.timer_resolution.global`** (Windows 11 only)
```rust
// Gate: Windows build >= 22621 (Windows 11 22H2)
// Rollback: snapshot current GlobalTimerResolutionRequests
// Execute: reg write HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel GlobalTimerResolutionRequests 1
```

### 14.4 Rollback Entries

All executor actions must create SQLite rollback entries BEFORE applying:

```sql
INSERT INTO rollback_entries (
    action_id,
    timestamp,
    method,           -- 'powercfg' | 'registry'
    restore_command,  -- exact command to restore
    backup_value,     -- serialized pre-change value
    requires_reboot
) VALUES (
    'cpu.core_parking.disable',
    strftime('%s', 'now'),
    'powercfg',
    'powercfg /SETACVALUEINDEX SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 {previous_value}',
    '{previous_value}',
    0
);
```

---

## 15. Recommended Tuning Module Groupings

### Module: `cpu-core-parking` (Safe — All tiers)
- Actions: disable core parking, set parked perf state to P0
- Scanner: reads CPMINCORES, PARKEDPERFSTATE from active power scheme
- No reboot required

### Module: `cpu-boost-performance` (Safe — All tiers)
- Actions: set PERFBOOSTMODE=2 (aggressive), PROCTHROTTLEMAX=100
- Scanner: reads current boost mode
- No reboot required

### Module: `cpu-scheduler-quantum` (Safe — All tiers)
- Actions: Win32PrioritySeparation gaming preset (0x26)
- Scanner: reads current value
- No reboot required

### Module: `cpu-timer-resolution` (Safe — Windows 11 only)
- Actions: GlobalTimerResolutionRequests=1
- Scanner: reads current value, gates on Windows build
- No reboot required

### Module: `cpu-idle-states` (Expert — Pro tier only)
- Actions: IDLEDISABLE=1
- Gates: SMT disabled, desktop, not laptop
- Warning: prominently shown before execution
- No reboot required (takes effect immediately)

### Module: `cpu-reserved-sets` (Expert — Pro tier only)
- Actions: configure ReservedCpuSets for interrupt isolation
- Requires: detecting CPU topology first
- Reboot: partial (registry updated live via API, but full effect on reboot)

---

## 16. Implementation Notes & Gotchas

1. **Active power scheme GUID** — always query `powercfg /getactivescheme` before reading/writing power settings. The active scheme changes when users switch profiles.

2. **Hybrid CPU architectures** (Intel 12th gen+, AMD 5900X+) — Windows 11 uses the Heterogeneous Thread Scheduling (HTS) manager which overrides some power settings. Core parking behavior may differ on E-core/P-core systems.

3. **PERFBOOSTMODE on AMD** — values above 1 may not have additional effect on AMD CPUs (boost is managed by firmware). Scanner should detect vendor and expose appropriate options.

4. **powercfg vs registry writes** — always prefer `powercfg` commands over direct registry writes for power settings. Direct registry writes to `DefaultPowerSchemeValues` can be stale if the active scheme was not the Balanced/HP scheme.

5. **Service restart not needed** — all power plan changes via `powercfg /setactive` take effect immediately without rebooting.

6. **Win32PrioritySeparation** — takes effect immediately on write, no reboot or service restart needed.

7. **GlobalTimerResolutionRequests** — requires reboot to take effect.

---

*Sources: valleyofdoom/PC-Tuning README, docs/research.md, Microsoft Power Setting GUIDs documentation, BitSum Known Windows Power GUIDs, Processor Core Parking GUID gist, PERFBOOSTMODE documentation.*
