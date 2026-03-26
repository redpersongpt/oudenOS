# redcore-OS

Premium in-place Windows transformation wizard. Companion product to redcore-Tuning.

## What This Is

An in-place Windows transformation tool that reshapes the user's CURRENT Windows installation into a cleaner, faster, more intentional state — based on machine profile and workload.

## What This Is NOT

- NOT an ISO builder
- NOT a reinstall tool
- NOT a custom Windows image creator
- NOT a deployment tool

## Architecture

```
Desktop (Electron + React + Vite)
  renderer ──contextBridge──► main
            preload typed API  │
                    JSON-RPC   │
                    stdio/pipe │
                               ▼
              service-core (Rust/tokio)
              ├── scanner (deep OS assessment)
              ├── classifier (machine + workload profiling)
              ├── transformer (staged OS transformation)
              ├── executor (applies changes)
              ├── rollback (snapshot/restore)
              ├── journal (reboot-resume)
              ├── preservation (Work PC safety logic)
              └── db (SQLite state)
```

## Profiles (8)

1. Gaming Desktop
2. Budget Desktop
3. High-end Workstation
4. Office Laptop
5. Gaming Laptop
6. Low-spec System
7. VM / Cautious Mode
8. Work PC (FIRST CLASS — preserves printing, RDP, domain, SMB, VPN)

## Wizard Flow (18 steps)

1. Welcome / machine identity
2. Current Windows health assessment
3. Machine + workload profile detection
4. Transformation strategy
5. Windows cleanup / debloat
6. Startup and background reduction
7. Services and scheduled tasks
8. Privacy / telemetry
9. Performance tuning
10. Infrastructure (memory/storage/network/display/audio)
11. App replacement / app hub
12. Profile-specific review (Work PC preservation OR gaming specialization)
13. Advanced controls
14. Apply prep
15. Live execution
16. Reboot / resume
17. Outcome report
18. Hand-off to redcore-Tuning

## Hard Rules

1. Renderer NEVER touches system APIs
2. Context isolation mandatory
3. Every transformation must be reversible
4. Work PC profile must preserve business-critical services
5. No emojis in the UI
6. Premium wizard-first UX

## Stack

| Layer | Tech |
|-------|------|
| UI | React 18, TypeScript, Tailwind, Framer Motion |
| Desktop | Electron (frameless, wizard layout) |
| Build | Vite, pnpm workspaces |
| Service | Rust, tokio, windows-rs 0.58, rusqlite |
| IPC | JSON-RPC over stdio |
