---
name: network-optimization
description: TCP/UDP stack tuning, QoS DSCP policy, Receive Side Scaling (RSS), interrupt coalescing, NIC offloading, and network adapter advanced settings for low-latency online gaming.
---

# Network Optimization Skill

## Overview
This skill covers Windows TCP/IP stack tuning, NIC driver settings, RSS queue configuration, QoS policy for game traffic, and interrupt affinity — all focused on minimizing network latency for online gaming.

---

## 1. TCP/IP Stack Tweaks

### Disable Nagle's Algorithm (reduces latency for small packets)
```
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings
"TCPNoDelay"=dword:00000001
"TcpAckFrequency"=dword:00000001

HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\<Interface GUID>
"TcpAckFrequency"=dword:00000001
"TCPNoDelay"=dword:00000001
```

### PowerShell (via netsh)
```powershell
# Set TCP auto-tuning to normal (default; "disabled" can hurt throughput)
netsh int tcp set global autotuninglevel=normal

# Disable RSS if you're manually setting affinity (advanced)
# netsh int tcp set global rss=disabled

# Enable timestamps for better RTT measurement
netsh int tcp set global timestamps=enabled

# Set initial RTO (Retransmit Timeout) to reduce first loss recovery time
netsh int tcp set global initialRto=2000

# Enable Direct Cache Access if NIC supports it
netsh int tcp set global dca=enabled

# Enable Non-Silo RSS
netsh int tcp set global nonsackrttresiliency=disabled
```

---

## 2. QoS DSCP Marking for Game Traffic

DSCP (Differentiated Services Code Point) marks game packets for priority routing.

### Create a QoS Policy (Group Policy or PowerShell)
```powershell
# Create QoS policy for a specific game executable
New-NetQosPolicy -Name "GamePriority" `
    -AppPathNameMatchCondition "YourGame.exe" `
    -IPProtocolMatchCondition Both `
    -DSCPAction 46 `
    -NetworkProfile All

# Verify DSCP is being applied
Get-NetQosPolicy
```

> DSCP value 46 = Expedited Forwarding (EF) — highest priority class.
> Use Microsoft Network Monitor to verify actual DSCP on packets (see research.md).

---

## 3. Receive Side Scaling (RSS)

RSS distributes NIC interrupt processing across multiple CPU cores.

### Configure RSS Queue Count
```powershell
# List network adapters
Get-NetAdapter

# Set RSS base processor and max processors
Set-NetAdapterRss -Name "Ethernet" -BaseProcessorNumber 2 -MaxProcessors 2

# Verify
Get-NetAdapterRss -Name "Ethernet"
```

### Optimal RSS Queue Count for Gaming
- For typical online gaming (~300 KB/s): **1–2 queues** is sufficient
- Over-allocating RSS queues wastes CPU resources that could serve DPCs for the game process
- Base processor should NOT be CPU 0 (reserve for OS/DPC)

---

## 4. NIC Interrupt Coalescing

Interrupt coalescing batches interrupts to reduce CPU overhead — but introduces latency. Disable or minimize for gaming.

```powershell
# Disable interrupt coalescing (NIC must support it)
Set-NetAdapterAdvancedProperty -Name "Ethernet" `
    -RegistryKeyword "*InterruptModeration" -RegistryValue 0

# Or set to minimum coalescing delay
Set-NetAdapterAdvancedProperty -Name "Ethernet" `
    -RegistryKeyword "ITR" -RegistryValue 0
```

---

## 5. NIC Offloading Settings

Offloading lets the NIC handle TCP/UDP tasks — good for throughput, neutral-to-negative for extreme latency scenarios.

```powershell
# Disable Large Send Offload (LSO) — can introduce micro-latency
Disable-NetAdapterLso -Name "Ethernet"

# Disable Checksum Offload (optional, minor)
Set-NetAdapterAdvancedProperty -Name "Ethernet" `
    -RegistryKeyword "*TCPChecksumOffloadIPv4" -RegistryValue 0

# Disable RSS Hash (if manually controlling affinity)
# Set-NetAdapterAdvancedProperty -Name "Ethernet" -RegistryKeyword "*RssBaseProcNumber" -RegistryValue 2
```

---

## 6. NIC Advanced Properties (Key Settings)

Access via `devmgmt.msc` → NIC → Properties → Advanced, or PowerShell:
```powershell
Get-NetAdapterAdvancedProperty -Name "Ethernet"
```

| Property | Recommended | Notes |
|----------|------------|-------|
| Receive Buffers | 512–1024 | Higher = better throughput, slight latency cost |
| Transmit Buffers | 512–1024 | Same trade-off |
| Speed & Duplex | 1 Gbps Full Duplex | Never auto-negotiate for gaming |
| Flow Control | Disabled | Avoid pause frames introducing latency |
| Energy Efficient Ethernet | Disabled | Prevents sleep states on the NIC |
| Interrupt Moderation Rate | Off/Lowest | Reduces batching latency |
| Jumbo Frames | 1514 (disabled) | Only useful for LAN transfers, not gaming |

---

## 7. Disable Network Adapter Power Management

```powershell
# Disable "Allow computer to turn off this device to save power"
$nic = Get-NetAdapter -Name "Ethernet"
$pnpDevice = Get-PnpDevice | Where-Object { $_.FriendlyName -like "*Ethernet*" }
# Use Device Manager → Power Management tab → uncheck "Allow computer to turn off..."

# Or via registry
$devicePath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
Get-ChildItem $devicePath | ForEach-Object {
    $props = Get-ItemProperty $_.PSPath
    if ($props.DriverDesc -like "*Ethernet*") {
        Set-ItemProperty $_.PSPath -Name "PnPCapabilities" -Value 24 -Type DWord
    }
}
```

---

## 8. Verify Network Latency

```powershell
# Ping test for baseline
ping 8.8.8.8 -n 100 -l 32

# Measure DPC latency from NIC interrupts using xperf
# Run the included xperf-dpcisr.bat script in the bin/ folder

# Check current NIC settings
Get-NetAdapterRss -Name "Ethernet"
Get-NetAdapterAdvancedProperty -Name "Ethernet"
```

---

## References
- [MSDN: Receive Side Scaling](https://docs.microsoft.com/en-us/windows-hardware/drivers/network/introduction-to-receive-side-scaling)
- [djdallmann/GamingPCSetup — Network](https://github.com/djdallmann/GamingPCSetup)
- [Cloudflare: DSCP](https://www.cloudflare.com/learning/network-layer/what-is-a-network-packet/)
