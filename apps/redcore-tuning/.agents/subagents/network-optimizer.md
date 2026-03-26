# network-optimizer

**Purpose**: Complete NIC and TCP stack optimization for low-latency online gaming.

**Skills Used**: `network-optimization`

---

## Trigger
User says: "optimize network", "reduce ping", "NIC settings", "QoS for game".

---

## Workflow

### Step 1: Read Skill
```
view_file: .agents/skills/network-optimization/SKILL.md
```

### Step 2: Identify Active NIC
```powershell
Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select Name, InterfaceDescription, LinkSpeed
```

### Step 3: Apply TCP Stack Tweaks
```powershell
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global initialRto=2000
netsh int tcp set global timestamps=enabled
netsh int tcp set global nonsackrttresiliency=disabled
```

### Step 4: Disable Nagle's Algorithm
```powershell
$adapterGuid = (Get-NetAdapter -Name "Ethernet").InterfaceGuid
$tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$adapterGuid"
Set-ItemProperty $tcpPath -Name "TcpAckFrequency" -Value 1 -Type DWord
Set-ItemProperty $tcpPath -Name "TCPNoDelay" -Value 1 -Type DWord
```

### Step 5: Configure RSS
```powershell
# Set RSS base processor to 2, max 2 queues
Set-NetAdapterRss -Name "Ethernet" -BaseProcessorNumber 2 -MaxProcessors 2
```

### Step 6: Disable Interrupt Coalescing
```powershell
Set-NetAdapterAdvancedProperty -Name "Ethernet" -RegistryKeyword "*InterruptModeration" -RegistryValue 0
```

### Step 7: Set QoS for Game
```powershell
New-NetQosPolicy -Name "GamePriority" `
    -AppPathNameMatchCondition "YourGame.exe" `
    -IPProtocolMatchCondition Both `
    -DSCPAction 46 `
    -NetworkProfile All
```

### Step 8: Disable NIC Power Management
```powershell
$devicePath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
Get-ChildItem $devicePath -ErrorAction SilentlyContinue | ForEach-Object {
    Set-ItemProperty $_.PSPath -Name "PnPCapabilities" -Value 24 -Type DWord -ErrorAction SilentlyContinue
}
```

### Step 9: Verify
```powershell
Get-NetAdapterRss -Name "Ethernet"
Get-NetQosPolicy
netsh int tcp show global
ping 8.8.8.8 -n 50
```
