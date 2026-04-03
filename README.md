<p align="center">
  <img src="image.png" alt="OudenOS" width="700" />
</p>

<p align="center">
  <a href="https://ouden.cc"><img src="https://img.shields.io/badge/ouden.cc-E8E8E8?style=for-the-badge&logoColor=000000" alt="Website" /></a>
  <a href="https://github.com/redpersongpt/oudenOS/releases/latest"><img src="https://img.shields.io/github/v/release/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="License" /></a>
</p>

---

## What this actually does

OudenOS is a Windows optimization tool. It scans your system, shows you a list of changes, and applies them one by one. Every change creates a restore point. Every change is reversible. Nothing runs without your review.

It is **not** a magic FPS booster. It removes garbage that shouldn't be running in the background.

### The actual changes

<details>
<summary><b>Privacy</b> — telemetry, tracking, ads</summary>

- Disables Windows telemetry endpoints (DiagTrack, dmwappushservice)
- Removes Copilot, Recall, activity history, clipboard cloud sync
- Blocks ~70 known telemetry hostnames via hosts file
- Disables advertising ID, location tracking, speech data collection
- Removes Start menu suggested apps and tips

Each action is a registry key or service toggle. [See the playbooks.](https://github.com/redpersongpt/oudenECO/tree/main/playbooks)
</details>

<details>
<summary><b>Performance</b> — timer, scheduler, memory</summary>

- Sets timer resolution to 0.5ms (bcdedit `useplatformtick`)
- Disables core parking for consistent thread scheduling
- Configures MMCSS for multimedia/gaming priority
- Disables memory compression (trades RAM for CPU)
- Fixes NDU memory leak (NetworkDataUsageMonitor)
- Disables SysMain/Superfetch prefetching
- Sets High Performance power plan

These are registry edits under `HKLM\SYSTEM\CurrentControlSet`. Nothing exotic.
</details>

<details>
<summary><b>Gaming</b> — GPU, input lag, overlays</summary>

- Disables Game DVR/Game Bar background recording
- Disables Multi-Plane Overlay (MPO) — fixes stuttering on some GPU/monitor combos
- Forces legacy flip model for DirectX
- Blocks GPU telemetry (NVIDIA/AMD)
- Controls Hardware Accelerated GPU Scheduling (HAGS)

MPO disable is controversial — it helps on affected hardware, does nothing on unaffected hardware. The tool shows you the change before applying.
</details>

<details>
<summary><b>Services</b> — background processes</summary>

Disables services like:
- `DiagTrack` (Connected User Experiences and Telemetry)
- `dmwappushservice` (WAP Push Message Routing)
- `WSearch` (Windows Search indexer — optional)
- `SysMain` (Superfetch)
- `WerSvc` (Windows Error Reporting — **optional, off by default**)
- `MapsBroker`, `lfsvc`, `RetailDemo`, etc.

**No service is disabled without showing you what it does first.** Work PC profiles keep Print Spooler, RDP, SMB, Group Policy services running.
</details>

<details>
<summary><b>Shell</b> — UI cleanup</summary>

- Removes Start menu ads/suggestions
- Restores classic right-click context menu (Win11)
- Hides widgets panel
- Cleans taskbar (removes Chat, News, Search highlights)
- Optional: dark mode, accent color, Explorer tweaks
</details>

<details>
<summary><b>Network</b> — Nagle, QoS</summary>

- Disables Nagle's algorithm for lower latency
- Adjusts QoS packet scheduler
- Controls TCP/UDP offloading
- Disables network throttling index
</details>

### What it does NOT do

- Does not modify Windows system files
- Does not patch DLLs or executables
- Does not install drivers
- Does not touch your data, documents, or installed apps
- Does not require internet access to run
- Does not phone home or collect telemetry (ironic, right?)

## Architecture

```
Tauri app (Rust + React)
  │
  ├── Renderer (React/TypeScript)
  │     14-step wizard UI
  │
  └── Rust service (privileged)
        Registry edits, service toggles, 
        restore point creation, rollback
```

Built with Tauri (not Electron — 5MB installer, not 150MB). The Rust service runs with admin privileges and does the actual system modifications. The renderer is just UI.

### Playbooks

All optimization actions are defined in [YAML playbooks](https://github.com/redpersongpt/oudenECO/tree/main/playbooks). 40 files across categories:

```
playbooks/
  appx/           App removal (Copilot, widgets, etc.)
  networking/     TCP/UDP tuning
  performance/    Timer, scheduler, memory
  privacy/        Telemetry, tracking
  security/       VBS, Defender (expert-only)
  services/       Background service management
  shell/          UI cleanup, context menu
  startup/        Boot optimization
  tasks/          Scheduled task cleanup
  personalization/ Dark mode, accent, Explorer
```

Every playbook action has: description, risk level, category, and revert instructions. Nothing is hidden.

## Profiles

The tool classifies your machine and selects actions accordingly:

| Profile | What it keeps | What it removes |
|---------|--------------|-----------------|
| Gaming Desktop | DirectX, GPU services | Telemetry, bloatware, background services |
| Work PC | Print Spooler, RDP, SMB, VPN, Group Policy | Ads, telemetry (conservative) |
| Workstation | Pro tools, Hyper-V | Consumer bloatware |
| Office Laptop | Battery optimization, WiFi | Background services, visual effects |
| Low-spec | Aggressive cleanup | Everything non-essential |
| Gaming Laptop | GPU + battery balance | Background services, telemetry |
| VM | Minimal changes | Telemetry only |

## Requirements

- Windows 10 (21H2+) or Windows 11
- x64
- Admin privileges
- 500 MB free disk

## FAQ

**"Is this AI-generated code?"**
Parts of it were written with AI assistance. The playbooks were manually researched and tested. The Rust service that actually touches your system was written with care. If you don't trust it, read the source — that's why it's open.

**"Why not just use Chris Titus Tech / Schneegans / manual registry edits?"**
Those work fine. This is for people who want a guided flow with rollback safety instead of running scripts they can't undo.

**"Windows Error Reporting service — are you insane?"**
WerSvc is optional and off by default. It's listed because some users want it gone. The tool shows you what each service does before you decide.

**"Why should I trust random software with admin access?"**
You shouldn't blindly. Read the [playbooks](https://github.com/redpersongpt/oudenECO/tree/main/playbooks), read the [Rust service source](https://github.com/redpersongpt/oudenECO/tree/main/services/os-service), decide for yourself.

## License

GPL-3.0 — [LICENSE](LICENSE)
