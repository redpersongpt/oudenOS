# oudenOS — Mac demo

oudenOS is a Windows optimization app, but you can preview the entire interface
on a Mac (or any machine with Node + pnpm) without a Windows service behind it.

```bash
pnpm install        # once
pnpm demo:os:mac
```

This starts the desktop renderer in your browser and opens it automatically. A
blue banner at the bottom makes clear you are in **demo mode**:

> Demo preview — oudenOS is running without its Windows service. The UI is fully
> interactive, but nothing is applied to this device.

## What works

- The full wizard: welcome → assessment → profile → strategy → playbook review →
  final review → execution → results.
- Realistic simulated data: a detected profile, a resolved playbook, and an
  apply run that animates through the steps.
- The same UI, theme, and copy as the real Windows app.

## What it does NOT do

- It does **not** connect to the privileged Windows service, so no registry,
  service, package, or power changes are ever made.
- It does **not** require Rust/Tauri — it is just the React renderer served by
  Vite.

## How it works

In a browser there is no `window.__TAURI__` runtime, so
`apps/os-desktop/src/renderer/lib/platform-tauri.ts` reports `mode: "demo"` and
every service call returns "unavailable". The wizard steps fall back to their
demo branches (simulated assessment, the bundled
`generated-playbook-fallback.json`, and a faked apply loop), and
`main.tsx` shows the demo banner.

Override the port with `OUDEN_DEMO_PORT` if 5173 is taken:

```bash
OUDEN_DEMO_PORT=5180 pnpm demo:os:mac
```

> Note: a native macOS `.app` is intentionally not produced — the real app is a
> Tauri/Windows build. This demo is the renderer only, which is why it runs
> anywhere Node does.
