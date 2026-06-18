# In-app updater (Tauri v2)

oudenOS ships a full in-app auto-updater: **Settings → Update** checks the
latest GitHub release, and "Update now" downloads + verifies + installs it, then
relaunches. Updates are cryptographically signed — the app refuses any update
that isn't signed by our key.

## How it's wired

- **Plugins:** `tauri-plugin-updater` + `tauri-plugin-process` (Rust, registered
  in `src-tauri/src/lib.rs`; permissions in `capabilities/default.json`).
- **Runtime config** (`src-tauri/tauri.conf.json` → `plugins.updater`):
  - `endpoints`: `https://github.com/redpersongpt/oudenOS/releases/latest/download/latest.json`
  - `pubkey`: the **public** half of the updater signing key (safe to commit).
- **Build:** `createUpdaterArtifacts: true` lives only in
  `tauri.conf.production.json` (the Windows release build), so dev and the macOS
  demo build don't require a signing key.
- **Release CI** (`.github/workflows/release.yml`): the Windows build signs the
  installer, then a step writes `latest.json` (version + signature + download
  URL) and uploads it to the release alongside `oudenOS-setup-<version>.exe`.
- **Renderer:** `platform().updater.check()` / `.downloadAndInstall()` in
  `lib/platform-tauri.ts`, surfaced by `components/settings/SettingsPanel.tsx`.
  On the macOS demo (no Windows update feed) it degrades quietly to "up to date".

## One-time setup you must do — add the signing secret

The signing **private key** was generated locally to `~/oudenos-updater.key`
(it is intentionally NOT in the repo — only the public key is committed). Add it
to the repo's GitHub Actions secrets so the release build can sign:

1. Print the key: `cat ~/oudenos-updater.key`
2. Repo → Settings → Secrets and variables → Actions → New repository secret:
   - `TAURI_SIGNING_PRIVATE_KEY` = the full contents of that file
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = empty (the key was generated without
     a password)
3. Keep `~/oudenos-updater.key` backed up somewhere safe. **If you lose it you
   can't sign updates** and existing installs won't be able to auto-update to a
   key you replace it with.

Until that secret exists, the Windows release job fails fast with a clear
message (it can't produce a signed build) — that's intentional, not a silent
break.
