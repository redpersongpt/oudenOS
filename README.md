<p align="center">
  <img src="apps/web/public/icon.svg" width="80" alt="oudenOS" />
</p>

<h1 align="center">oudenOS</h1>

<p align="center">
  <a href="https://github.com/redpersongpt/oudenOS/releases/latest"><img src="https://img.shields.io/github/v/release/redpersongpt/oudenOS?style=flat-square&color=000000&labelColor=000000" alt="Release" /></a>
  <a href="https://github.com/redpersongpt/oudenOS/blob/main/LICENSE"><img src="https://img.shields.io/github/license/redpersongpt/oudenOS?style=flat-square&color=000000&labelColor=000000" alt="License" /></a>
  <a href="https://ouden.cc"><img src="https://img.shields.io/badge/ouden.cc-website-000000?style=flat-square&labelColor=000000" alt="Website" /></a>
</p>

<p align="center">
  <img src="https://github.com/redpersongpt/oudenOS/raw/main/docs/demo.gif" alt="oudenOS demo" width="720" />
</p>

---

## What Is This

You spend $2000 on a laptop. You open it up. Microsoft has already installed Candy Crush, pinned Bing to your search bar, and is reporting your keystrokes to a telemetry server in Redmond. Edge is begging to be your default browser. There's a weather widget you didn't ask for. Xbox Game Bar is running in the background on a machine that's never seen a controller.

Every "debloat guide" on Reddit tells you to paste a PowerShell one-liner from some random gist, pray it doesn't break Windows Update, and then reinstall when your Start Menu stops working two weeks later.

oudenOS is not that.

It's a proper desktop wizard. It scans your hardware, figures out what you're running, and then gives you a choice: one-click **Recommended** or **Gaming** setup, or the full **57-question** walkthrough if you want to decide everything yourself. Every change gets snapshotted. You can undo everything. Nothing happens without you seeing exactly what it's going to do first.

## How It Works

1. **Scan** — Detects your CPU, GPU, RAM, disk, and every background service Microsoft is running behind your back
2. **Profile** — Matches you to a hardware profile (gaming desktop, office laptop, work PC, VM, low-spec) so you don't accidentally nuke laptop battery management on a desktop
3. **Quick setup or questionnaire** — Pick Recommended or Gaming and go straight to review, or answer up to 57 questions across 7 categories. Security trade-offs are never pre-ticked
4. **Review** — Every registry key, every service, every scheduled task. No surprises
5. **Apply** — Runs the changes with rollback snapshots saved to disk
6. **Done** — Your PC boots faster, runs quieter, and stopped phoning home to Microsoft

## Features

- **One-click quick setups** — Recommended (safe cleanup and privacy) or Gaming (dedicated gaming PC), straight to the review screen
- **57 questions across 7 categories** — Essentials, Privacy, Performance, Shell, Networking, Security, and a preset selector, for when you want full control
- **Hardware detection** — Gaming desktop, office laptop, work PC, VM, low-spec. Your plan is built for YOUR machine, and actions that don't apply to your hardware or Windows build are left out
- **System check** — Read-only checks for the things that actually decide your frame rate: GPU PCIe link, RAM profile, VBS, refresh rate, power plan, BIOS age. It tells you; it doesn't touch them
- **168 playbook actions** — Registry tweaks, service toggles, scheduled task removal, AppX cleanup, power settings. Every one loads, is reachable, and is valid on current Windows 11 builds. Duplicates, dead Windows 10 leftovers and placebo tweaks were cut
- **Full rollback** — Every change is snapshotted with its original type before it runs. Undo one action or everything
- **No FPS promises** — Measure before and after with PresentMon or CapFrameX. If a tweak has no measured gain, the app says so
- **Work PC safe** — Print Spooler, RDP, SMB, Group Policy, VPN all protected by default. We're not breaking your IT setup
- **Win11 + Win10 22H2**
- **Free. Open source. No paywalls.** This isn't a SaaS with a free tier

## The Research

Unlike the Reddit crowd copy-pasting registry hacks from 2019 forum posts, every tweak in oudenOS is backed by actual benchmarks and real-world testing from two repos:

- **[valleyofdoom/PC-Tuning](https://github.com/valleyofdoom/PC-Tuning)** — The benchmark-first optimization guide. Every single tweak gets tested with real frametime data, not vibes. If it doesn't have a measurable effect, it's not in here
- **[ChrisTitusTech/winutil](https://github.com/ChrisTitusTech/winutil)** — Battle-tested by millions of users daily. Half the toggles in oudenOS exist because Chris proved they work at scale

Every toggle maps to a real registry path, a real service, a real scheduled task. No placebo tweaks. No "disable Superfetch for faster boot" nonsense that stopped being true in 2018.

## Links

- [GitHub](https://github.com/redpersongpt/oudenOS) — Star if this saved you from doing a clean reinstall
- [YouTube](https://www.youtube.com/@redpersonn) — Subscribe for more
- [ouden.cc](https://ouden.cc)

## Repository Layout

This is a monorepo. The free, open-source oudenOS app is the **`os-*` line**:

- `apps/os-desktop` — the Tauri desktop wizard this README is about
- `services/os-service` — the privileged Rust service that performs the system changes
- `apps/os-api`, `apps/os-website`, `packages/os-shared-schema` — backend, site, and shared types

oudenOS itself has **no licensing, payments, or premium tiers** — the "No paywalls" claim above holds for everything under the `os-*` line.

The repo also contains a **legacy line (`tuning-*`)** — the older "oudenOS Tuning" Electron product (`apps/tuning-*`, `services/tuning-service`, `packages/tuning-*`). That codebase predates the current app and still includes subscription / Stripe / license code from when it was a paid product. It is kept for history and is **not** part of the free oudenOS app. The marketing site (`apps/web`) and the shared backend packages (`@oudenos/db`, `@oudenos/cloud-api`) serve both lines.

The canonical desktop runtime is **Tauri** (the legacy `tuning-desktop` was Electron).

## License

MIT
