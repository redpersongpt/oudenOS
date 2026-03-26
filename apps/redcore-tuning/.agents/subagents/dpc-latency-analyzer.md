# dpc-latency-analyzer

**Purpose**: Identify the root cause of DPC/ISR latency spikes and apply targeted fixes.

**Skills Used**: `interrupt-affinity`, `latency-reduction`, `audio-latency`

---

## Trigger
User says: "high DPC latency", "LatencyMon shows yellow/red", "audio crackles", "xperf analysis".

---

## Workflow

### Step 1: Initial LatencyMon Run
```
1. Download LatencyMon from https://www.resplendence.com/latencymon
2. Run LatencyMon as administrator
3. Click "Start" and use PC normally for 5 minutes (open a game, browse, etc.)
4. Click "Stop" and review results
```

### Step 2: xperf Deep Dive
```batch
# From bin/ folder
cd bin
xperf-dpcisr.bat
:: Captures kernel DPC/ISR events for 30 seconds
:: Saves .etl file for WPA analysis
```

### Step 3: Analyze in WPA
1. Open `.etl` in Windows Performance Analyzer (WPA)
2. Navigate: **Graph Explorer → Computation → CPU Idle States and Frequency → DPC**
3. Sort by **Exclusive Duration (μs)** — descending
4. Identify the top 3–5 driver offenders

### Step 4: Remediation by Driver

#### tcpip.sys / ndis.sys (Network)
```powershell
# Reduce RSS queues to 2
Set-NetAdapterRss -Name "Ethernet" -MaxProcessors 2

# Disable Interrupt Coalescing
Set-NetAdapterAdvancedProperty -Name "Ethernet" -RegistryKeyword "*InterruptModeration" -RegistryValue 0

# Enable MSI mode for NIC (see interrupt-affinity skill)
```

#### HDAudBus.sys / portcls.sys (Audio)
```powershell
# Disable audio enhancements
# Sound → Playback → Properties → Enhancements → Disable All

# Use ASIO driver (see audio-latency skill)

# Disable unused audio devices
Get-PnpDevice | Where-Object { $_.Class -eq "AudioEndpoint" -and $_.Status -eq "OK" }
# Disable in Device Manager if not primary audio output
```

#### storport.sys / ataport.sys (Storage)
```powershell
# Update NVMe driver
# Ensure AHCI Link Power Management is disabled (see storage-optimization skill)
# Disable HIPM/DIPM in power plan
$powerScheme = (powercfg /getactivescheme).Split()[3]
powercfg /setacvalueindex $powerScheme 0012ee47-9041-4b5d-9b77-535fba8b1442 dbc9e238-6de9-49e3-92cd-8c2b4946b472 0
```

#### MpKsl*.sys / WdFilter.sys (Defender)
```powershell
# Add game process to Defender exclusions
Add-MpPreference -ExclusionProcess "YourGame.exe"
Add-MpPreference -ExclusionPath "C:\Games"

# Or disable Defender entirely (see registry-tweaks skill)
```

#### ntoskrnl.exe (Kernel)
```powershell
# Disable dynamic ticks
bcdedit /set disabledynamictick yes
# This reduces timer interrupt-induced kernel DPCs
```

### Step 5: Post-Fix Verification
```
1. Re-run LatencyMon for 5 minutes
2. Verify max DPC latency is below 500μs (green in LatencyMon)
3. Re-run xperf and compare top offender list
```

---

## Target Values
| Metric | Good | Acceptable | Needs Fix |
|--------|------|-----------|-----------|
| Max DPC Latency | < 100μs | 100–500μs | > 500μs |
| Max ISR Latency | < 50μs | 50–200μs | > 200μs |
| LatencyMon overall | Green | Yellow | Red |
