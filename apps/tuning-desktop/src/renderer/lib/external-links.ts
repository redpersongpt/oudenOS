export const TUNING_SITE_URL = "https://redcoreos.net/redcore-tuning";
export const PRICING_URL = "https://redcoreos.net/#pricing";
export const LOGIN_URL = "https://redcoreos.net/login";
export const REGISTER_URL = "https://redcoreos.net/register";
export const PRIVACY_URL = "https://redcoreos.net/privacy";
export const TERMS_URL = "https://redcoreos.net/terms";

export function openExternalUrl(url: string): void {
  if (typeof window !== "undefined" && window.redcore?.shell?.openExternal) {
    window.redcore.shell.openExternal(url);
    return;
  }
  // No fallback — window.open bypasses main-process https:// validation.
  // If the bridge is unavailable the call is a no-op.
  console.warn("[openExternalUrl] IPC bridge unavailable, cannot open:", url);
}
