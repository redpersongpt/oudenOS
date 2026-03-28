# Harvest Report: OneClick V8.3 — Complete User Experience Flow
Generated: 2026-03-27
Source: https://github.com/QuakedK/Oneclick
Script: Oneclick-V8.3.bat (5089 lines, 271KB)
Pages crawled: 18 (README, Changelog, Unsupported Features, 14 Help docs, main bat script)
Strategy: deep crawl + direct script analysis

---

## EXECUTIVE SUMMARY

OneClick is a Windows CMD batch script (~5000 lines). It runs in a terminal window. There is NO graphical UI. All interaction is text prompts in the Windows command console with ASCII art headers and ANSI color codes. The user types numbers or Y/N and presses Enter. Every single choice is sequential — one at a time — there is no parallel or wizard-style multi-step UI on a single screen.

---

## THE COMPLETE USER JOURNEY — STEP BY STEP

### PHASE 0: PRE-RUN REQUIREMENTS (Before launching)

The user must:
1. Have a fresh Windows 11 install (22H2–26H1 supported; W10 limited)
2. Have all drivers + apps already installed
3. Read the "Unsupported Features" list
4. Read the "Supported Windows Versions" list
5. Right-click the `.bat` file → "Run as administrator"

If NOT run as administrator: the script auto-detects this, prints a warning, and prompts to re-launch with admin rights.

---

### PHASE 1: AUTOMATIC SILENT CHECKS (User sees nothing / progress text)

These run without any prompts — the user just watches:

1. **Admin check** — If not admin, prompts to relaunch (one-time ask)
2. **ANSI color init** — Silent
3. **Log folder creation** — `C:\Oneclick Logs\` created silently
4. **Version check** — Compares current version to GitHub latest

---

### PHASE 2: FIRST DECISION POINT — Outdated Version (conditional)

Only shown if the script version is outdated.

```
╔════════════════════════════════════════╗
║ ⚠️ Outdated Oneclick Version Detected. ║
╚════════════════════════════════════════╝
❌ Oneclick X.X not detected!

[Choose an option]
1. Download the Latest Oneclick Version  (opens GitHub releases page)
2. Continue Anyway
3. Exit
Enter option number:
```
- Options 1/2/3. Invalid input loops back.
- Option 1 opens GitHub then loops back to this same screen.
- Option 2 continues to next phase.

---

### PHASE 3: WINDOWS VERSION CHECK (conditional branching, mostly silent)

- Detects build number from registry
- **Win 11 (22000–28000):** Silently adds GlobalTimerResolutionRequests registry key, proceeds
- **Unsupported version:** Shows a 3-option menu identical in structure to Phase 2:
  ```
  1. Github (opens Supported Versions doc)
  2. Continue Anyway
  3. Exit
  ```
- Win Server: detects and handles silently

---

### PHASE 4: VISUAL C++ CHECK (conditional, may be silent)

- Checks registry for VC++ 2015-2022 x64
- **If installed:** Silent, passes through
- **If NOT installed:** Downloads automatically and launches installer in passive mode, then shows "Press any key to continue"
- **If download fails:** 4-option menu:
  ```
  1. Retry
  2. Download Manually (opens Microsoft page)
  3. Continue Anyway
  4. Exit
  ```

---

### PHASE 5: UCPD CHECK (conditional)

User Choice Protection Driver — only shown if it's running (Windows 23H2/24H2 feature).

```
╔══════════════════════════════════════════════════════╗
║ ⚠️ User Choice Protection Driver (UCPD) is ENABLED.  ║
╚══════════════════════════════════════════════════════╝
• Some visual changes cannot be applied while (UCPD) is enabled.

→ Do you want to disable (UCPD) and restart?
Enter (Y/N):
```

- **Y:** Disables UCPD service + task, then RESTARTS THE PC. Oneclick sets itself to auto-run after restart (adds itself to the startup registry key), so it resumes automatically.
- **N:** Continues without disabling UCPD

---

### PHASE 6: TOOLS DOWNLOAD (automatic, no prompt)

Downloads `OneclickTools.zip` from GitHub silently. Extracts to `C:\Oneclick Tools\`. This is completely automatic — no prompt. If it fails, a 4-option error menu appears:
```
1. Retry
2. Download Manually (opens GitHub page)
3. Open Tools Help (opens GitHub docs)
4. Exit
```

---

### PHASE 7: BACKUP FOLDER CHECK (automatic)

Checks if `C:\Oneclick Backup\` already exists. If it does, it does NOT overwrite — it keeps the existing backup. Silent, no prompt.

---

### PHASE 8: WINDOWS DEFENDER CHECK (conditional)

Detects if WinDefend service is running.

- **If Defender is OFF:** Skips entirely to the start screen
- **If Defender is ON:**

```
╔═════════════════════════════════╗
║ ⚠️ Windows Defender is ENABLED. ║
╚═════════════════════════════════╝
• It's recommended you temporarily disable Windows Defender.

[Choose an option]
1. Disable  (disables Defender)
2. Keep Enabled
3. Learn More  (opens Windows Defender Options GitHub doc)
Enter option number:
```

**If user picks 1 (Disable):**
The script cannot disable Defender directly — it requires the user to manually turn off Real Time Protection and Tamper Protection first. It:
1. Opens the Windows Security app automatically
2. Shows step-by-step manual instructions on screen:
   ```
   📌 [Step 1] Please click Virus & Threat Protection.
   📌 [Step 2] Then click Manage Settings.
   📌 [Step 3] Now turn off Real Time Protection and Tamper Protection.
   → Press any key to continue once done...
   ```
3. Downloads `dControl.exe` automatically
4. Launches dControl with more manual instructions:
   ```
   📌 [Step 1] Please click disable Windows Defender.
   📌 [Step 2] Then click Menu.
   📌 [Step 3] Now click add to the Exclusion List.
   → Press any key once done...
   ```
5. Verifies dControl ran, then disables SecurityHealthService via NSudo

**If user picks 2 (Keep Enabled):** Silently disables only Defender's automatic sample submission telemetry, continues.

---

### PHASE 9: THE START SCREEN (purely cosmetic)

An animated rainbow ASCII art logo cycles through colors:
```
▒█████   ███▄    █ ▓█████  ... ONECLICK ...
        Version 8.3 - By Quaked
→ Press any key to continue . . .
```
The user presses any key to proceed.

---

### PHASE 10: RESTORE POINT — First major decision (Y/N)

```
[Highly Recommended]
→ Do you want to make a restore point?
Enter (Y/N):
```

- **Y:** Script enables System Protection, creates restore point named "Oneclick V8.3 Restore Point", proceeds to Registry Backup
- **Y but fails:** "Your System Protection or Restore Point FAILED — Do you still wish to continue? (LAST WARNING)" → Y/N again
- **N:** "Not Creating System Restore Point — Do you still wish to continue? (LAST WARNING)" → Y/N confirmation required

Key UX detail: If the user says N (no restore point), they get a SECOND warning screen before proceeding. This is the "last warning" pattern used throughout for dangerous skips.

---

### PHASE 11: REGISTRY BACKUP — Second major decision (Y/N)

```
[Highly Recommended]
→ Do you want to create a registry backup?
Enter (Y/N):
```

- **Y:** Exports all 5 registry hives (HKLM, HKCU, HKCR, HKU, HKCC) to `C:\Oneclick Backup\Registry\`
- **Y but fails:** Shows "LAST WARNING" Y/N to continue or exit
- **N:** Shows "LAST WARNING" Y/N confirmation before proceeding

---

### PHASE 12: FULLY AUTOMATIC SECTION — No user input required

From this point until "Search Removal Options", everything runs automatically. The user just watches progress text scroll by. This includes:

- System Visual Preferences (dark mode, animations, transparency, taskbar alignment, wallpaper)
- System Settings (misc Windows tweaks)
- Windows Update disabler (via NSudo)
- Telemetry removal
- Task Destroyer (deletes scheduled tasks via NSudo)
- OOshutup10 (runs with custom config via NSudo)
- Autologger Destroyer (disables ETW autologgers via NSudo)
- Windows Services disabling (100+ services set to disabled)
- Intel/AMD/HP/Razer/Logitech service auto-detection and disabling
- Windows Drivers disabling
- Graphics Preferences, priority, FSO registry tweaks
- Microsoft Apps removal (Edge, OneDrive, Xbox bloat, LockApp, SmartScreen, sync programs)
- Startup app disabling

This is a long section. No prompts. The user watches.

---

### PHASE 13: SEARCH REMOVAL OPTIONS — Decision point (1/2/3)

```
╔════════════════════════════╗
║ ✅ Search Removal Options. ║
╚════════════════════════════╝

[Choose an option]
1. Keep Search
2. Remove Search  (installs Open Shell as replacement)
3. More Info  (opens GitHub doc)
Enter option number:
```

- **Keep Search (1):** Goes directly to GPU Tweaks
- **Remove Search (2):** Deletes SearchHost.exe, StartMenuExperienceHost.exe, ShellExperienceHost.exe, taskhostw.exe. Then automatically downloads and silently installs Open Shell (start menu replacement). If Open Shell download fails: 3-option error menu (retry/manual/skip)
- **More Info (3):** Opens GitHub doc page, returns to this same menu

---

### PHASE 14: GPU TWEAKS — Decision point (1/2/3)

```
╔════════════════════════════════════════════════════╗
║              Please select your GPU.               ║
╚════════════════════════════════════════════════════╝

[Choose an option]
1. Nvidia
2. AMD
3. Skip
Enter option number:
```

**NVIDIA path:**
1. Downloads NVIDIA Control Panel from GitHub
2. Installs it automatically
3. Applies extensive Nvidia registry tweaks (credit: Nova OS/p467121)
4. Applies Nvidia Profile Inspector config (NovaOS.nip)
5. Adds Nvidia Container context menu toggle to right-click desktop
6. Note: DISABLES NVDisplay.ContainerLocalSystem and NvContainerLocalSystem — this breaks Nvidia Control Panel, Nvidia App, clipping/overlays. Re-enabling is documented as a known fix.

**AMD path:**
1. Applies AMD registry tweaks (credit: Nova OS/p467121)
2. Runs AMD.bat via NSudo (disables AMD Crash Defender, AMD External Events Utility, AUEPLauncher)

**Skip (3):** Goes to Latency Tweaks

---

### PHASE 15: FULLY AUTOMATIC SECTION #2

- Latency tweaks (registry)
- BCDEdit tweaks (platform clock, dynamic tick)
- Power tweaks (hibernation, idle settings)
- Kernel tweaks (heap, timer)

No user input required.

---

### PHASE 16: PRIORITY SEPARATION — Decision point (1-6)

```
╔══════════════════════════════════╗
║ ✅ Changing Priority Separation. ║
╚══════════════════════════════════╝
• Please choose a preset depending on your use case.

[Choose an option]
1. FPS - 42 Decimal - 2A Hexadecimal
2. Latency - 36 Decimal - 24 Hexadecimal
3. Balanced - 26 Decimal - 1A Hexadecimal
4. Custom Value.
5. Learn More.
6. Skip.
Enter option number:
```

- Options 1/2/3: Apply registry value immediately, proceed
- Option 4: Asks for custom decimal value
- Option 5: Opens GitHub Priority Separation Options doc, loops back
- Option 6: Skips

---

### PHASE 17: TIMER RESOLUTION — Decision point (1-6)

```
╔═════════════════════════════════╗
║ ✅ Setting Up Timer Resolution. ║
╚═════════════════════════════════╝
• Please choose a preset depending on your use case.

[Choose an option]
1. Timer Res 0.500ms
2. Timer Res 0.504ms
3. Timer Res 0.507ms
4. Custom Value.
5. Learn More.
6. Skip.
Enter option number:
```

Note: For Windows 10 users, a DPC Checker auto-startup step runs before this (automatically adds DPC Checker to startup registry, with a "press any key" pause to read the message).

- Options 1/2/3: Add `SetTimerResolution.exe` to startup registry with chosen value
- Option 4: Asks for 4-digit custom value (e.g., 5040)
- Option 5: Opens GitHub Timer Resolution Options doc
- Option 6: Deletes timer resolution folder, skips

---

### PHASE 18: POWER PLAN — Decision point (1-4)

```
╔══════════════════════════╗
║ ✅ Importing Power Plan. ║
╚══════════════════════════╝
• Please choose a plan depending on your use case.

[Choose an option]
1. Quaked Ultimate Performance.
2. Quaked Ultimate Performance Idle Off.
3. Learn More.
4. Skip.
Enter option number:
```

- Option 1: Imports `Quaked Ultimate Performance.pow` via powercfg
- Option 2: Imports `Quaked Ultimate Performance Idle Off.pow` (not recommended for poor cooling)
- Option 3: Opens GitHub Power Plan Options doc
- Option 4: Skips to Clean Up

After import:
- Detects the GUID automatically, activates the plan
- Opens `powercfg.cpl` (Power Options control panel) for visual confirmation
- "Press any key to continue"
- If import fails: Opens GitHub power plan help page, "press any key to continue"

---

### PHASE 19: CLEAN UP (automatic)

Runs silently:
- Deletes various temp folders (Temp, AppData temp, Discord cache, Spotify cache, Prefetch, Windows Update logs)
- Network cleanup (netsh, DNS flush, route print, etc.)

No user input required.

---

### PHASE 20: EXTRAS MENU — The End/Hub Screen

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║           [1] Additional Features     [2] Fixers                    ║
║           [3] Discord Server          [4] Restart                   ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
Enter option number:
```

This is the hub screen at the end of the main flow. The README says "restart when reaching the Extras section."

**Option 1 — Additional Features submenu:**
```
╔═════════════════════════════════════════════════════════════════════╗
║     [1] Process Destroyer           [2] Network Tweaks              ║
║     [3] Process Destroyer Extreme   [4] Disable Optional Features   ║
║     [5] Device Manager Tweaks       [6] Audio Bloat Remover         ║
║     [7] Return to Extras            [8] Restart                     ║
╚═════════════════════════════════════════════════════════════════════╝
```

**Option 2 — Fixers submenu:**
```
╔═════════════════════════════════════════════════════════════════════╗
║           [1] Wifi Fixer              [2] Epic Games Fixer          ║
║           [3] Rockstar Games Fixer    [4] Fixer Github              ║
║           [5] Return to Extras        [6] Restart                   ║
╚═════════════════════════════════════════════════════════════════════╝
```

**Option 3:** Opens Discord server link in browser
**Option 4:** Restarts PC

---

## OPTIONAL FEATURES — DEEP DIVE

### Process Destroyer (Additional Features → Option 1 or 3)

Shows a warning screen with specific requirements:
```
╔═══════════════════════════════╗
║ ⚠️ Process Destroyer Warning. ║
╚═══════════════════════════════╝
❌ Read the Process Destroyer Requirements!
1. Must have installed Windows with offline/local account
2. All drivers/apps must be installed first
3. Any failure will result in black screen at login

→ Do you still wish to continue? (LAST WARNING)
Enter (Y/N):
```
- **Y:** Runs the batch file via NSudo with TrustedInstaller privileges
- **N:** Returns to Additional Features

Process Destroyer Extreme (option 3) is a more aggressive variant.

### Network Tweaks (Additional Features → Option 2)

```
╔════════════════════════════╗
║ ⚠️ Network Tweaks Warning. ║
╚════════════════════════════╝
1. May negatively impact network speed or performance.
2. You may also lose Network Connection!

→ Do you still wish to continue? (LAST WARNING)
Enter (Y/N):
```
- **Y:** Detects network adapter path from registry, applies per-adapter tweaks (receive buffers, interrupt moderation, etc.), backs up original settings
- **N:** Returns to Additional Features

### Optional Features (Additional Features → Option 4)

NO WARNING PROMPT. Runs immediately on selection. Disables ~80+ Windows Optional Features (IIS, .NET 3.5, DirectPlay, Hyper-V, WSL, Media Player, PowerShell v2, printing, etc.) using one large PowerShell session. Shows completion then returns to Additional Features.

### Device Manager Tweaks (Additional Features → Option 5)

```
╔═══════════════════════════════════╗
║ ⚠️ Device Manager Tweaks Warning. ║
╚═══════════════════════════════════╝
1. May result in BSoDs or other unexpected issues.
2. Devices may behave differently on certain computers!

→ Do you still wish to continue? (LAST WARNING)
Enter (Y/N):
```
- **Y:** Uses PowerShell Get-PnpDevice to find and Disable-PnpDevice for ~48 specific device names (ACPI aggregators, timers, Bluetooth enumerators, WAN Miniports, Intel ME, etc.)
- **N:** Returns to Additional Features

### Audio Bloat Remover (Additional Features → Option 6)

```
╔═════════════════════════════════╗
║ ⚠️ Audio Bloat Remover Warning. ║
╚═════════════════════════════════╝
1. May result in Sound or Audio related issues.
2. You may also completely lose System Audio!

→ Do you still wish to continue? (LAST WARNING)
Enter (Y/N):
```
- **Y:** Runs Audio Bloat Remover batch via NSudo (removes Realtek, Sound Research, VisiSonics audio services + executables)
- **N:** Returns to Additional Features

### Wifi Fixer (Fixers → Option 1)

No warning, runs immediately. Re-enables 20+ network services and runs ipconfig commands. Returns to Fixers menu.

---

## GPU DETECTION SPECIFICS

GPU detection is NOT automatic despite changelog claiming it was added in V6.7. In V8.3, the user manually selects GPU (NVIDIA / AMD / Skip). The changelog suggests auto-detection was added in V6.7 but the V8.3 script shows a manual menu. One of these is true:
1. Auto-detection was reverted at some point
2. The menu is a fallback

The actual V8.3 script shows a 3-option manual selection: Nvidia / AMD / Skip.

---

## WHAT IS OPTIONAL VS MANDATORY

### MANDATORY (no choice, runs automatically):
- All 100+ Windows service disabling
- All registry telemetry tweaks
- Microsoft Edge deletion
- OneDrive removal
- Xbox bloat deletion
- LockApp deletion
- SmartScreen deletion
- UAC disabling
- IPv6 disabling
- Startup app disabling
- OOshutup10 (with custom config)
- Task Destroyer (all scheduled tasks deleted)
- Dark mode
- Taskbar alignment
- Numerous system visual tweaks
- GlobalTimerResolutionRequests key (on Win 11)
- BCD tweaks (platform clock, dynamic tick)

### OPTIONAL (user is asked):
- Restore point (Y/N, highly recommended)
- Registry backup (Y/N, highly recommended)
- Windows Defender disable (1/2/3)
- UCPD disable + restart (Y/N, conditional on Win 23H2/24H2)
- Search removal (1/2/3)
- GPU tweaks — which GPU / skip (1/2/3)
- Priority Separation value (1-6)
- Timer Resolution value (1-6)
- Power Plan selection (1-4)

### POST-RUN OPTIONAL (Extras menu):
- Process Destroyer (Y/N warning first)
- Network Tweaks (Y/N warning first)
- Device Manager Tweaks (Y/N warning first)
- Audio Bloat Remover (Y/N warning first)
- Optional Windows Features disable (NO warning — runs immediately)
- Wifi Fixer (no warning)
- Epic/Rockstar Games Fixers (no warning)

---

## PROMPT TYPE BREAKDOWN

| Type | Examples | Count |
|------|----------|-------|
| Y/N freetext | Restore point, registry backup, UCPD, Process Destroyer, Network Tweaks, Device Manager, Audio Bloat, Power Plan failure | ~12 |
| Numbered menu (1-3) | Outdated version, unsupported WinVer, Defender, Search removal, GPU, OpenShell fail | ~8 |
| Numbered menu (1-4) | VC++ fail, Tools fail, Power Plan | ~4 |
| Numbered menu (1-6) | Priority Separation, Timer Resolution | 2 |
| Numbered menu (1-8) | Additional Features | 1 |
| Freetext number | Custom priority value, custom timer value | 2 |
| Press any key | Post-install of VC++, Dcontrol steps, Power Plan confirmation | ~8 |

**Total user decisions in the main flow:** approximately 8–12 depending on system state (some are conditional).

---

## WHAT THE USER SEES — COMPLETE PROMPT SEQUENCE IN ORDER

For a fresh Win 11 22H2 system with Defender ON, no UCPD:

1. [CONDITIONAL] Outdated version screen (if running old version)
2. [AUTOMATIC] Tools downloading silently
3. [AUTOMATIC] Defender detected
4. **Defender: 1. Disable / 2. Keep / 3. Learn More**
5. [If Disable] Manual steps to turn off Real Time Protection (press any key)
6. [If Disable] Manual steps to use dControl (press any key)
7. [AUTOMATIC] Rainbow start screen — press any key to break
8. **Restore Point: Y/N** (+ confirmation if N)
9. **Registry Backup: Y/N** (+ confirmation if N)
10. [AUTOMATIC] Everything from visual prefs through Microsoft app removal (~15 min)
11. **Search Removal: 1/2/3**
12. [If remove search] OpenShell installs automatically (press any key)
13. **GPU: 1. Nvidia / 2. AMD / 3. Skip**
14. [AUTOMATIC] Latency/BCD/Power/Kernel tweaks
15. **Priority Separation: 1-6**
16. **Timer Resolution: 1-6**
17. **Power Plan: 1-4**
18. [If plan imported] Power Options window opens, press any key
19. [AUTOMATIC] Cleanup
20. **EXTRAS MENU: 1-4** (hub — user typically selects Restart here)

---

## OPEN SHELL (Profile Inspector / VC++ etc.)

### Open Shell
- Downloaded and installed automatically IF the user chose "Remove Search"
- Otherwise not installed
- Silent install: `OpenShellSetup_4_4_196.exe /qn ADDLOCAL=StartMenu`
- Config applied automatically: `StartMenu.exe -xml OpenShellTheme.xml`

### Nvidia Profile Inspector
- The NovaOS Nvidia profile (NovaOS.nip) is applied automatically in the Nvidia GPU tweaks flow
- Inspector itself is in the tools folder but not launched interactively

### Visual C++ Redistributable
- Auto-detects if installed
- If not: auto-downloads and installs silently (passive mode)
- No user choice — it just installs

### Process Destroyer
- Optional, user explicitly selects it from Additional Features menu
- Gets a "LAST WARNING" Y/N before running
- Requires offline/local account — documented requirement

---

## LOGGING

All user decisions are logged to: `C:\Oneclick Logs\Oneclick Log.txt`
Format: `[DATE TIME] Description: User Chose "Option X" - Description`

Additional logs:
- Xbox bloat deletion log
- Autologger disabled log
- Search removal log
- Network tweaks log
- Device manager found/disabled logs

---

## KEY QUIRKS / GOTCHAS FOR IMPLEMENTATION REFERENCE

1. **Defender must be manually disabled by user** — the script cannot do it programmatically. It walks the user through Windows Security UI steps before dControl runs.

2. **UCPD requires restart** — if UCPD is active (Win 23H2/24H2), the script restarts and resumes automatically via a startup key.

3. **Power Plan confirmation is visual** — after import, it opens powercfg.cpl so the user can visually confirm the plan was activated.

4. **Nvidia GPU breaks Nvidia Control Panel** — this is intentional. Two services are disabled. Re-enabling is a documented fix in the Fixers section.

5. **Wifi is broken after running** — the Wifi Fixer in the Fixers menu restores it.

6. **All optional features have "Learn More" links** — Defender, Search, Priority Sep, Timer Res, Power Plan all offer a "Learn More" option that opens the corresponding GitHub Help doc.

7. **Extras menu is the "end"** — the user is expected to restart from Extras. They're NOT forced to restart — they choose when.

8. **Wrong input always loops** — every prompt uses the same error-handling pattern: shows "Invalid choice, choose X-Y" in red, 2-second pause, loops back to same prompt.

9. **"LAST WARNING" pattern** — whenever a user says N to a safety step (restore point, registry backup) or Y to a dangerous optional (Process Destroyer, Network Tweaks, Device Manager, Audio Bloat), they get a second Y/N confirmation screen. This is consistent throughout.

10. **Tools folder is always re-downloaded** — V8.1 changed behavior so the tools folder is always downloaded fresh, even if it already exists. Old folder is deleted first.

---

## Sources

- https://github.com/QuakedK/Oneclick
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/README.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Changelog.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Unsupported%20Features.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Power%20Plan%20Options.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Timer%20Resolution%20Options.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Optional%20Features.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Network%20Tweaks.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Priority%20Separation%20Options.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Windows%20Defender%20Options.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Search%20Removal%20Options.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Oneclick%20Tools%20Help.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Oneclick%20Fixes.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Oneclick%20Recommendations.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Supported%20Windows%20Versions.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Device%20Manager%20Tweaks.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Audio%20Bloat%20Remover.md
- https://raw.githubusercontent.com/QuakedK/Oneclick/main/Help/Oneclick%20Revert.md
- https://github.com/QuakedK/Oneclick/releases/download/DebloatTool/Oneclick-V8.3.bat (direct script)
