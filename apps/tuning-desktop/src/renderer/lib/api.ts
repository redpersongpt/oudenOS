// Service API Client
// Typed wrapper around the preload bridge to the Rust service.

import type { OudenAPI } from "../../preload/index";
import type { IpcMethods, IpcEvents } from "@oudenos/tuning-shared-schema/ipc";

declare global {
  interface Window {
    oudenos: OudenAPI;
  }
}

type MethodName = keyof IpcMethods;
type MethodParams<M extends MethodName> = IpcMethods[M]["params"];
type MethodResult<M extends MethodName> = IpcMethods[M]["result"];

export async function serviceCall<M extends MethodName>(
  method: M,
  params: MethodParams<M>,
): Promise<MethodResult<M>> {
  return window.oudenos.service.call<MethodResult<M>>(method, params);
}

type EventName = keyof IpcEvents;
type EventData<E extends EventName> = IpcEvents[E];

export function onServiceEvent<E extends EventName>(
  event: E,
  callback: (data: EventData<E>) => void,
): () => void {
  return window.oudenos.on(`service:${event}`, (data) => {
    callback(data as EventData<E>);
  });
}
