# memory-optimizer

**Purpose**: RAM overclocking wizard — verify XMP, tighten timings, and optimize Windows memory settings.

**Skills Used**: `memory-optimization`, `bios-optimization`

---

## Trigger
User says: "optimize RAM", "enable XMP", "RAM timings", "tighten timings", "memory overclocking".

---

## Workflow

### Step 1: Read Skills
```
view_file: .agents/skills/memory-optimization/SKILL.md
view_file: .agents/skills/bios-optimization/SKILL.md
```

### Step 2: Check Current RAM Configuration
```powershell
Get-CimInstance Win32_PhysicalMemory | Select Manufacturer, PartNumber, Speed, ConfiguredClockSpeed, Capacity, BanksLabel
```

**If ConfiguredClockSpeed < Speed**: XMP/EXPO is not enabled. Open BIOS.

### Step 3: Enable XMP/EXPO in BIOS
```
Boot to BIOS → Memory section:
- ASUS: AI Tweaker → Ai Overclock Tuner → XMP/D.O.C.P
- MSI: OC → XMP/EXPO
- Gigabyte: Tweaker → Extreme Memory Profile (X.M.P)
- ASRock: OC Tweaker → Load XMP Setting
```

### Step 4: Verify After Reboot
```powershell
# Should now match your kit's advertised speed
Get-CimInstance Win32_PhysicalMemory | Select ConfiguredClockSpeed
```

### Step 5: Check RAM Chip Type (for further tuning)
Identify chip type (Samsung B-Die, Hynix CJR, Micron E-Die, etc.):
- Use **Thaiphoon Burner** to read SPD
- Samsung B-Die: best for tight timings
- Hynix CJR/DJR: good for high frequency, moderate timings
- Micron E-Die: excellent for DDR4 on AMD

### Step 6: Disable Memory Compression (≥32 GB RAM)
```powershell
Disable-MMAgent -MemoryCompression
```

### Step 7: Pagefile Configuration
```powershell
# 32 GB+ system: disable pagefile (optional, test stability)
# 16 GB system: set fixed 8 GB pagefile on fastest drive
$cs = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
$cs.AutomaticManagedPagefile = $false
$cs.Put()
Set-WmiInstance -Class Win32_PageFileSetting -Arguments @{
    Name="C:\pagefile.sys"; InitialSize=8192; MaximumSize=8192
}
```

### Step 8: Disable Prefetch (NVMe + ≥16 GB RAM)
```powershell
Stop-Service SysMain -Force; Set-Service SysMain -StartupType Disabled
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" `
    -Name "EnablePrefetcher" -Value 0 -Type DWord
```

### Step 9: Stability Testing
```
1. Run MemTest86 (bootable USB) for at least 2 full passes
2. Run Prime95 Large FFT for 30 minutes (stresses memory controller)
3. Run OCCT Memory test (includes error detection)
```
