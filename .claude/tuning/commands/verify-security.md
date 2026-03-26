Run a focused security audit on the redcore-Tuning codebase.

Check these categories:

**Electron Security**
- contextIsolation, sandbox, nodeIntegration settings
- CSP headers in main process
- IPC channel validation (no arbitrary forwarding)
- Preload API surface (only expected methods exposed)
- No shell.openExternal with unvalidated URLs

**Rust Service Security**
- No unsafe blocks without justification
- No panics in IPC handlers (all return Result)
- PowerShell execution properly sandboxed
- Registry writes always have rollback entries
- No user input used to build PS strings or SQL queries

**License Enforcement**
- Premium features gated in BOTH service and UI
- No bypass paths in renderer code
- Offline grace period properly enforced
- Device binding validation

**Data Safety**
- SQLite transactions for multi-step operations
- No partial state on failure
- Audit log for all system modifications

Output findings as: CRITICAL / WARNING / INFO with file:line references and remediation.
