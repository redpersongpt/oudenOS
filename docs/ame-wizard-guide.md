# AME Wizard Playbook Guide

redcore ECO now ships a full playbook designed for drag-and-drop use inside the AME Wizard. The wizard tracks the transformation state, applies the Rust service plan, and keeps rollback metadata so every change is reversible.

## Key improvements borrowed from ReviOS

1. **Wizard-first workflow** – users download the AME Wizard, drop our `playbooks/redcore-os.yml` into the UI, and the wizard orchestrates the rest (just like ReviOS does). That keeps our installer consistent with what players already expect from AME.
2. **Playbook modularity** – the YAML files focus on workspace safety, debloat, frame-time tuning, and rollback. The wizard exposes the same section structure, so the UI can present descriptive titles without exposing internal scripts.
3. **Documentation parity** – this guide plus `docs/os-playbook.md` (coming soon) mirrors ReviOS’s documentation links and points at `docs/os-playbook.md#troubleshooting` for support, while also referencing our `playbooks/README` for versioned descriptions.

## Getting started

1. Grab the AME Wizard from [amelabs.net](https://amelabs.net).
2. Download the latest artifact from `scripts/build-and-publish-os-release.sh` or the `artifacts/open-source/redcore-os` folder.
3. Open the wizard, select “Drop playbook,” and choose the desired file from `playbooks/`.
4. Follow the wizard prompts (scan, optimize, stage rollback).
5. When the wizard finishes, it keeps a log in `%localappdata%\redcoreECO\wizard.log`. Use that log when filing feedback or support tickets.

We also maintain `scripts/publish-playbook.sh` that streams the latest YAML to the wizard feed and tags the release. Use it whenever you revise the generated plan so the wizard always sees the newest version.
