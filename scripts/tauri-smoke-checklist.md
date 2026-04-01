# Tauri Migration — Manual Windows Smoke Test

Run on a real Windows 10/11 machine with admin rights.

## Prerequisites

```powershell
# 1. Install Rust (if not present)
winget install Rustlang.Rustup
rustup default stable

# 2. Install Node.js 22 + pnpm
winget install OpenJS.NodeJS.LTS
npm install -g pnpm

# 3. Clone and install
git clone https://github.com/redpersongpt/redcoreECO.git
cd redcoreECO
pnpm install

# 4. Build the Rust service (debug, faster)
cd services/os-service
cargo build
cd ../..

# 5. Build the React UI
cd apps/os-desktop
pnpm build:renderer
```

## Dev Mode Test (fastest)

Open two terminals:

```powershell
# Terminal 1: Vite dev server
cd apps/os-desktop
pnpm dev

# Terminal 2: Tauri shell
cd apps/os-desktop
cargo tauri dev
```

## Checklist

### Window Render
- [ ] Window opens (820x580, centered)
- [ ] Frameless — no Windows title bar
- [ ] Dark background (#1e1e22 or close)
- [ ] No white flash on startup
- [ ] Window title bar area shows "redcore · OS" text
- [ ] Minimize button works
- [ ] Close button works
- [ ] Window is resizable (drag edges)
- [ ] Window does NOT maximize (no maximize button)
- [ ] No "Tauri" or framework branding visible anywhere

### Wizard Navigation
- [ ] Welcome step loads
- [ ] "Get Started" button advances to Assessment
- [ ] Assessment runs hardware scan (or enters demo mode if service unavailable)
- [ ] Profile step shows detected machine type
- [ ] Strategy step shows questionnaire
- [ ] PlaybookReview step loads after answering questions

### PlaybookReview Step
- [ ] Phase sections are listed and expandable
- [ ] Action names and descriptions show
- [ ] Status badges visible (Included/Blocked/Optional/ExpertOnly)
- [ ] Action count matches expected (~179 for gaming_desktop balanced)

### Technical Details Toggle
- [ ] "Technical Details" button visible on actions
- [ ] Clicking expands to show registry paths, service names, packages
- [ ] Registry paths show hive + path + valueName + value
- [ ] Service changes show name → startupType
- [ ] Package names show AppX identifiers
- [ ] Collapse works correctly

### Risk Colors
- [ ] Risk dots visible next to action names
- [ ] Safe = green dot
- [ ] Low = yellow dot
- [ ] Medium = amber dot
- [ ] High = red dot (if visible for any action)

### Service Communication
- [ ] Assessment step successfully scans (not just demo mode)
- [ ] Playbook resolve returns real data (check action count > 0)
- [ ] If running as admin: admin indicator shows "elevated" or equivalent

### File Operations
- [ ] "Save Log" button on Report step produces a .txt file on Desktop
- [ ] "Save Report" button shows a save dialog
- [ ] Export creates a .apbx file
- [ ] .apbx file is a valid ZIP (rename to .zip and open)

### Service Status (if visible)
- [ ] Non-admin launch: service starts, reports non-admin
- [ ] Admin launch: service starts, reports admin
- [ ] Service failure: app enters demo mode gracefully

## Failure Criteria

Any of these means the test FAILS:
- Window doesn't open
- Immediate crash on startup
- React UI doesn't render (blank window)
- Service communication fails completely (no demo fallback)
- Buttons don't respond to clicks
- Navigation is broken (can't advance steps)
- Save/export crashes the app

## Build Installer Test

```powershell
# After dev mode passes:
cd apps/os-desktop

# Build renderer for production
pnpm build

# Build Tauri installer (requires service binary)
cargo tauri build --config src-tauri/tauri.conf.production.json
```

### Installer Checklist
- [ ] Build completes without error
- [ ] Installer .exe is produced in src-tauri/target/release/bundle/nsis/
- [ ] Installer runs and shows NSIS UI
- [ ] UAC prompt appears (perMachine install)
- [ ] Installation completes
- [ ] Desktop shortcut created
- [ ] Start Menu shortcut created
- [ ] Launching from shortcut opens the app
- [ ] App runs with elevation (if installed as admin)
- [ ] Uninstaller works (Settings > Apps > redcore OS > Uninstall)
