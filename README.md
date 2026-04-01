# redcore OS

<p align="center">
  <a href="https://redcoreos.net" target="_blank">
    <img src="image.png" alt="redcore hero" style="max-width:420px;width:100%;border-radius:26px;box-shadow:0 32px 90px rgba(0,0,0,0.55);" />
  </a>
</p>

<div align="center" style="display:flex;flex-wrap:wrap;gap:0.35rem;justify-content:center;">
  <a href="https://redcoreos.net" target="_blank">
    <img src="https://img.shields.io/badge/Website-redcoreos.net-ff3b6d?style=for-the-badge&logo=windows&logoColor=white" alt="Website" />
  </a>
  <a href="https://github.com/redpersongpt/redcoreOS/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/redpersongpt/redcoreOS?style=for-the-badge&logo=github&color=ff3b6d&logoColor=white" alt="GitHub Stars" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/redpersongpt/redcoreOS?style=for-the-badge&logo=gnu&color=ff3b6d&logoColor=white" alt="License" />
  </a>
  <a href="https://redcoreos.net" target="_blank">
    <img src="https://img.shields.io/badge/Windows-10%2F11-ff3b6d?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
  </a>
</div>

<p align="center" style="margin-top:1.2rem;">
  <a href="https://redcoreos.net/download" target="_blank" style="display:inline-flex;align-items:center;gap:0.5rem;background:#ff3b6d;color:#fff;font-weight:600;padding:0.85rem 1.6rem;border-radius:999px;box-shadow:0 15px 35px rgba(255,59,109,0.35);text-decoration:none;">
    <span>Download redcore OS</span>
  </a>
</p>

Windows debloat tools love to overpromise and break things. redcore OS does the opposite: it scans your machine, classifies your hardware, shows you exactly what it plans to change, and only then applies reversible tweaks through a local Rust service. Nothing runs without your review. Everything can be rolled back.

## How It Works

1. **Scan** &mdash; the app detects your hardware, installed software, and current configuration.
2. **Classify** &mdash; your machine is matched to a profile (Gaming Desktop, Office Laptop, Work PC, etc.).
3. **Review** &mdash; you see every single action the tool will take, with risk levels and explanations. Nothing is hidden.
4. **Execute** &mdash; changes run through a local privileged Rust service. The renderer never touches the system directly.
5. **Rollback** &mdash; every change is logged with its original value. You can undo any action, any time.

## What It Does NOT Do

Let's be upfront, because this is where most tools lose trust:

| Concern | redcore OS behavior |
|---------|-------------------|
| **Windows Defender** | Kept enabled by default. Disabling is expert-only, opt-in, and blocked on Work/Office profiles. |
| **Windows Update** | Not disabled by default. Update control is available but requires explicit confirmation. |
| **Security mitigations** | Spectre/Meltdown mitigations are untouched unless you manually opt in as an expert. |
| **Anti-cheat** | Vanguard, EAC, and BattlEye are not affected by default. VBS disable (which can break Vanguard) is expert-only and shows a warning. |
| **One-click nuke** | Does not exist. Every action requires review. There is no "apply all" button. |

## What It Actually Changes

Every tweak is defined in a human-readable YAML playbook. You can read every single one before running the app.

<details>
<summary><strong>Bloatware Cleanup</strong></summary>

Removes pre-installed consumer apps (Candy Crush, TikTok, Instagram, etc.), optional Microsoft apps, and third-party OEM bloatware. Edge removal and Copilot removal are separate opt-in actions.

See: [`playbooks/appx/`](playbooks/appx/)
</details>

<details>
<summary><strong>Background Services</strong></summary>

Disables telemetry services (DiagTrack, dmwappushservice), consumer services (Xbox, Maps, Wallet), and optionally Windows Update services. Each service change lists the exact service name and what it does.

See: [`playbooks/services/`](playbooks/services/)
</details>

<details>
<summary><strong>Scheduled Tasks</strong></summary>

Disables telemetry and consumer scheduled tasks (Customer Experience, Application Experience, Cloud Experience Host, etc.).

See: [`playbooks/tasks/`](playbooks/tasks/)
</details>

<details>
<summary><strong>Privacy</strong></summary>

Disables advertising ID, activity history, input personalization, diagnostic data, and AI features (Recall, Copilot telemetry). Registry keys are listed in each playbook.

See: [`playbooks/privacy/`](playbooks/privacy/)
</details>

<details>
<summary><strong>Performance</strong></summary>

CPU scheduler priority, memory management (Large System Cache, IO page lock limit), GPU optimizations (hardware-accelerated scheduling, NVIDIA P-State), timer resolution, power plan, storage (disable last access timestamps, prefetch tuning). No magic numbers, no "500% FPS boost" claims.

See: [`playbooks/performance/`](playbooks/performance/)
</details>

<details>
<summary><strong>Shell & Explorer</strong></summary>

Taskbar cleanup (remove widgets, news, Copilot button), context menu restore (Windows 11 classic menu), disable search highlights, remove ads/tips from Settings and Start.

See: [`playbooks/shell/`](playbooks/shell/)
</details>

<details>
<summary><strong>Network</strong></summary>

Disable legacy protocols (NetBIOS, LLMNR, LMHOSTS), Nagle's algorithm tuning, network throttling index. Security hardening, not aggressive ripping.

See: [`playbooks/networking/`](playbooks/networking/)
</details>

<details>
<summary><strong>Security (Expert-Only)</strong></summary>

VBS, HVCI, Spectre/Meltdown mitigations, Defender control. All default to OFF. All require expert opt-in. All show risk warnings. All are blocked on Work PC and Office Laptop profiles.

See: [`playbooks/security/`](playbooks/security/)
</details>

## Machine Profiles

The app classifies your machine and applies a matching profile. Profiles control which actions are available and which are blocked:

| Profile | Preset | Notes |
|---------|--------|-------|
| Gaming Desktop | Aggressive | All tweaks available, expert actions still require opt-in |
| Gaming Laptop | Balanced | Power management preserved, thermal limits respected |
| Budget Desktop | Aggressive | Maximum cleanup for low-resource systems |
| High-end Workstation | Balanced | Professional software compatibility preserved |
| Office Laptop | Balanced | Print spooler, OneDrive, managed updates kept |
| Work PC | Conservative | Domain services, GPO, RDP, enterprise networking preserved |
| Low-Spec System | Aggressive | Maximum resource recovery |
| Virtual Machine | Conservative | Hypervisor features preserved |

## Architecture

```
apps/os-desktop/       Electron + React desktop shell (Tauri migration in progress)
services/os-service/   Rust privileged service (registry, services, tasks, rollback)
playbooks/             YAML action definitions and machine profiles
```

- The desktop app is the UI. It never executes system changes directly.
- The Rust service is the only component with elevated privileges. It validates actions, applies changes, and stores rollback data.
- Playbooks are declarative YAML. No compiled black-box logic. You can audit every registry key, every service change, every scheduled task disable.

## Build From Source

### Desktop

```bash
pnpm install
pnpm --dir apps/os-desktop build
```

### Rust Service

```bash
cargo build --release --manifest-path services/os-service/Cargo.toml
```

### Windows Installer

```bash
pnpm run dist:desktop
```

The desktop packaging step expects the Rust service binary to be built first.

## FAQ

**Is this another "custom Windows ISO" project?**
No. redcore OS does not ship a modified Windows image. It runs on your existing Windows 10/11 installation and applies registry, service, and task changes. Your Windows license, activation, and update channel are untouched.

**Will this break my games?**
Default settings do not touch anti-cheat dependencies. VBS (required by Vanguard) is only disabled if you manually opt in and acknowledge the warning. EAC and BattlEye are unaffected by any default action.

**Can I undo everything?**
Yes. The Rust service logs every change with its original value. You can roll back individual actions or the entire session.

**Why Rust for the service?**
System-level operations need memory safety and predictable performance. Rust gives both without a runtime. The service handles registry writes, service state changes, file operations, and rollback &mdash; all operations where a crash or corruption would be catastrophic.

**Why are playbooks YAML and not compiled?**
So you can read them. Every action, every registry key, every risk level is visible in plain text before you run anything. No trust-me binaries.

## Security

If you find a security issue, use [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

GPL-3.0. See [LICENSE](LICENSE).

---

**[https://redcoreos.net](https://redcoreos.net)** · **[redpersongpt/redcoreOS](https://github.com/redpersongpt/redcoreOS)**

[![Star History Chart](https://api.star-history.com/svg?repos=redpersongpt/redcoreOS&type=Date)](https://star-history.com/#redpersongpt/redcoreOS&Date)
