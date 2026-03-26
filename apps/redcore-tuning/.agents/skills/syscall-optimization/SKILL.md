---
name: syscall-optimization
description: Spectre/Meltdown mitigation disablement, KPTI overhead reduction, retpoline configuration, and CPU vulnerability mitigation management for maximum gaming performance.
---

# Syscall Optimization Skill

## Overview
CPU security mitigations added after 2017 (Spectre, Meltdown, MDS, etc.) add measurable overhead to syscall-heavy workloads. This skill explains how to assess and optionally disable them on isolated gaming systems.

---

## ⚠️ Security Warning

> Disabling mitigations exposes the system to side-channel attacks. Only do this on:
> - **Dedicated offline gaming rigs** with no sensitive data
> - **Isolated LAN party machines**
> - **Benchmark systems** where maximum performance is the sole goal
>
> **Never disable mitigations on a system used for banking, email, or any personal data.**

---

## 1. Check Active Mitigations

```powershell
# Check all CPU vulnerability mitigations
Get-SpeculationControlSettings

# Or via WMI:
Get-CimInstance -Namespace "root\cimv2" -Class Win32_DeviceGuard |
    Select RequiredSecurityProperties, AvailableSecurityProperties, VirtualizationBasedSecurityStatus
```

### Common Mitigations and Their Overhead
| Mitigation | CVE | Syscall Overhead |
|-----------|-----|-----------------|
| KPTI (Meltdown) | CVE-2017-5754 | 5–30% for syscall-heavy code |
| Retpoline (Spectre v2) | CVE-2017-5715 | 2–5% indirect branches |
| SSBD (Spectre v4) | CVE-2018-3639 | 2–8% store instructions |
| MDS (RIDL/Fallout) | CVE-2018-12130 | Buffer flush overhead |
| LVI | CVE-2020-0551 | 2–19% (load value injection) |

---

## 2. Disable Mitigations via BCD

```powershell
# Disable all CPU mitigations (EXTREME — SECURITY RISK)
bcdedit /set {current} kernelstack noprotect
bcdedit /set {current} nx OptIn

# Disable specific mitigations:
# Meltdown (KPTI) — most impactful
bcdedit /set {current} isolatedcontext off

# Spectre v2 (retpoline)
# Note: More complex, requires registry flags

# Spectre v4 (SSBD)
# HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" `
    -Name "FeatureSettingsOverride" -Value 8 -Type DWord
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" `
    -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord
```

---

## 3. Selective Mitigation Control via Registry

Microsoft provides registry keys to selectively control mitigations:

```powershell
# Reference: KB4073119 / KB4073757
$mmPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"

# Disable SSBD only (lower risk, moderate gain)
Set-ItemProperty $mmPath -Name "FeatureSettingsOverride" -Value 8 -Type DWord
Set-ItemProperty $mmPath -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord

# Disable all software (highest performance — highest risk)
Set-ItemProperty $mmPath -Name "FeatureSettingsOverride" -Value 3 -Type DWord
Set-ItemProperty $mmPath -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord
```

---

## 4. Verify Mitigation Status After Changes

```powershell
# Install SpeculationControl module if not present
Install-Module SpeculationControl -Force -Scope CurrentUser
Import-Module SpeculationControl
Get-SpeculationControlSettings

# Expected fields:
# [+] Windows OS support for branch target injection mitigation is present
# [*] Windows OS support for branch target injection mitigation is disabled (by user)
```

---

## 5. Mitigation Impact by CPU Generation

| CPU | Meltdown Impact | Notes |
|-----|----------------|-------|
| Intel pre-Coffee Lake | High | KPTI hits syscall-heavy games |
| Intel 10th Gen+ | Low | Hardware mitigations in silicon |
| AMD Ryzen (all) | None for Meltdown | Not vulnerable to Meltdown |
| AMD Ryzen | Low for Spectre | Small retpoline overhead |

> AMD systems gain almost nothing from disabling most mitigations, as they're not vulnerable to Meltdown and have hardware Spectre v2 mitigations.

---

## 6. Context7 API Reference

This skill can query Context7 for the latest CVE databases and Windows patch notes:

```
Use tool: context7
Query: "Windows spectre meltdown mitigation registry keys"
Library: microsoft/windows-server-docs
```

---

## Verification

```powershell
# Check mitigation state
Get-SpeculationControlSettings | Format-List

# Benchmark syscall overhead: use Geekbench single-core or CineBench R23 single-thread
# Compare scores before/after to quantify the gain
```

---

## References
- [Microsoft KB4073119 — Mitigation Registry](https://support.microsoft.com/en-us/topic/kb4073119-protect-against-speculative-execution-side-channel-vulnerabilities-in-sql-server-e49f6a7a-1e3d-ac8f-9516-16fda1a21bf5)
- [MSRC — Speculation Control](https://support.microsoft.com/en-us/topic/kb4073757-protect-windows-devices-against-speculative-execution-side-channel-attacks-8a3e536c-e48b-e96e-3b85-1ab1c85a8742)
- [AMD Security Bulletin](https://www.amd.com/en/resources/product-security.html)
