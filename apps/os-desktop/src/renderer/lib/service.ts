
interface RedcoreAPI {
  service: {
    call: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
    status: () => Promise<{ running: boolean; mode: string }>;
  };
}

function getAPI(): RedcoreAPI | null {
  const win = window as unknown as { redcore?: RedcoreAPI };
  return win.redcore ?? null;
}

export async function serviceCall<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const api = getAPI();
  if (!api) {
    return { ok: false, error: "No API available" };
  }

  try {
    const result = await api.service.call<unknown>(method, params ?? {});

    const r = result as Record<string, unknown>;
    if (r?.__serviceUnavailable || r?.__serviceError) {
      return { ok: false, error: (r.error as string) || "Service unavailable" };
    }

    return { ok: true, data: result as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function isServiceRunning(): Promise<boolean> {
  const api = getAPI();
  if (!api) return false;
  try {
    const status = await api.service.status();
    return status.running;
  } catch {
    return false;
  }
}
