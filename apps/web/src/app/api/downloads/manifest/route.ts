import { NextResponse } from "next/server";
import { resolveLatestInstaller } from "@/lib/github-release";

// Lightweight metadata for the latest installer. The download itself always
// goes through /api/downloads/latest so callers never need a hardcoded version.
export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  const installer = await resolveLatestInstaller();
  if (!installer) {
    return NextResponse.json(
      { available: false, source: "github-release" },
      { status: 503 },
    );
  }
  return NextResponse.json({
    available: true,
    version: installer.version,
    assetName: installer.assetName,
    downloadUrl: "/api/downloads/latest",
    source: "github-release",
  });
}
