<p align="center">
  <img src="image.png" alt="OudenOS" width="700" />
</p>

<p align="center">
  <a href="https://ouden.cc"><img src="https://img.shields.io/badge/ouden.cc-E8E8E8?style=for-the-badge&logoColor=000000" alt="Website" /></a>
  <a href="https://github.com/redpersongpt/oudenOS/releases/latest"><img src="https://img.shields.io/github/v/release/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="License" /></a>
</p>

---

## What this is

A 5MB tool that does what you'd spend 4 hours doing manually in regedit — except it won't brick your install because it actually knows what your hardware is before changing anything.

Scans your machine. Classifies it. Shows you the full list. You pick what stays and what goes. Restore point before every change. Done.

No account. No internet required. No background process. Closes when you close it.

## What it actually changes

Most "optimization guides" on YouTube tell you to paste registry commands without explaining what they do. Here's what this tool touches, and why.

<details>
<summary><b>Privacy</b> — because Windows ships with 70+ telemetry endpoints enabled by default and most people don't even know</summary>

- Disables DiagTrack, dmwappushservice, Connected User Experiences
- Removes Copilot, Recall, activity history, clipboard cloud sync
- Blocks ~70 known telemetry hostnames via hosts file
- Disables advertising ID, location tracking, speech data collection
- Removes Start menu "suggestions" (they're ads, Microsoft just doesn't call them that)

Registry keys under `HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection`. [See the playbooks.](playbooks/privacy)
</details>

<details>
<summary><b>Performance</b> — the stuff that actually matters and nobody bothers to check</summary>

- Timer resolution → 0.5ms (your system runs at 15.6ms by default. Yes, really.)
- Core parking disabled — Windows loves to park cores for "power savings" on desktop PCs that are plugged into a wall
- MMCSS configured for multimedia/gaming thread priority
- NDU memory leak fixed — a known Windows bug that Microsoft hasn't patched since 2018

`HKLM\SYSTEM\CurrentControlSet`. Standard registry edits. Nothing you couldn't do yourself if you knew where to look.
</details>

<details>
<summary><b>Gaming</b> — because Game Bar is recording your screen right now and you probably don't know</summary>

- Game DVR/Game Bar background recording → off (yes, it's on by default. Yes, it uses GPU resources.)
- Legacy flip model for DirectX
- GPU telemetry blocked — your graphics driver phones home too
- HAGS control — Hardware Accelerated GPU Scheduling. Sometimes helps. Sometimes doesn't. Depends on your GPU.

None of this is controversial. Most of it is in every "gaming optimization" guide. The difference is this tool checks your hardware first instead of blindly applying everything.
</details>

<details>
<summary><b>Services</b> — Windows runs 280+ services by default. You need about 60 of them.</summary>

Disables things like:
- `DiagTrack` — telemetry collector
- `dmwappushservice` — WAP push routing (you don't have a WAP phone)
- `WSearch` — indexer that thrashes your disk to make Cortana search 0.2 seconds faster
- `MapsBroker` — offline maps. For your desktop.
- `RetailDemo` — turns your PC into a Best Buy display model

Work PC profiles automatically keep Print Spooler, RDP, SMB, Group Policy, VPN services running. Because unlike some tools, this one checks what you actually need before removing it.

**Task Manager, Explorer, and critical system services are protected** — they can never be disabled regardless of profile or expert mode.
</details>

<details>
<summary><b>Shell</b> — the visual garbage</summary>

- Start menu ads → gone
- Widgets panel → hidden (Win11 only — Win10 users won't see this option)
- Taskbar: Chat, News, Search highlights → removed
- Optional: dark mode, Ouden wallpaper (starfield + logo at your resolution), accent color
</details>

<details>
<summary><b>Network</b> — Nagle's algorithm is enabled by default. Look it up.</summary>

- Nagle disabled — buffers your packets "for efficiency." Great for file transfers in 1984. Bad for gaming in 2026.
- QoS adjusted
- TCP/UDP offloading control
- Network throttling index disabled
</details>

<details>
<summary><b>Security</b> — expert only, locked by default</summary>

- VBS/HVCI control (costs 5-15% CPU performance on some systems. Microsoft doesn't mention this.)
- Defender management (Tamper Protection detected → skips cleanly instead of timing out)
- CPU mitigations toggle (Spectre/Meltdown patches — the ones that cost 2-8% performance)

If you don't know what VBS is, you won't see these options. They're behind an expert gate for a reason.
</details>

## What it does NOT do

- Modify system files or DLLs
- Break Explorer or Task Manager (ever)
- Install drivers
- Touch your documents, apps, or games
- Require internet
- Collect any data whatsoever
- Run in the background
- Ask you to create an account
- Show Win11-only options on Win10

## How it works

```
SCAN      → reads your hardware, services, startup items
CLASSIFY  → figures out if you're a gaming PC, work laptop, VM, etc.
PLAN      → builds an action list based on YOUR machine, not a generic preset
EXECUTE   → applies changes one by one, restore point first
VALIDATE  → confirms what changed, generates a report
```

Built with Tauri (Rust backend, React frontend). 5MB installer. The privileged Rust service does the actual system modifications. The UI is just a wizard. Your progress is saved — if the machine reboots mid-apply, the wizard picks up where it left off.

### Personalization

- **Wallpaper** — generates an Ouden-branded wallpaper (black + starfield + logo) at your native resolution via GDI+
- **Accent color** — pure black for monochrome Ctrl+Alt+Del, shutdown, and login screens
- **Refresh rate** — auto-detects and sets your monitor's max Hz via ChangeDisplaySettingsEx
- **ClearType** — font smoothing is always preserved, never broken

### Playbooks

Every single optimization is defined in [readable YAML files](playbooks). 40 files across 10 categories. Every action documents: what it does, the risk level, and how to undo it.

You can read every line of what this tool will do to your system before you run it. That's the point.

## 8 Profiles

| Profile | What it protects | How aggressive |
|---------|-----------------|----------------|
| Gaming Desktop | GPU services, DirectX | Full cleanup |
| Work PC | Print, RDP, SMB, VPN, Group Policy | Conservative — telemetry + ads only |
| Workstation | Pro tools, Hyper-V | Moderate |
| Office Laptop | Battery, WiFi | Moderate + power optimization |
| Gaming Laptop | GPU + battery balance | Moderate |
| Low-spec | Nothing | Maximum cleanup |
| VM | Everything | Telemetry only |
| Budget Desktop | Essential drivers | Aggressive cleanup |

## Before you install

**You need the Visual C++ Runtime** — most PCs already have it, but if the app crashes on launch or tweaks don't apply, install this first:

**[Download Visual C++ Redistributable (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe)** — direct Microsoft link, 24MB

## Requirements

- Windows 10 (21H2+) or Windows 11
- x64, admin, 500 MB free

## "But..."

**"Is this AI code?"**
Partially. The playbooks were researched against Microsoft documentation and tested on real hardware. The Rust backend was written carefully. The source is right here — that's what open source means.

**"I use Chris Titus / Schneegans / manual regedit"**
Good. Those work. This is for people who want guided per-action rollback instead of hoping a PowerShell script doesn't break something they need.

**"No code signing?"**
$300/year. Not yet. SmartScreen will flag it. Right-click → Properties → Unblock. Or build from source.

**"Why should I trust this?"**
You shouldn't trust any software blindly. [Read the playbooks](playbooks). [Read the Rust service](services/os-service). Run it in a VM. Or don't. Your call.

## Changelog

### v0.9.0

- **Reboot-safe wizard** — wizard state now persists across reboots. If the machine restarts mid-apply, the app resumes at the reboot step instead of starting over.
- **Shell stability hardening** — 25-package AppX denylist prevents removal of Explorer-coupled packages (ShellExperienceHost, StartMenuExperienceHost, Search, ContentDeliveryManager, Client.CBS, CrossDeviceResume, etc.). 25+ critical services are protected from accidental disable.
- **Shell refresh rewritten** — uses only `SendMessageTimeout` with `WM_SETTINGCHANGE`. No more COM automation, rundll32 hacks, or Stop-Process explorer.
- **AutoEndTasks removed** — was force-killing hung Explorer instead of letting it recover.
- **FTH and MPO actions removed** — Fault Tolerant Heap disable broke Explorer crash recovery; Multi-Plane Overlay disable broke icon rendering.
- **Win10/Win11 gating** — Copilot, Recall, Click to Do, classic context menu, Widgets, and End Task options are now correctly hidden on builds that don't support them.
- **Dark theme fix** — `ColorPrevalence=0` for natural dark taskbar instead of forcing accent color.
- **Lock screen wallpaper** — writes to `%ProgramData%\OudenOS` (machine-wide, accessible by SYSTEM) instead of user-local path.
- **Questionnaire audit system** — 58 audited questions, 226 fallback actions, all invariant and execution checks passing.

### v0.8.0

- Initial public release with 8 profiles, 222 YAML-defined actions, 67 wizard questions.

## License

GPL-3.0
