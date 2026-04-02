<p align="center">
  <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 82.14 66.08 A 32 32 0 1 1 77.1 39.9" stroke="#E8E8E8" stroke-width="7" stroke-linecap="round" fill="none"/>
    <circle cx="77.1" cy="39.9" r="4" fill="#E8E8E8"/>
  </svg>
</p>

<h1 align="center">OudenOS</h1>

<p align="center">
  <a href="https://ouden.cc"><img src="https://img.shields.io/badge/ouden.cc-E8E8E8?style=for-the-badge&logo=windows&logoColor=000000" alt="Website" /></a>
  <a href="https://github.com/redpersongpt/oudenOS/releases/latest"><img src="https://img.shields.io/github/v/release/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="Release" /></a>
  <a href="https://github.com/redpersongpt/oudenOS/stargazers"><img src="https://img.shields.io/github/stars/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="Stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/redpersongpt/oudenOS?style=for-the-badge&color=E8E8E8&labelColor=111111" alt="License" /></a>
</p>

<p align="center">
  Open-source Windows optimization. Scans first, acts second. 250+ reversible actions.
</p>

<p align="center">
  <a href="https://ouden.cc">ouden.cc</a> · <a href="https://github.com/redpersongpt/oudenOS">Source</a> · <a href="https://github.com/redpersongpt/oudenOS/releases/latest">Download</a>
</p>

---

## What it does

OudenOS scans your Windows machine, classifies your hardware, builds a profile-specific plan, and applies reversible changes. Nothing runs without your review. Everything can be rolled back.

- **No reinstall** — transforms your current Windows install
- **8 machine profiles** — gaming, workstation, office, laptop, low-spec, VM, work PC
- **250+ actions** — services, startup, privacy, telemetry, shell, personalization
- **Work PC safe** — Print Spooler, RDP, SMB, Group Policy, VPN preserved
- **Full rollback** — snapshot before every change

## How it works

```
01  SCAN       Hardware, services, startup, telemetry state
02  PROFILE    Classify machine → select optimization path
03  PLAN       Review every action before execution
04  EXECUTE    Apply changes with rollback safety
```

## System requirements

- Windows 10 (21H2+) or Windows 11
- x64 architecture
- Administrator privileges
- 500 MB free disk space

## Stack

- **Frontend** — Tauri + React + TypeScript
- **Backend** — Rust privileged service
- **Playbooks** — 40 YAML transformation modules
- **Design** — Monochrome OLED black, Space Grotesk, Doto display

## License

See [LICENSE](LICENSE).
