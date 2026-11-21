# WinUtil Source Snapshot

`config/tweaks.json` is vendored from ChrisTitusTech/winutil and is used as the
source data for `scripts/build-os-source-catalog.mjs`.

- Source repository: https://github.com/ChrisTitusTech/winutil
- Source commit: `70c23c80641d7370532af2f619b2842658600842`
- Source commit date: 2026-11-18T16:39:31-06:00
- Source path: `config/tweaks.json`
- Snapshot SHA-256 (LF line endings, as stored upstream): `6efc9f3849ceb53a7b3586f0a96c11eb2de8a5bab99d53c04894168d2d54adf5`
- License: MIT, copied in `third_party/winutil/LICENSE` (unchanged upstream at this commit)

The snapshot is kept byte-identical to upstream with LF line endings; the
repository `.gitattributes` pins `third_party/winutil/config/tweaks.json` to
`text eol=lf` so the SHA-256 above verifies on any checkout.

The derived catalog is generated at `artifacts/os-source-catalog.json` and is not
committed. Regenerate it with:

```bash
pnpm build:os:sources
```
