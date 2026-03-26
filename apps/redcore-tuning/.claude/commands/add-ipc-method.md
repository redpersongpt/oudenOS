Add a new IPC method to the redcore-Tuning platform.

Given a method name and description, implement the full vertical slice:

1. **Schema** — Add the method signature to `IpcMethods` in `packages/shared-schema/src/ipc.ts`. Create any new types needed.
2. **Rust handler** — Add the handler in `apps/service-core/src/ipc.rs`. Use the appropriate module (scanner, executor, planner, etc.) for the implementation.
3. **Preload bridge** — If the method needs a new preload API shape, update `apps/desktop/src/preload/index.ts`.
4. **Feature gate** — If this is a premium feature, add the gate to `FEATURE_GATES` in `packages/shared-schema/src/license.ts` and check it in both the Rust handler and the UI.

After implementation, run `pnpm typecheck` to verify type safety across the monorepo.

Show me the full diff before committing.
