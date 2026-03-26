# Rust Service Rules

When modifying `apps/service-core/`:

- Use `thiserror` for typed domain errors, `anyhow` for infrastructure/glue code
- NEVER panic in IPC handler code paths — always return `Result`
- Every registry write must create a rollback entry in SQLite BEFORE the write
- Check Windows build number compatibility before applying any tweak — use compatibility predicates
- PowerShell execution must go through `powershell.rs` with script auditing — never build PS strings from user input
- All WMI queries must have timeout guards
- ETW tracing sessions must be cleaned up on service shutdown
- Use `tracing` macros (not `println!`) for all logging
- SQLite transactions for multi-step operations — never leave partial state
- License tier must be checked before executing premium-gated operations
