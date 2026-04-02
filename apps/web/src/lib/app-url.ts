const PROD_APP_URL = "https://ouden.cc";

export function getAppUrl(fallbackOrigin?: string): string {
  const baseUrl =
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    fallbackOrigin ??
    PROD_APP_URL;

  return baseUrl.replace(/\/$/, "");
}
