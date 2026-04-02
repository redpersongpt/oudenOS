# Implementation Report: PC-Tuning Optimization Questions
Generated: 2026-04-01

## Task
Add 7 new optimization questions from PC-Tuning research into the redcore OS wizard question model. One key (disableNagle) already existed and was updated with richer technical details. Six new keys were added.

## Changes Made

### 1. decisions-store.ts - QuestionnaireAnswers interface + defaults
Added 6 new `boolean | null` keys:
- `disableMouseAcceleration`
- `disableStickyKeys`
- `disableFaultTolerantHeap`
- `disableMPOs`
- `disableLastAccessTime`
- `disableDevicePowerSaving`

### 2. wizard-question-model.ts - strategyQuestions array
- **Updated** existing `disableNagle` question (was "Packet Delay", now "Network Latency") with TcpAckFrequency/TCPNoDelay registry details and per-adapter note
- **Added** 6 new `makeBooleanQuestion()` entries at end of array:
  - `disableMouseAcceleration` (Gamepad2, "Mouse Precision", minPreset: "balanced")
  - `disableStickyKeys` (Wrench, "Sticky Keys", no visibility restriction)
  - `disableFaultTolerantHeap` (Cpu, "FTH", minPreset: "aggressive")
  - `disableMPOs` (Gamepad2, "Multi-Plane Overlays", minPreset: "aggressive")
  - `disableLastAccessTime` (HardDrive, "File Timestamps", minPreset: "balanced")
  - `disableDevicePowerSaving` (Battery, "Device Power Saving", minPreset: "balanced", excludeLaptop: true)

### 3. wizard-question-model.ts - QUESTION_BEHAVIORS record
Added 6 new `createBooleanBehavior()` entries with action IDs:
- `disableMouseAcceleration` -> `input.disable-mouse-acceleration`
- `disableStickyKeys` -> `input.disable-sticky-keys`, `input.disable-filter-keys`, `input.disable-toggle-keys`
- `disableFaultTolerantHeap` -> `perf.disable-fault-tolerant-heap`
- `disableMPOs` -> `gpu.disable-mpos`
- `disableLastAccessTime` -> `storage.disable-last-access-time`
- `disableDevicePowerSaving` -> `power.disable-device-power-saving`

## Test Results
- `npx tsc --noEmit` -> exit code 0, zero errors

## Files Modified
1. `/Users/redperson/redcoreECO/apps/os-desktop/src/renderer/stores/decisions-store.ts`
2. `/Users/redperson/redcoreECO/apps/os-desktop/src/renderer/lib/wizard-question-model.ts`

## Notes
- `disableNagle` already existed in both the interface and the question model. Updated the existing question with richer technical description rather than creating a duplicate.
- All new questions follow existing patterns (makeBooleanQuestion helper, visibility constraints, subtle Windows commentary).
- Action IDs in QUESTION_BEHAVIORS are placeholders that must match the actual playbook action definitions when those are implemented.
