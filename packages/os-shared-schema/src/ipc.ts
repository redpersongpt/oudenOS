// ─── IPC Contract ────────────────────────────────────────────────────────────
// Source of truth for all communication between UI and Rust service.

import type { ProfileClassification, MachineProfile } from "./profiles.js";
import type { TransformPlan, TransformAction, OSHealthAssessment } from "./transformation.js";

export interface IpcMethods {
  // System assessment
  "assess.hardware": { params: {}; result: unknown };
  "assess.health": { params: {}; result: OSHealthAssessment };
  "assess.workIndicators": { params: {}; result: unknown };

  // Classification
  "classify.machine": { params: { assessmentId: string }; result: ProfileClassification };

  // Transformation planning
  "transform.plan": { params: { profile: MachineProfile; preset: string }; result: TransformPlan };
  "transform.getActions": { params: { category?: string }; result: TransformAction[] };
  "transform.preview": { params: { actionId: string }; result: TransformAction };

  // Execution
  "execute.apply": { params: { planId: string }; result: unknown };
  "execute.applyAction": { params: { actionId: string }; result: unknown };
  "execute.pause": { params: {}; result: void };
  "execute.resume": { params: {}; result: void };

  // Rollback
  "rollback.list": { params: {}; result: unknown };
  "rollback.restore": { params: { snapshotId: string }; result: unknown };
  "rollback.audit": { params: { limit: number }; result: unknown };

  // Journal
  "journal.state": { params: {}; result: unknown };
  "journal.resume": { params: {}; result: unknown };
  "journal.cancel": { params: {}; result: unknown };

  // App hub
  "apphub.catalog": { params: {}; result: unknown };
  "apphub.install": { params: { appId: string }; result: unknown };

  // System
  "system.status": { params: {}; result: { version: string; uptime: number } };
  "system.reboot": { params: { reason: string }; result: void };
}

// Only events that are ACTUALLY emitted
export interface IpcEvents {
  "execute.progress": { actionId: string; status: string; percent: number };
  "service.error": { code: string; message: string };
}
