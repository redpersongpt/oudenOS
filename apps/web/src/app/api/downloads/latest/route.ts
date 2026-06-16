import { NextResponse } from "next/server";
import { resolveLatestInstaller } from "@/lib/github-release";

// One-click setup: resolves the latest oudenOS installer from GitHub Releases
// and redirects the browser straight to the file. The user stays in the site
// flow and never lands on the GitHub release page. If the release can't be
// resolved, fall back to the on-site downloads page (which shows a clear
// "temporarily unavailable" state) instead of a dead link.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function temporaryRedirect(url: string | URL) {
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const installer = await resolveLatestInstaller();
  if (installer) {
    return temporaryRedirect(installer.downloadUrl);
  }
  const fallback = new URL("/downloads?status=unavailable", request.url);
  return temporaryRedirect(fallback);
}
