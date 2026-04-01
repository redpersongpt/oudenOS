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
  <a href="https://github.com/redpersongpt/redcore-OS/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/redpersongpt/redcore-OS?style=for-the-badge&logo=github&color=ff3b6d&logoColor=white" alt="GitHub Stars" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/redpersongpt/redcore-OS?style=for-the-badge&logo=gnu&color=ff3b6d&logoColor=white" alt="License" />
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

Windows changes are easy to overpromise and easy to wreck. `redcore OS` takes the opposite route: inspect first, classify the machine, show the plan, then apply reversible changes through a local privileged service.

## What It Is

- Desktop shell built with Electron + React
- Local privileged service built in Rust
- Playbook-driven task system for privacy, services, shell, networking, and performance
- Machine-profile classification before transformation
- Rollback-aware execution model instead of fire-and-forget scripting

## Public Scope

- `apps/os-desktop`  
  Electron desktop app and renderer
- `services/os-service`  
  Local Windows service that performs privileged actions
- `playbooks`  
  Declarative task definitions and machine profiles

This public repo is intentionally narrow. It contains the app, the local service, and the playbook system required to review and run transformations on Windows. Internal deployment, hosted services, and private ops tooling are not part of this release boundary.

## How It Works

1. Launch the desktop app.
2. Run the machine assessment.
3. Review the detected profile and proposed actions.
4. Execute the plan through the local service.
5. Verify results and keep rollback data available.

## Safety Model

- Privileged operations are isolated in the Rust service.
- The renderer never executes system-level changes directly.
- External navigation is restricted.
- Playbooks are loaded from a known local path.
- The flow is review-first, not blind one-click mutation.

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

## Project Layout

```text
apps/
  os-desktop/
services/
  os-service/
playbooks/
```

## Security

If you find a security issue, use [SECURITY.md](SECURITY.md) instead of opening a public exploit issue.

## License

GPL-3.0. See [LICENSE](LICENSE).

---

**[https://redcoreos.net](https://redcoreos.net)** · **[redpersongpt/redcore-OS](https://github.com/redpersongpt/redcore-OS)**

[![Star History Chart](https://api.star-history.com/svg?repos=redpersongpt/redcore-OS&type=Date)](https://star-history.com/#redpersongpt/redcore-OS&Date)
