<p align="center">
  <img src="image.png" alt="OudenOS" width="700" />
</p>

<p align="center">
  <a href="https://ouden.cc"><img src="https://img.shields.io/badge/ouden.cc-E8E8E8?style=for-the-badge&logoColor=000000" alt="Website" /></a>
  <a href="https://github.com/redpersongpt/oudenOS/releases/latest"><img src="https://img.shields.io/github/v/release/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="License" /></a>
</p>

---

## Before you start complaining

This is not a "RAM cleaner." This is not a "FPS booster." This is not a batch script someone found on a forum in 2014.

OudenOS scans your machine, classifies your hardware, shows you every single change it plans to make, and lets you approve or reject each one. Creates a restore point before touching anything. Every action is reversible. 5MB installer. Built with Tauri + Rust, not Electron.

The entire source code is right here. Read it or don't.

## What it actually changes

<details>
<summary><b>Privacy</b> — 70+ telemetry endpoints blocked</summary>

- Kills DiagTrack, dmwappushservice, Connected User Experiences
- Removes Copilot, Recall, activity history, clipboard cloud sync
- Blocks ~70 telemetry hostnames via hosts file
- Disables advertising ID, location tracking, speech data collection
- Removes Start menu "suggestions" (ads)

Registry keys under `HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection`. Not magic. [See the playbooks.](https://github.com/redpersongpt/oudenECO/tree/main/playbooks/privacy)
</details>

<details>
<summary><b>Performance</b> — timer, scheduler, memory</summary>

- Timer resolution → 0.5ms (`bcdedit useplatformtick`)
- Core parking disabled for consistent thread scheduling
- MMCSS configured for multimedia/gaming priority
- Memory compression disabled (trades RAM for CPU cycles)
- NDU memory leak fixed (NetworkDataUsageMonitor)
- SysMain/Superfetch disabled
- High Performance power plan activated

Registry edits under `HKLM\SYSTEM\CurrentControlSet`. Nothing you couldn't do manually in regedit. This just does it without you fat-fingering a DWORD.
</details>

<details>
<summary><b>Gaming</b> — GPU, input lag, overlays</summary>

- Game DVR/Game Bar background recording → off
- Multi-Plane Overlay (MPO) → off (fixes stuttering on affected hardware, does nothing on unaffected — the tool tells you which)
- Legacy flip model for DirectX
- GPU telemetry blocked (NVIDIA/AMD)
- HAGS control

MPO disable is controversial. Some people swear by it, some say it's placebo. If your hardware stutters with it on, turn it off. If it doesn't, leave it. The tool doesn't force anything.
</details>

<details>
<summary><b>Services</b> — 40+ background processes</summary>

Examples:
- `DiagTrack` — telemetry. Off.
- `dmwappushservice` — WAP push routing. Off.
- `WSearch` — Windows Search indexer. Optional.
- `SysMain` — Superfetch. Off.
- `MapsBroker`, `lfsvc`, `RetailDemo` — bloat. Off.

**Windows Error Reporting (`WerSvc`)** — optional, off by default in the UI. Listed because some users want it gone. If you need crash reports, leave it on. The tool shows you what each service does before you decide. Nobody's forcing anything.

Work PC profiles keep Print Spooler, RDP, SMB, Group Policy running. Because we're not insane.
</details>

<details>
<summary><b>Shell</b> — UI cleanup</summary>

- Removes Start menu ads
- Restores classic right-click (Win11)
- Hides widgets
- Cleans taskbar (Chat, News, Search highlights → gone)
- Optional dark mode, accent color, Explorer tweaks
</details>

<details>
<summary><b>Network</b> — latency</summary>

- Nagle's algorithm → off
- QoS packet scheduler adjusted
- TCP/UDP offloading control
- Network throttling index disabled
</details>

<details>
<summary><b>Security</b> — expert only</summary>

- VBS/HVCI control
- Defender management
- CPU mitigations toggle

Locked behind expert mode. If you don't know what VBS is, you won't see these options.
</details>

## What it does NOT do

- Modify system files or DLLs
- Install drivers
- Touch your documents, apps, or games
- Require internet
- Phone home or collect any data
- Run in the background after you close it
- Ask you to create an account

## Architecture

```
5MB Tauri installer
├── React UI (14-step wizard)
└── Rust service (privileged)
      Registry edits, service toggles,
      restore points, rollback
```

Not Electron. Not a 150MB web browser pretending to be a desktop app. Tauri compiles to native with a Rust backend. The privileged service runs as admin to make system changes. The UI is just a wizard.

### Playbooks

Every optimization is defined in [YAML playbooks](https://github.com/redpersongpt/oudenECO/tree/main/playbooks). 40 files:

```
playbooks/
  appx/           Copilot, widgets, bloatware removal
  networking/     TCP/UDP, Nagle, offloading
  performance/    Timer, scheduler, memory, power
  privacy/        Telemetry, tracking, ads
  security/       VBS, Defender (expert-only)
  services/       Background service management
  shell/          Context menu, taskbar, Start menu
  startup/        Boot optimization
  tasks/          Scheduled task cleanup
  personalization/ Dark mode, accent, Explorer
```

Every action has: what it does, risk level, category, and how to undo it. Nothing hidden. Read every line if you want.

## 8 Profiles

| Profile | Keeps | Removes |
|---------|-------|---------|
| Gaming Desktop | DirectX, GPU services | Everything non-essential |
| Work PC | Print Spooler, RDP, SMB, VPN, Group Policy | Ads, telemetry only |
| Workstation | Pro tools, Hyper-V | Consumer bloatware |
| Office Laptop | Battery optimization, WiFi | Background drain |
| Gaming Laptop | GPU + battery balance | Services, telemetry |
| Low-spec | Nothing sacred | Everything possible |
| VM | Minimal touch | Telemetry only |
| Budget Desktop | Essential drivers | Bloatware, visual effects |

## Requirements

- Windows 10 (21H2+) or Windows 11
- x64
- Admin privileges
- 500 MB free disk

## FAQ

**"Is this AI-generated?"**
Parts of it were written with AI. The Rust service that touches your system was written with care. The playbooks were manually researched against Microsoft documentation. The entire source is here — read it and decide for yourself. That's literally the point of open source.

**"Why not Chris Titus / Schneegans / manual regedit?"**
Use whatever works for you. This exists for people who want a guided wizard with per-action rollback instead of running scripts they can't easily undo.

**"Why should I trust random software with admin access?"**
You shouldn't. Read the [playbooks](https://github.com/redpersongpt/oudenECO/tree/main/playbooks). Read the [Rust service](https://github.com/redpersongpt/oudenECO/tree/main/services/os-service). Run it in a VM first. Or don't use it. Your machine, your choice.

**"No code signing?"**
Costs $300+/year. Not there yet. SmartScreen will complain — right-click → Properties → Unblock, or "More info" → "Run anyway." Source is public if you want to build it yourself.

## License

GPL-3.0
