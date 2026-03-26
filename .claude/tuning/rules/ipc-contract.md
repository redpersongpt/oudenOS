# IPC Contract Rules

The IPC contract in `packages/shared-schema/src/ipc.ts` is the source of truth for all communication between UI and Rust service.

When adding a new IPC method:
1. Add the method signature to `IpcMethods` in `shared-schema/src/ipc.ts`
2. Add any new types to the appropriate schema file in `shared-schema/src/`
3. Add the handler in `service-core/src/ipc.rs`
4. Add the preload bridge if needed in `desktop/src/preload/index.ts`
5. Feature-gate premium methods in both service and UI

When adding a new push event:
1. Add to `IpcEvents` in `shared-schema/src/ipc.ts`
2. Emit from the Rust service via the IPC event channel
3. Subscribe in the renderer via `window.redcore.on(channel, callback)`

NEVER add IPC methods without corresponding types. The contract must be type-safe end-to-end.
