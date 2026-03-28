# Harvest Report: redpersongpt/OpCore-OneClick
Generated: 2026-03-26
Source: https://github.com/redpersongpt/OpCore-OneClick
Pages crawled: 228 files (full recursive tree)
Strategy: Deep crawl via GitHub API (gh cli, authenticated)
License: Apache-2.0

---

## 1. What Is This Repo — Full README Summary

**OpCore-OneClick** (formerly macOS One-Click) is a cross-platform Electron desktop app for building and deploying OpenCore-based macOS installer media on supported PC hardware. It runs on Windows, macOS, and Linux.

Homepage: https://macos-install.one/
Stars: 103 | Language: TypeScript | Version at time of crawl: 2.7.20

### What It Does

- Scans the target machine: CPU, GPU, chipset, storage, audio, NIC, Wi-Fi, input devices
- Validates hardware path before doing anything destructive
- Generates an OpenCore EFI folder (config.plist + kexts + SSDTs) tailored to detected hardware
- Downloads macOS recovery images from Apple's CDN (`osrecovery.apple.com`) — the same source as Internet Recovery
- Flashes the EFI + recovery to a USB drive or creates a boot partition
- Guides the user through required BIOS changes, with vendor-specific backend support (HP, Dell, Lenovo, Generic)

### What It Does NOT Do

- Does NOT automatically apply BIOS changes (BIOS setting application is "manual" or "assisted" mode; the app guides you but you change the settings yourself)
- Does NOT touch Windows, does NOT tweak registries, does NOT modify Windows services or telemetry
- Has no PowerShell tweaker, no scheduled task removal, no AppX removal list
- NOT a Windows optimization tool of any kind

### Key Design Principles

- "Review-first" — keeps destructive decisions visible, never hides risky parts
- Leaves BIOS changes and final install decisions under user review
- Blocks unsupported GPU and display paths early
- EFI layout + config.plist are validated before USB write
- Recovery downloads are resumable across restarts

---

## 2. Repository Structure (228 files)

```
OpCore-OneClick/
├── electron/               # Main process (Node.js / Electron)
│   ├── main.ts             # IPC hub, orchestration
│   ├── hardwareDetect.ts   # OS-level hardware scanning
│   ├── hardwareMapper.ts   # Detected hardware → HardwareProfile
│   ├── hardwareInterpret.ts
│   ├── hardwareProfileArtifact.ts / State.ts / Store.ts
│   ├── configGenerator.ts  # config.plist generation (core logic)
│   ├── hackintoshRules.ts  # GPU support tier classification
│   ├── amdPatches.ts       # AMD kernel patches (AMD_Vanilla)
│   ├── compatibility.ts    # Compatibility level assessment
│   ├── compatibilityMatrix.ts
│   ├── diskOps.ts          # USB flash, partition, GPT conversion
│   ├── efiBuildFlow.ts     # EFI build orchestration
│   ├── appleRecovery.ts    # Apple recovery download protocol
│   ├── recoveryBoardId.ts  # Mac board IDs for recovery requests
│   ├── firmwarePreflight.ts # BIOS/firmware probing (Windows/Linux/macOS)
│   ├── flashSafety.ts      # Destructive write safety gates
│   ├── efiBackup.ts        # Pre-write EFI backup
│   ├── bios/
│   │   ├── orchestrator.ts       # BIOS setting planner
│   │   ├── backends/
│   │   │   ├── generic.ts        # Generic vendor backend
│   │   │   ├── dell.ts           # Dell / Alienware
│   │   │   ├── hp.ts             # HP / Omen
│   │   │   └── lenovo.ts         # Lenovo / ThinkPad / Legion / IdeaPad
│   │   ├── verification.ts
│   │   ├── sessionState.ts
│   │   ├── statePersistence.ts
│   │   └── types.ts
│   ├── assets/kexts/       # Bundled kext fallbacks (11 kexts)
│   └── ...
├── src/                    # Renderer process (React/TypeScript/Vite)
│   ├── components/steps/   # 11 wizard steps
│   ├── data/
│   │   ├── kextRegistry.ts        # Full kext registry + selection logic
│   │   ├── communityKnowledge.ts
│   │   └── troubleshooting.ts
│   └── lib/               # State machines, routing, scoring
├── scripts/
│   ├── fetch-embedded-kexts.sh    # Build script to fetch kexts from GitHub
│   └── kext-checksums.sha256      # SHA-256 checksums for embedded kexts
├── test/                  # 30+ test files (Vitest)
├── docs/
│   ├── architecture-map.md
│   └── state-machines/    # Mermaid diagrams
└── .github/workflows/release.yml  # Release pipeline
```

There are ZERO PowerShell tweaker scripts, batch files, registry files, or Windows configuration scripts in this repo.

---

## 3. Hardware Detection (electron/hardwareDetect.ts)

Scans on all three platforms. On Windows, uses PowerShell CIM/WMI queries. On Linux, uses `lspci`, `dmidecode`, `uname`. On macOS, uses `system_profiler`.

### Detected Components

| Component | Detection Method |
|-----------|-----------------|
| CPU name, vendor, core count | Win32_Processor CIM / /proc/cpuinfo |
| GPU(s) — name, vendorId, deviceId | Win32_VideoController / lspci |
| Audio — codec name, vendorId, deviceId | Win32_SoundDevice / lspci |
| NIC — family, vendorId, type (ethernet/wifi) | Win32_NetworkAdapter / lspci |
| RAM | Win32_ComputerSystem.TotalPhysicalMemory |
| Motherboard model/vendor | Win32_BaseBoard |
| Is laptop / is VM | Battery presence, chassis type, hypervisor flags |
| Input devices (PS2 vs I2C) | Win32_PnPEntity, PnP device IDs |
| Storage | Win32_DiskDrive |

### GPU Vendor ID Resolution

- Intel: `8086`
- AMD: `1002`
- NVIDIA: `10de`

---

## 4. CPU Generation Detection (electron/hardwareMapper.ts)

Maps CPU model string to Intel generation name or AMD family. The full mapping:

```
Apple M1/M2/M3/M4       → Apple Silicon
Xeon W-/Scalable        → Cascade Lake-X
Xeon E5-V4/E5-V3        → Broadwell-E
Xeon E5-V2              → Ivy Bridge-E
Other Xeon              → Haswell-E

Core iX-14xxx/13xxx     → Raptor Lake
Core iX-12xxx           → Alder Lake
Core iX-11xxx           → Rocket Lake
Core iX-10xxx (G4/G7)   → Ice Lake
Core iX-10xxx           → Comet Lake
Core iX-8xxx/9xxx       → Coffee Lake
Core iX-7xxx            → Kaby Lake
Core iX-6xxx            → Skylake
Core iX-5xxx            → Broadwell
Core iX-4xxx            → Haswell
Core iX-3xxx            → Ivy Bridge
Core iX-2xxx            → Sandy Bridge

i3/i5/i7-9xx            → Nehalem
i3/i5/i7-8xx            → Nehalem
i3/i5/i7-7xx            → Westmere
i3/i5/i7-6xx/4xx (L/M/Q/U suffixed) → Arrandale
i3/i5/i7-4xx-5xx        → Clarkdale

Pentium/Celeron Gold     → Coffee Lake
Pentium/Celeron G5xx     → Skylake
Pentium/Celeron G3xx     → Haswell
Pentium/Celeron G1xx/G8x → Sandy Bridge

Core 2 Quad Q9xxx        → Yorkfield
Core 2 Duo E8xxx/E7xxx   → Wolfdale
Core 2 / Quad / Extreme  → Penryn

Ryzen / Threadripper     → Ryzen / Threadripper
AMD FX / Phenom / Athlon → Bulldozer
```

---

## 5. SMBIOS Assignment (electron/configGenerator.ts — getSMBIOSForProfile)

Fully Dortania-compliant OS-version-aware SMBIOS selection:

### AMD

| Condition | SMBIOS |
|-----------|--------|
| Threadripper | MacPro7,1 |
| Bulldozer | iMacPro1,1 |
| Ryzen + Catalina+ + Mac Pro-era AMD GPU | MacPro7,1 |
| Ryzen (default) | iMacPro1,1 |

### Intel Desktop

| Generation | macOS < 12 | macOS 12 | macOS 13+ | macOS 26+ |
|-----------|-----------|---------|----------|----------|
| Penryn/Wolfdale/Yorkfield/Nehalem/Westmere/Clarkdale | iMac10,1 | iMac14,4 | iMac14,4 | Blocked |
| Sandy Bridge (iGPU) | iMac12,2 | iMac16,2 | iMac18,1 | Blocked |
| Sandy Bridge (dGPU) | iMac12,2 | iMac16,2 | iMac18,2 | Blocked |
| Ivy Bridge (iGPU) | iMac13,2 | iMac16,2 | iMac18,1 | Blocked |
| Ivy Bridge (dGPU) | iMac13,2 | MacPro6,1 | iMac18,2 | Blocked |
| Haswell (iGPU) | iMac14,4 | iMac14,4 | iMac18,1 | Blocked |
| Haswell (dGPU) | iMac15,1 | iMac15,1 | iMac18,2 | Blocked |
| Broadwell | iMac16,2 | iMac16,2 | iMac18,2 | Blocked |
| Skylake | iMac17,1 | iMac17,1 | iMac18,1/2 | iMac20,1 |
| Kaby Lake (iGPU) | iMac18,1 | iMac18,1 | iMac18,1 | iMac20,1 |
| Kaby Lake (dGPU) | iMac18,3 | iMac18,3 | iMac18,3 | iMac20,1 |
| Coffee Lake | iMac19,1 | iMac19,1 | iMac19,1 | iMac20,1 |
| Comet Lake (iGPU) | iMac20,1 | iMac20,1 | iMac20,1 | iMac20,1 |
| Comet Lake (dGPU) | iMac20,2 | iMac20,2 | iMac20,2 | iMac20,1 |
| Rocket Lake | MacPro7,1 | MacPro7,1 | MacPro7,1 | MacPro7,1 |
| Alder Lake | MacPro7,1 | MacPro7,1 | MacPro7,1 | MacPro7,1 |
| Raptor Lake | MacPro7,1 | MacPro7,1 | MacPro7,1 | MacPro7,1 |

Tahoe (macOS 26) blocks: Wolfdale, Yorkfield, Nehalem, Westmere, Arrandale, Clarkdale, Penryn, Sandy Bridge, Ivy Bridge, Haswell, Broadwell.

### Intel HEDT

| Generation | SMBIOS |
|-----------|--------|
| Ivy Bridge-E (macOS < 13) | MacPro6,1 |
| Ivy Bridge-E (macOS 13+) | MacPro7,1 |
| Haswell-E / Broadwell-E / Cascade Lake-X | iMacPro1,1 |

### Intel Laptop

| Generation | macOS < 12 | macOS 12 | macOS 13+ |
|-----------|-----------|---------|---------|
| Arrandale/Clarkdale | MacBookPro6,2 | MacBookPro11,4 | MacBookPro14,1 |
| Sandy Bridge/Ivy Bridge | MacBookPro10,1 | MacBookPro11,4 | MacBookPro14,1 |
| Haswell | MacBookPro11,4 | MacBookPro11,4 | MacBookPro14,1 |
| Broadwell | MacBookPro12,1 | MacBookPro12,1 | MacBookPro14,1 |
| Skylake | MacBookPro13,1 | MacBookPro13,1 | MacBookPro14,1 |
| Kaby Lake | MacBookPro14,1 | MacBookPro14,1 | MacBookPro14,1 |
| Coffee Lake | MacBookPro15,2 | MacBookPro15,2 | MacBookPro15,2 |
| Ice Lake | MacBookAir9,1 | MacBookAir9,1 | MacBookAir9,1 |
| Comet Lake / Rocket Lake / Alder Lake / Raptor Lake | MacBookPro16,1 | MacBookPro16,1 | MacBookPro16,1 |

VM override: AMD/Ryzen/Threadripper VM → MacPro7,1; Intel VM → iMacPro1,1

---

## 6. GPU Support Classification (electron/hackintoshRules.ts)

### NVIDIA

| GPU Class | Detection Pattern | macOS Ceiling | Notes |
|-----------|-----------------|--------------|-------|
| RTX / Turing / Ampere / Ada (20/30/40 series) | `rtx`, `1650`, `1660`, `turing`, `ampere`, `ada`, `\b2[0-9]xx\b` etc. | UNSUPPORTED | Requires `-wegnoegpu` |
| Maxwell / Pascal (750Ti/950/960/970/980/1050/1060/1070/1080) | Name match | High Sierra (10.13) | Needs NVIDIA Web Drivers |
| Kepler (710/720/730/740/760/770/780, Quadro K) | Name match | Big Sur (11) | OCLP extends to newer |
| Tesla / Fermi | Name match | High Sierra (10.13) | Needs Web Drivers |

### AMD

| GPU Class | Detection Pattern | macOS Ceiling | Kext Required |
|-----------|-----------------|--------------|--------------|
| RDNA 3 / Navi 3x (7600/7700/7800/7900) | Name match | UNSUPPORTED | — |
| Navi 24 (6300/6400/6500) | Name match | UNSUPPORTED | — |
| Navi 22 (6700/6750) | Name match | Sequoia (15) | NootRX |
| RDNA 1/2 (5500/5600/5700/6600/6650/6800/6900/6950) | Name match | Tahoe (26) | agdpmod=pikera |
| Polaris (460/470/480/550/560/570/580/590) | Name match | Tahoe (26) | — |
| Vega dGPU 56/64/Frontier/VII | `vega` without `vega \d{1,2}` | Tahoe (26) | — |
| Older AMD GCN R9/R7/HD7xxx/HD8xxx | Name match | Monterey (12) | OCLP for newer |
| TeraScale HD5xxx/HD6xxx | Name match | High Sierra (10.13) | — |
| Vega APU (Vega 3/6/8/9/10/11, "Radeon Graphics") | Name match | Sequoia (15) | NootedRed |

### Intel iGPU

| GPU | Detection | macOS Ceiling |
|-----|-----------|--------------|
| Arc, Iris Xe, HD 2500, UHD 710/730/750/770, HD 510/605/600/610 | Name match | UNSUPPORTED |
| HD 4000 | Name match | Big Sur (11), OCLP for newer |
| HD 2000/3000, GMA HD, Arrandale/Clarkdale | Name match | High Sierra (10.13) |
| HD 4400/4600/5000/5500/6000, Iris 5100/6100/6200/Pro | Name match | Monterey (12) |
| HD 520/530, UHD 620/630, Iris 540/550, Iris Plus, Ice Lake G4/G7, generic UHD | Name match | Tahoe (26) — fully supported |

---

## 7. SIP Policy (configGenerator.ts — getSIPPolicy)

| Path | csr-active-config Value | Hex | Reason |
|------|------------------------|-----|--------|
| Standard Hackintosh (all non-OCLP) | `AAAAAA==` | 0x00000000 | Dortania default — full SIP on (OpenCore loads kexts before macOS, SIP does not block them) |
| OCLP root-patching path (legacy GPU exceeding its native OS ceiling) | `7w8AAA==` | 0x00000FEF | Near-full SIP disable: allows unsigned kexts, unrestricted FS, DTRACE, NVRAM, unauthenticated root |

---

## 8. Booter Quirks by Generation (configGenerator.ts — getQuirksForGeneration)

Base quirks are defined first, then overridden per generation:

### Base Quirks

```
AvoidRuntimeDefrag         = true
DevirtualiseMmio           = false
EnableSafeModeSlide        = true
EnableWriteUnprotector     = false   (overridden per-gen)
ProtectMemoryRegions       = false
ProtectUefiServices        = false
ProvideCustomSlide         = true
RebuildAppleMemoryMap      = true    (overridden per-gen)
SetupVirtualMap            = true
SyncRuntimePermissions     = true    (overridden per-gen)

AppleCpuPmCfgLock          = true    (overridden per-gen)
AppleXcpmCfgLock           = true
AppleXcpmExtraMsrs         = false
DisableIoMapper            = true
DisableRtcChecksum         = false   (overridden for ASUS boards)
FixupAppleEfiImages        = false   (overridden for Tahoe)
PanicNoKextDump            = true
PowerTimeoutKernelPanic    = true
ProvideCurrentCpuInfo      = false
XhciPortLimit              = false

IgnoreInvalidFlexRatio     = false
RequestBootVarRouting      = true
ReleaseUsbOwnership        = true
UnblockFsConnect           = false   (overridden for HP)
```

### Generation-Specific Quirk Overrides

**Penryn / Wolfdale / Yorkfield / Nehalem / Westmere / Arrandale / Clarkdale / Sandy Bridge / Ivy Bridge**
```
EnableWriteUnprotector   = true     (legacy firmware path)
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
IgnoreInvalidFlexRatio   = true
AppleXcpmCfgLock         = false    (pre-Penryn through Clarkdale only — no XCPM)
```

**Haswell / Broadwell**
```
EnableWriteUnprotector   = true
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
IgnoreInvalidFlexRatio   = true
AppleCpuPmCfgLock        = false    (XCPM-only era)
```

**Skylake / Kaby Lake**
```
EnableWriteUnprotector   = true
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
AppleCpuPmCfgLock        = false
```

**Ice Lake**
```
EnableWriteUnprotector   = false
DevirtualiseMmio         = true
ProtectMemoryRegions     = true
ProtectUefiServices      = true
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
AppleCpuPmCfgLock        = false
```

**Coffee Lake (general)**
```
EnableWriteUnprotector   = false
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
DevirtualiseMmio         = true
AppleCpuPmCfgLock        = false
SetupVirtualMap          = true
```

**Coffee Lake + Z390 board**
```
+ ProtectUefiServices    = true
  SetupVirtualMap        = false    (overrides Coffee Lake default)
```

**Comet Lake**
```
EnableWriteUnprotector   = false
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
DevirtualiseMmio         = true
AppleCpuPmCfgLock        = false
ProtectUefiServices      = true
SetupVirtualMap          = false
```

**Rocket Lake / Alder Lake / Raptor Lake**
```
EnableWriteUnprotector   = false
DevirtualiseMmio         = true
ProtectUefiServices      = true
SetupVirtualMap          = false
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
ProvideCurrentCpuInfo    = true
AppleCpuPmCfgLock        = false
```

**Ivy Bridge-E (X79 HEDT)**
```
EnableWriteUnprotector   = true
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
IgnoreInvalidFlexRatio   = true
AppleXcpmExtraMsrs       = true
AppleCpuPmCfgLock        = true    (pre-XCPM, needs BOTH)
```

**Haswell-E / Broadwell-E (X99 HEDT)**
```
EnableWriteUnprotector   = true
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
IgnoreInvalidFlexRatio   = true
AppleXcpmExtraMsrs       = true
AppleCpuPmCfgLock        = false
```

**Cascade Lake-X (X299 HEDT)**
```
EnableWriteUnprotector   = false
DevirtualiseMmio         = true
ProtectUefiServices      = true
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
SetupVirtualMap          = false
AppleXcpmExtraMsrs       = true
AppleCpuPmCfgLock        = false
```

**AMD Bulldozer (15h/16h)**
```
EnableWriteUnprotector   = true
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
SetupVirtualMap          = true
AppleCpuPmCfgLock        = false
AppleXcpmCfgLock         = false
ProvideCurrentCpuInfo    = true
```

**AMD Ryzen / Threadripper (17h/19h)**
```
EnableWriteUnprotector   = false
DevirtualiseMmio         = false
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
SetupVirtualMap          = true
AppleCpuPmCfgLock        = false
AppleXcpmCfgLock         = false
ProvideCurrentCpuInfo    = true
```

**AMD Ryzen + X570/B550/A520/TRx40 board**
```
+ SetupVirtualMap        = false    (AMD AM4/TRX40 boards break SetupVirtualMap)
  DevirtualiseMmio       = true     (TRx40 only)
```

### Board-Specific Quirk Overrides (any generation)

**X99 board**
```
EnableWriteUnprotector   = true
DevirtualiseMmio         = false
RebuildAppleMemoryMap    = false
SyncRuntimePermissions   = false
SetupVirtualMap          = true
```

**X299 board**
```
EnableWriteUnprotector   = false
DevirtualiseMmio         = true
ProtectUefiServices      = true
RebuildAppleMemoryMap    = true
SyncRuntimePermissions   = true
SetupVirtualMap          = false
```

**ASUS / ROG / Strix / TUF board**
```
DisableRtcChecksum       = true     (prevents BIOS resets on reboot)
```

**HP / Hewlett-Packard board**
```
UnblockFsConnect         = true
```

**Coffee Lake / Comet Lake additional rule**
```
Z390/Z370/H370/B360/H310: DisableRtcChecksum = true
```

**Tahoe (macOS 26+) — FixupAppleEfiImages override**
```
Applies to: Skylake, Kaby Lake, Ice Lake, Coffee Lake, Comet Lake,
            Rocket Lake, Alder Lake, Raptor Lake, Cascade Lake-X,
            Ryzen, Threadripper, Bulldozer
FixupAppleEfiImages = true
```

**Laptop Skylake/Kaby Lake/Coffee Lake/Comet Lake/Ice Lake**
```
ProtectMemoryRegions = true
```

---

## 9. Boot Arguments Built Per Profile (configGenerator.ts — generateConfigPlist)

Base: `-v keepsyms=1 debug=0x100`

Additional args appended conditionally:

| Condition | Boot Arg Added |
|-----------|---------------|
| Always | `alcid=<detected_layout_id>` |
| Navi GPU (RX 5500/5600/5700/6600/6650/6800/6900/6950) or iMac SMBIOS + supported AMD dGPU | `agdpmod=pikera` |
| Unsupported modern NVIDIA (RTX, Turing, Ampere, Ada) | `-wegnoegpu` |
| Intel Comet Lake / Rocket Lake / Alder Lake / Raptor Lake (I225-V DriverKit fix) | `dk.e1000=0` |
| Laptop + Coffee Lake / Comet Lake / Rocket Lake / Alder Lake / Raptor Lake | `-igfxblr` |
| Ice Lake | `-igfxcdc -igfxdvmt` |
| macOS 26 (Tahoe) — Intel Bluetooth | `-ibtcompatbeta` |
| macOS 14+ (Sonoma / Tahoe) — OTA updates via RestrictEvents | `revpatch=sbvmm` |
| Conservative strategy | `-v debug=0x100 keepsyms=1` (force verbose) |

---

## 10. CPUID Spoofing (config.plist Kernel > Emulate)

| Generation | Cpuid1Data | Cpuid1Mask | DummyPowerManagement |
|-----------|------------|------------|---------------------|
| All Intel (except noted below) | `AAAAAAAAAAAAAAAAAAAAAA==` (zeros) | `AAAAAAAAAAAAAAAAAAAAAA==` (zeros) | false |
| Rocket Lake / Alder Lake / Raptor Lake | `VQYKAAAAAAAAAAAAAAAAAA==` (Comet Lake CPUID spoof) | `/////wAAAAAAAAAAAAAAAA==` | false |
| Haswell-E | `wwYDAAAAAAAAAAAAAAAAAA==` (Haswell desktop CPUID) | `/////wAAAAAAAAAAAAAAAA==` | false |
| All AMD | zeros | zeros | **true** (DummyPowerManagement enabled for AMD) |

---

## 11. Intel iGPU Device Properties

### ig-platform-id Values

**Laptop ig-platform-ids** (AAPL,ig-platform-id):

| Generation | Base64 | Decoded Hex |
|-----------|--------|-------------|
| Sandy Bridge | `AAABAA==` | 0x00010000 |
| Ivy Bridge | `BABmAQ==` | 0x01660004 |
| Haswell | `BgAmCg==` | 0x0A260006 |
| Broadwell | `BgAmFg==` | 0x16260006 |
| Skylake | `AAAWGQ==` | 0x19160000 |
| Kaby Lake | `AAAbWQ==` | 0x591B0000 |
| Coffee Lake / Comet Lake | `CQClPg==` | 0x3EA50009 |
| Ice Lake | `AABSig==` | 0x8A520000 |

**Desktop Display ig-platform-ids**:

| Generation | Base64 | Decoded Hex |
|-----------|--------|-------------|
| Sandy Bridge | `EAADAA==` | 0x00030010 |
| Ivy Bridge | `CgBmAQ==` | 0x0166000A |
| Haswell | `AwAiDQ==` | 0x0D220003 |
| Broadwell | `BwAiFg==` | 0x16220007 |
| Skylake | `AAASGQ==` | 0x19120000 |
| Kaby Lake | `AAASWQ==` | 0x59120000 |
| Coffee Lake / Comet Lake | `BwCbPg==` | 0x3E9B0007 |

**Desktop Headless ig-platform-ids** (dGPU present):

| Generation | Base64 | Decoded Hex |
|-----------|--------|-------------|
| Sandy Bridge | `AAAFAA==` | 0x00050000 |
| Ivy Bridge | `BwBiAQ==` | 0x01620007 |
| Haswell | `BAASBA==` | 0x04120004 |
| Broadwell | `BAAmFg==` | 0x16260004 |
| Skylake | `AQASGQ==` | 0x19120001 |
| Kaby Lake | `AwASWQ==` | 0x59120003 |
| Coffee Lake | `AwCRPg==` | 0x3E910003 |
| Comet Lake | `AwDImw==` | 0x9BC80003 |

### device-id Spoofs

| Condition | device-id | Hex |
|-----------|-----------|-----|
| Sandy Bridge headless | `AgEAAA==` | 0x01020000 |
| Sandy Bridge display | `JgEAAA==` | 0x01260000 |
| Haswell HD 4400 display | `EgQAAA==` | 0x04120000 (spoof to HD 4600) |
| Coffee Lake / Comet Lake laptop | `mz4AAA==` | 0x3E9B0000 (UHD 620 fix) |

### Framebuffer Patches

Applied when iGPU drives a display (always on laptops, on desktops when no supported dGPU):
```xml
<key>framebuffer-patch-enable</key><data>AQAAAA==</data>
<key>framebuffer-stolenmem</key><data>AAAwAQ==</data>
```

### Audio Device Paths

- Coffee Lake / Comet Lake / Rocket Lake / Alder Lake / Raptor Lake: `PciRoot(0x0)/Pci(0x1f,0x3)`
- All others (Skylake, Kaby Lake, older): `PciRoot(0x0)/Pci(0x1b,0x0)`

---

## 12. Audio Codec → Layout-ID Map (configGenerator.ts)

Source: https://github.com/acidanthera/AppleALC/wiki/Supported-codecs

```
ALC215: 18    ALC221: 11    ALC222: 11    ALC225: 28
ALC230: 13    ALC233:  3    ALC235: 11    ALC236:  3
ALC245: 11    ALC255:  3    ALC256:  5    ALC257: 11
ALC260: 11    ALC262:  7    ALC269:  1    ALC270:  3
ALC272:  3    ALC274: 21    ALC275:  3    ALC280:  3
ALC282:  3    ALC283:  1    ALC284:  3    ALC285: 11
ALC286:  3    ALC288:  3    ALC289: 11    ALC290:  3
ALC292: 12    ALC293: 11    ALC294: 11    ALC295:  1
ALC298:  3    ALC299: 21    ALC662:  5    ALC663:  3
ALC668:  3    ALC670: 12    ALC671: 12    ALC700: 11
ALC882:  5    ALC883:  1    ALC885:  1    ALC887:  1
ALC888:  1    ALC889:  1    ALC891:  1    ALC892:  1
ALC897: 11    ALC898:  1    ALC899:  1    ALC1150: 1
ALC1200: 1    ALC1220:  1
Fallback (unknown codec): 1
```

---

## 13. Kext Selection (src/data/kextRegistry.ts)

### Full KEXT_REGISTRY

| Kext | Repo | Category | Required When |
|------|------|----------|---------------|
| Lilu | acidanthera/Lilu | must-have | Always |
| VirtualSMC | acidanthera/VirtualSMC | must-have | Always |
| WhateverGreen | acidanthera/WhateverGreen | gpu | Always (Intel/AMD non-NootRX/NootedRed) |
| NootRX | ChefKissInc/NootRX | gpu | AMD Navi 22 only (RX 6700/6750) |
| NootedRed | ChefKissInc/NootedRed | gpu | AMD Vega APU only |
| AppleALC | acidanthera/AppleALC | audio | Always |
| IntelMausi | acidanthera/IntelMausi | ethernet | Intel NIC except I211 on Monterey+ |
| AppleIGB | donatengit/AppleIGB | ethernet | Intel I211 + macOS 12+ |
| RealtekRTL8111 | Mieze/RTL8111_driver_for_OS_X | ethernet | Realtek 1G NIC |
| RTL812xLucy | Mieze/RTL812xLucy | ethernet | Realtek 2.5G/5G (RTL8125/8126) |
| AtherosE2200Ethernet | Mieze/AtherosE2200Ethernet | ethernet | Atheros NIC, Killer non-E2500 |
| AirportItlwm | OpenIntelWireless/itlwm | wifi | Intel Wi-Fi + SecureBootModel enabled |
| Itlwm | OpenIntelWireless/itlwm | wifi | Intel Wi-Fi, no SecureBootModel |
| IntelBluetoothFirmware | OpenIntelWireless/IntelBluetoothFirmware | wifi | Intel Bluetooth |
| BrcmPatchRAM | acidanthera/BrcmPatchRAM | wifi | Broadcom Bluetooth path |
| BlueToolFixup | acidanthera/BrcmPatchRAM | wifi | Third-party BT + macOS 12+ |
| USBInjectAll | RehabMan/OS-X-USB-Inject-All | usb | Temporary Intel USB mapping only; NOT AMD |
| XHCI-unsupported | RehabMan/OS-X-USB-Inject-All | usb | X79/X99 HEDT, H370/B360/H310, older Z390 |
| NVMeFix | acidanthera/NVMeFix | extras | Problem NVMe (PM981/PM991/2200S/600p) |
| AppleMCEReporterDisabler | acidanthera/AppleMCEReporterDisabler | extras | AMD+Monterey+, or dual-socket Intel+Catalina+ |
| CpuTscSync | lvs1974/CpuTscSync | extras | Intel HEDT/server only |
| RestrictEvents | acidanthera/RestrictEvents | extras | macOS 14+ OTA updates |
| CPUTopologyRebuild | b00t0x/CpuTopologyRebuild | extras | Alder Lake only |
| SMCProcessor | acidanthera/VirtualSMC | extras | Intel CPU (desktop) |
| SMCSuperIO | acidanthera/VirtualSMC | extras | Intel desktop board sensors |
| SMCAMDProcessor | trulyspinach/SMCAMDProcessor | amd | AMD Ryzen/Threadripper |
| AMDRyzenCPUPowerManagement | trulyspinach/SMCAMDProcessor | amd | Ryzen/Threadripper desktop |
| VoodooPS2Controller | acidanthera/VoodooPS2 | laptop | Laptop with PS/2 input |
| VoodooI2C | VoodooI2C/VoodooI2C | laptop | Laptop with I2C input |
| VoodooSMBus | VoodooSMBus/VoodooSMBus | laptop | Laptop with SMBus touchpad |

### Bundled Kexts (electron/assets/kexts/)

These are embedded as fallbacks when GitHub API is unavailable:
- Lilu
- VirtualSMC
- WhateverGreen
- AppleALC
- VoodooPS2Controller (with VoodooInput, VoodooPS2Keyboard, VoodooPS2Mouse, VoodooPS2Trackpad plugins)
- NVMeFix
- RTCMemoryFixup
- RestrictEvents
- SMCBatteryManager
- SMCProcessor
- SMCSuperIO
- IntelMausi
- ECEnabler
- USBInjectAll

---

## 14. SSDT Selection by Platform (configGenerator.ts — getRequiredResources)

### Intel Desktop

| Generation | SSDTs Required |
|-----------|---------------|
| Alder Lake / Raptor Lake | SSDT-PLUG-ALT.aml, SSDT-AWAC.aml, SSDT-EC-USBX.aml, SSDT-RHUB.aml |
| Coffee Lake / Comet Lake / Rocket Lake | SSDT-PLUG.aml, SSDT-AWAC.aml, SSDT-EC-USBX.aml |
| Coffee Lake + Z390/Z370/H370/B360/H310/B365/Q370 | + SSDT-PMC.aml |
| Comet Lake + Z490 | + SSDT-RHUB.aml |
| Haswell / Broadwell | SSDT-PLUG.aml, SSDT-EC.aml |
| Skylake / Kaby Lake | SSDT-PLUG.aml, SSDT-EC-USBX.aml |
| Ice Lake | SSDT-PLUG.aml, SSDT-EC-USBX.aml, SSDT-AWAC.aml |
| Ivy Bridge-E (X79) | SSDT-EC.aml, SSDT-EC-USBX.aml, SSDT-UNC.aml |
| Haswell-E / Broadwell-E (X99) | SSDT-PLUG.aml, SSDT-EC-USBX.aml, SSDT-UNC.aml, SSDT-RTC0-RANGE.aml |
| Cascade Lake-X (X299) | SSDT-PLUG.aml, SSDT-EC-USBX.aml, SSDT-UNC.aml |
| Sandy Bridge / Ivy Bridge | SSDT-EC.aml, SSDT-IMEI.aml |
| Pre-Sandy Bridge | SSDT-EC.aml |

### Intel Laptop

| Generation | Extra SSDTs |
|-----------|-------------|
| All laptops | SSDT-EC-USBX-LAPTOP.aml, SSDT-PNLF.aml |
| Sandy Bridge / Ivy Bridge laptops | + SSDT-XOSI.aml, SSDT-IMEI.aml |
| Ice Lake laptops | + SSDT-RHUB.aml |
| I2C trackpad detected (Haswell–Ice Lake) | + SSDT-GPIO.aml |

### AMD Desktop

| Condition | SSDTs |
|-----------|-------|
| All AMD | SSDT-EC-USBX.aml |
| AM4/AM5 boards: A520, B550, A620, B650, X670, X670E, B850, X870, X870E | + SSDT-CPUR.aml |

### ACPI Delete Entries

Sandy Bridge and Ivy Bridge: delete `CpuPm` and `Cpu0Ist` tables (prevents AppleIntelCPUPowerManagement conflicts).

---

## 15. AMD Kernel Patches (electron/amdPatches.ts)

Source: https://github.com/AMD-OSX/AMD_Vanilla (Ryzen 17h/19h)

### Core Count Patches (cpuid_cores_per_package)

Dynamic — the core count byte is injected from the detected physical core count (1–255).

| macOS Range | Kernel Version | Base | Find (base64) | Replace Pattern |
|-------------|---------------|------|---------------|----------------|
| 10.13–10.14 | 17.0.0–18.99.99 | _cpuid_set_info | `uAYaAAAA` | `B8 <cc> 00 00 00 00` |
| 10.15–12 | 19.0.0–21.99.99 | _cpuid_set_info | `ugYaAAAA` | `BA <cc> 00 00 00 00` |
| 13.0–13.2 | 22.0.0–22.3.99 | _cpuid_set_info | `ugYaAACQ` | `BA <cc> 00 00 00 90` |
| 13.3+ (incl. Sonoma/Sequoia/Tahoe) | 22.4.0+ | _cpuid_set_info | `ugYaAAA=` | `BA <cc> 00 00 00` |

### Fixed Patches (all AMD, macOS 11+)

| Comment | Find (base64) | MinKernel | MaxKernel |
|---------|--------------|-----------|-----------|
| Remove wrmsr 0x1c8 (`_i386_init_slave`) | `uAEAAADD` | 20.0.0 | (latest) |
| Remove rdmsr (`_commpage_populate`) | `uaABAAAPMg==` | 19.0.0 | (latest) |
| Set cpuid to 0x8000001D (`_cpuid_set_cache_info`) | `McAx2zHJMdIPokGJxkGJ0YM9weNA` | 17.0.0 | (latest) |
| Remove wrmsr (`_cpuid_set_generic_info`) | `uYsAAAAxwDHSDzA=` | 17.0.0 | 18.99.99 |
| Set microcode=186 (`_cpuid_set_generic_info`) | `uYsAAAAPMg==` | 17.0.0 | 18.99.99 |
| Set flag=1 (`_cpuid_set_generic_info`) | `uRcAAAAPMsHqEoDiBw==` | 17.0.0 | 18.99.99 |
| Disable cpuid_0x80000005 check | `Pc94Hw==` | 17.0.0 | 18.99.99 |
| Force rb_ucores=0 (fix 13.3+ restart) | `ugAAAAAA/w+GLw==` | 22.4.0 | 22.4.0 |
| Bypass GenuineIntel check panic (12.0+) | `uW4AAAAPvsA5wQAAAAAAAA==` | 21.0.0 | (latest) |

---

## 16. BIOS Settings Required (configGenerator.ts — getBIOSSettings)

### Intel — Must DISABLE

| Setting | BIOS Location | Why |
|---------|--------------|-----|
| Fast Boot | Boot → Fast Boot | Causes macOS boot problems |
| Secure Boot | Security → Secure Boot | OpenCore unsigned |
| Serial/COM Port | Advanced → Super IO → Serial Port | macOS conflicts |
| Parallel Port | Advanced → Super IO → Parallel Port | macOS conflicts |
| VT-d | Advanced → CPU Configuration → VT-d | IOMMU panics (DisableIoMapper quirk covers if enabled) |
| CSM / Legacy Mode | Boot → CSM Support | GPU gIO errors |
| Thunderbolt | Advanced → Thunderbolt | Initial install issues |
| Intel SGX | Advanced → CPU Configuration → SGX | Not supported |
| Intel Platform Trust (PTT) | Advanced → Trusted Computing → PTT | Not required |
| CFG Lock | Advanced → Power → CPU PM Control → CFG Lock | CRITICAL: MSR 0xE2 write protection (AppleXcpmCfgLock quirk covers if unavailable) |

### Intel — Must ENABLE

| Setting | BIOS Location | Why |
|---------|--------------|-----|
| VT-x | Advanced → CPU Configuration → Intel VT | Required by kexts |
| Above 4G Decoding | Advanced → PCI → Above 4G Decoding | Required for modern GPUs |
| Hyper-Threading | Advanced → CPU Configuration → HT | Required for performance |
| Execute Disable Bit | Advanced → CPU Configuration → XD-bit | macOS security requirement |
| EHCI/XHCI Hand-off | Advanced → USB Configuration | macOS USB control |
| OS Type: Windows 8.1/10 UEFI | Boot → OS Type | Some boards: "Other OS" |
| DVMT Pre-Allocated ≥ 64MB | Advanced → System Agent → DVMT Pre-Allocated | Intel iGPU framebuffer |
| SATA Mode: AHCI | Advanced → SATA Configuration | macOS requires AHCI |

Z390 note: `ProtectUefiServices` in config.plist required.
Z490 note: `ProtectUefiServices` in config.plist required.

### AMD — Must DISABLE

| Setting | BIOS Location | Why |
|---------|--------------|-----|
| Fast Boot | Boot → Fast Boot | Same as Intel |
| Secure Boot | Security → Secure Boot | Same as Intel |
| Serial/COM Port | Advanced → Super IO → Serial Port | Conflicts |
| Parallel Port | Advanced → Super IO → Parallel Port | Conflicts |
| CSM | Boot → CSM Support | GPU gIO errors |
| IOMMU (AMD-Vi) | Advanced → AMD CBS → NBIO → IOMMU | Kernel panics |

### AMD — Must ENABLE

| Setting | BIOS Location | Why |
|---------|--------------|-----|
| Above 4G Decoding | Advanced → PCI → Above 4G Decoding | Required (fallback: `npci=0x3000`) |
| EHCI/XHCI Hand-off | Advanced → USB Configuration | macOS USB |
| OS Type: Windows 8.1/10 UEFI | Boot → OS Type | (some: "Other OS") |
| SATA Mode: AHCI | Advanced → SATA Configuration | macOS requires AHCI |
| SVM Mode | Advanced → CPU Configuration → SVM | AMD virtualisation |

---

## 17. BIOS Firmware Probing (electron/firmwarePreflight.ts)

The app probes BIOS state from the OS before the user opens their BIOS. Different per platform:

### Windows Probing Commands

```powershell
# BIOS identity
Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate | ConvertTo-Json -Compress

# UEFI mode + Secure Boot (authoritative)
try { $v = Confirm-SecureBootUEFI; $v.ToString().ToLower() } catch { "cmdlet-error" }

# VT-x (authoritative via CIM)
try { (Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled.ToString().ToLower() } catch { "" }

# VT-d heuristic (ACPI DMAR table presence)
try { $null = [System.IO.File]::ReadAllBytes("\\?\Global??\GLOBALROOT\Device\Mup\acpi\DMAR"); "present" } catch { "absent" }

# Secure Boot registry fallback
try { (Get-ItemPropertyValue "HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State" -Name "UEFISecureBootEnabled").ToString() } catch { "unknown" }
```

Registry key queried: `HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State` → `UEFISecureBootEnabled`
(This is read-only probing for detection — the app does NOT write any registry keys)

### Linux Probing Commands

```bash
dmidecode -t bios           # BIOS identity
bootctl status              # UEFI mode + Secure Boot
lscpu                       # VT-x/AMD-V capability
grep -m1 "flags" /proc/cpuinfo
dmesg | grep -iE "DMAR|IOMMU enabled|AMD-Vi"     # VT-d heuristic
dmesg | grep -iE "above 4G|above4g"               # Above 4G heuristic
ls /sys/firmware/efi                               # UEFI mode (authoritative)
```

### macOS Probing

```bash
system_profiler SPHardwareDataType | grep 'Boot ROM'
```

On macOS: all Hackintosh requirements return `not_applicable` (running on Mac = cannot probe target PC).

---

## 18. BIOS Vendor Backend Support Levels

The app categorizes BIOS setting application into three modes:
- `manual`: Show guidance text only, user changes it themselves
- `assisted`: App shows exact menu path, some automation possible
- `managed`: App can apply the change programmatically (Windows only)

### Generic Backend

| Setting | Windows | Linux/macOS |
|---------|---------|------------|
| CFG Lock | manual | manual |
| secure-boot, csm, fast-boot, above4g, xhci-handoff, sata-ahci, vt-d, svm | assisted | manual |
| All others | manual | manual |

### Dell / Alienware Backend (matches: `dell`, `alienware`)

| Setting | Safe Mode | Non-Safe (Windows) |
|---------|-----------|-------------------|
| CFG Lock | manual | manual |
| secure-boot, csm, fast-boot, above4g, xhci-handoff, sata-ahci, vt-d | assisted (safe) | managed |

### HP / Omen Backend (matches: `hewlett-packard`, `hp`, `omen`)

Same as Dell.

### Lenovo / ThinkPad / Legion / IdeaPad Backend (matches: `lenovo`, `thinkpad`, `legion`, `ideapad`)

Same as Dell, but also includes `svm` in the auto-capable set.

### BIOS Settings Tracked

```
uefi-mode       — UEFI Boot Mode (required)
secure-boot     — Secure Boot (required)
csm             — CSM / Legacy Boot (required)
sata-ahci       — SATA Mode AHCI (required)
vt-d            — VT-d / IOMMU (optional, recommended off)
svm             — SVM / CPU Virtualisation — AMD only (optional)
above4g         — Above 4G Decoding (required for AMD or discrete GPU)
xhci-handoff    — EHCI/XHCI Hand-off (required)
cfg-lock        — CFG Lock (optional: OpenCore quirk covers when can't disable)
fast-boot       — Fast Boot (optional, recommended off)
intel-sgx       — Intel SGX — Intel only (optional)
platform-trust  — Intel PTT — Intel only (optional)
```

---

## 19. Apple Recovery Download Protocol (electron/appleRecovery.ts)

Talks directly to `osrecovery.apple.com` using the same protocol as Internet Recovery (Mac firmware).

### Endpoints

```
https://osrecovery.apple.com/                             (session cookie bootstrap)
https://osrecovery.apple.com/InstallationPayload/RecoveryImage  (POST asset query)
```

### Request Format

```
User-Agent: InternetRecovery/1.0
Content-Type: text/plain
Cookie: session=<session_cookie>

cid=<random_16_hex>
sn=00000000000000000
bid=<board_id>
k=<random_64_hex>
fg=<random_64_hex>
os=default
```

### Recovery Board IDs (recoveryBoardId.ts)

| macOS Version | Board ID | MLB |
|--------------|---------|-----|
| Tahoe 26 / Sequoia 15 / Sonoma 14 | Mac-827FAC58A8FDFA22 | 00000000000000000 |
| Ventura 13 | Mac-4B682C642B45593E | 00000000000000000 |
| Monterey 12 | Mac-FFE5EF870D7BA81A | 00000000000000000 |
| Big Sur 11 | Mac-42FD25EABCABB274 | 00000000000000000 |
| Catalina 10.15 | Mac-00BE6ED71E35EB86 | 00000000000000000 |
| Mojave 10.14 | Mac-7BA5B2D9BE2258A1 | F4K10270Q2J3WLVAD |
| High Sierra 10.13 | Mac-BE088AF8C5EB4FA2 | F17M0XA0H7G3F91AD |

The download response contains `dmgUrl`, `dmgToken`, `chunklistUrl`, `chunklistToken`. The actual DMG is downloaded with `Cookie: AssetToken=<dmgToken>`.

---

## 20. USB Flash Operations (electron/diskOps.ts)

The app writes USB drives using platform-native tools:

### macOS / Linux

```bash
diskutil eraseDisk FAT32 OPENCORE GPT /dev/diskN   # Erase + GPT + FAT32
dd if=/dev/zero of=/dev/diskN bs=1m count=1        # Zero first sector
cp -r /path/to/EFI /Volumes/OPENCORE/              # Copy EFI
```

### Windows — diskpart

Phase 1 (partition creation — `noerr`):
```
select disk N
clean
convert gpt
create partition primary
```

Phase 2 (format — strict, no `noerr`):
```
select disk N
select partition 1
format fs=fat32 label=OPENCORE quick
assign letter=X
```

Retries: 3 attempts with progressive delays (500ms → 1500ms → 3000ms).

### Safety Checks (flashSafety.ts)

Before any write:
- `SYSTEM_DISK`: blocks write to the boot disk
- `MBR_PARTITION_TABLE`: blocks write to MBR disk (MBR → GPT conversion offered)
- `DEVICE_NOT_FOUND`: disk no longer accessible
- `EFI_TOO_LARGE`: EFI folder exceeds partition space
- `INSUFFICIENT_SPACE`: partition too small
- `EFI_MISSING_PLIST`: config.plist not found in EFI output
- `PARTITION_IN_USE`: partition mount locks
- `UNKNOWN_PARTITION_TABLE`: cannot determine disk layout

---

## 21. macOS Version Support Matrix

| macOS | Numeric | macOS 14.4+ Boot Arg | Tahoe Support |
|-------|---------|---------------------|--------------|
| Tahoe 26 | 26 | revpatch=sbvmm + -ibtcompatbeta | — |
| Sequoia 15 | 15 | revpatch=sbvmm | Yes |
| Sonoma 14 | 14 | revpatch=sbvmm | Yes |
| Ventura 13 | 13 | — | Yes |
| Monterey 12 | 12 | — | Yes |
| Big Sur 11 | 11 | — | Yes |
| Catalina 10.15 | 10.15 | — | Yes |
| Mojave 10.14 | 10.14 | — | Yes |
| High Sierra 10.13 | 10.13 | — | Yes |

---

## 22. Compatibility Levels

The app classifies hardware paths into four levels:

| Level | Meaning |
|-------|---------|
| `supported` | Community-proven, canonical OpenCore path |
| `experimental` | Known to work with caveats; manual verification required |
| `risky` | Limited community evidence; high failure likelihood |
| `blocked` | Unsupported GPU or display path; will not proceed |

---

## 23. CLI Support (electron/cli.ts)

```bash
opcore-oneclick scan           # Scan hardware, output profile
opcore-oneclick compatible     # Check compatibility for target macOS
opcore-oneclick report         # Full compatibility + hardware report
opcore-oneclick matrix         # Compatibility matrix for all macOS versions
opcore-oneclick version        # App version

# Flags
--json           JSON output
--target <ver>   Target macOS version (for compatible/report)
```

Exit codes: 0 = ok, 1 = error/blocked, 2 = usage.
Read-only — no destructive operations available via CLI.

---

## 24. What This Repo Does NOT Contain

To directly address the original query categories:

| Category | Present? |
|----------|----------|
| PowerShell scripts | NO (only probe commands inside TypeScript strings) |
| Batch / .bat / .cmd files | The update worker uses a .cmd format (generated at runtime, not stored in repo) |
| Registry keys modified | NO (read-only probing of SecureBoot\State and DMAR ACPI table — no writes) |
| Windows services disabled | NO |
| Scheduled task modifications | NO |
| AppX / UWP removal list | NO |
| Performance tweaks (CPU/GPU/power/timer/network) | NO |
| Privacy/telemetry changes | NO |
| Edge removal logic | NO |
| bcdedit commands | NO |

The repo has no Windows optimization functionality. It is a macOS installer preparation tool.

---

## Metadata

- Title: OpCore-OneClick
- Last updated: 2026-03-26 (pushed 2026-03-26T12:42:51Z)
- Version: 2.7.20
- Word count (key source files): ~15,000+ lines of TypeScript
- Key files read: README.md, CHANGELOG.md, electron/configGenerator.ts (~1,300 lines), electron/hackintoshRules.ts (~300 lines), electron/hardwareMapper.ts (~120 lines), electron/firmwarePreflight.ts (~350 lines), electron/amdPatches.ts (~200 lines), electron/diskOps.ts (~700 lines), electron/efiBuildFlow.ts, electron/appleRecovery.ts, electron/recoveryBoardId.ts, electron/bios/orchestrator.ts (~300 lines), electron/bios/backends/*.ts, src/data/kextRegistry.ts (~300 lines)

## Related URLs

- [OpCore-OneClick GitHub](https://github.com/redpersongpt/OpCore-OneClick)
- [Homepage](https://macos-install.one/)
- [Releases](https://github.com/redpersongpt/OpCore-OneClick/releases/latest)
- [Dortania OpenCore Install Guide](https://dortania.github.io/OpenCore-Install-Guide/)
- [AMD_Vanilla Patches](https://github.com/AMD-OSX/AMD_Vanilla)
- [Acidanthera (Lilu/WEG/VirtualSMC/AppleALC)](https://github.com/acidanthera)
