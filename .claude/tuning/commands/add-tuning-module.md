Add a new tuning module to redcore-Tuning.

Given a module name and category, scaffold the full implementation:

1. **Module definition** — Create `packages/tuning-modules/src/<category>/index.ts` (if not exists) or add to existing module file. Follow the pattern of existing modules.
2. **Schema types** — Add any new `TuningAction` variants or parameters to `packages/shared-schema/src/tuning.ts`.
3. **Compatibility** — Add Windows version compatibility predicates to `packages/shared-schema/src/compatibility.ts` if the module targets specific Windows versions.
4. **Rust executor** — Add the execution logic in `apps/service-core/src/executor.rs`. Every action must: create rollback entry, check compatibility, validate parameters.
5. **Agent skill** — Create `.agents/skills/<module-name>/SKILL.md` with the domain knowledge for this optimization category.
6. **Feature gate** — Determine if free or premium and add to `FEATURE_GATES`.

Run typecheck after implementation. Show the diff.
