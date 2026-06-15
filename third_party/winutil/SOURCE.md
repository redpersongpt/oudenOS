# WinUtil Source Snapshot

`config/tweaks.json` is vendored from ChrisTitusTech/winutil and is used as the
source data for `scripts/build-os-source-catalog.mjs`.

- Source repository: https://github.com/ChrisTitusTech/winutil
- Source commit: `87a5779f0b610743b090fd0d72fb0ab179b97101`
- Source path: `config/tweaks.json`
- Snapshot SHA-256: `e5813a04097a326cfa3d2bf9a1d48762e8c1a5e20e9b538e3b810b33b0553dba`
- License: MIT, copied in `third_party/winutil/LICENSE`

The derived catalog is generated at `artifacts/os-source-catalog.json` and is not
committed. Regenerate it with:

```bash
pnpm build:os:sources
```
