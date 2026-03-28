// ─── Tuning Module Registry ─────────────────────────────────────────────────
// Each module defines tuning actions for a specific domain.
// Actions are consumed by the Rust planner/executor via JSON serialization.

export { cpuActions } from "./cpu/index.js";
export { gpuActions } from "./gpu/index.js";
export { memoryActions } from "./memory/index.js";
export { storageActions } from "./storage/index.js";
export { networkActions } from "./network/index.js";
export { powerActions } from "./power/index.js";
export { privacyActions } from "./privacy/index.js";
export { startupActions } from "./startup/index.js";
export { displayActions } from "./display/index.js";
export { audioActions } from "./audio/index.js";
export { securityActions } from "./security/index.js";
export { servicesActions } from "./services/index.js";
export { systemControlsActions } from "./system-controls/index.js";
export { schedulerActions } from "./scheduler/index.js";
export { gamingActions } from "./gaming/index.js";
export { aiActions } from "./ai/index.js";

export type { TuningActionDefinition } from "./types.js";
