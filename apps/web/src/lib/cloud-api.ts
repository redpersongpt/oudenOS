const PROD_CLOUD_API_BASE_URL = "https://api.redcoreos.net/v1";

export function getCloudApiBaseUrl(): string {
  const baseUrl =
    process.env.CLOUD_API_URL ??
    process.env.API_URL ??
    PROD_CLOUD_API_BASE_URL;

  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/v1`;
}

export async function callCloudApi<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const response = await fetch(`${getCloudApiBaseUrl()}${path}`, init);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error =
        (body as { error?: string; message?: string }).error ??
        (body as { error?: string; message?: string }).message ??
        `Cloud API request failed (${response.status})`;
      return { ok: false, status: response.status, error };
    }

    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: "Cloud API is unreachable" };
  }
}
