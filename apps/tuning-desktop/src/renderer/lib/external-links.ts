export const TUNING_SITE_URL = "https://ouden.cc/redcore-tuning";
export const PRICING_URL = "https://ouden.cc/#pricing";
export const LOGIN_URL = "https://ouden.cc/login";
export const REGISTER_URL = "https://ouden.cc/register";
export const PRIVACY_URL = "https://ouden.cc/privacy";
export const TERMS_URL = "https://ouden.cc/terms";

export function openExternalUrl(url: string): void {
  if (typeof window !== "undefined" && window.redcore?.shell?.openExternal) {
    window.redcore.shell.openExternal(url);
    return;
  }
  // No fallback — window.open bypasses main-process https:// validation.
  // If the bridge is unavailable the call is a no-op.
  console.warn("[openExternalUrl] IPC bridge unavailable, cannot open:", url);
}
