// ─── Service API Client ─────────────────────────────────────────────────────
// Typed wrapper around the preload bridge to the Rust service.

import type { RedcoreAPI } from "../../preload/index";
import type { IpcMethods, IpcEvents } from "@redcore/shared-schema/ipc";

declare global {
  interface Window {
    redcore: RedcoreAPI;
  }
}

type MethodName = keyof IpcMethods;
type MethodParams<M extends MethodName> = IpcMethods[M]["params"];
type MethodResult<M extends MethodName> = IpcMethods[M]["result"];

export async function serviceCall<M extends MethodName>(
  method: M,
  params: MethodParams<M>,
): Promise<MethodResult<M>> {
  return window.redcore.service.call<MethodResult<M>>(method, params);
}

type EventName = keyof IpcEvents;
type EventData<E extends EventName> = IpcEvents[E];

export function onServiceEvent<E extends EventName>(
  event: E,
  callback: (data: EventData<E>) => void,
): () => void {
  return window.redcore.on(`service:${event}`, (data) => {
    callback(data as EventData<E>);
  });
}
