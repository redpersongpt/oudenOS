// ─── Download Truth ─────────────────────────────────────────────────────────
// Single canonical source of truth for release artifact metadata.
// All download buttons on the site must use these functions.
// Never hardcode version strings or download URLs in pages.

const OS_LATEST_URL = "https://redcoreos.net/downloads/os/latest.json";
const OS_FALLBACK_URL = "https://redcoreos.net/downloads/os/redcore-os-setup.exe";

export interface ReleaseManifest {
  product: string;
  channel: string;
  version: string;
  versionTag: string;
  commit: string;
  builtAt: string;
  filename: string;
  releaseFilename: string;
  sizeBytes: number;
  sha256: string;
  url: string;
  releaseUrl: string;
}

export interface DownloadState {
  /** Whether the manifest was successfully fetched and validated */
  available: boolean;
  /** The download URL — only set if manifest is valid */
  url: string | null;
  /** Display version label */
  version: string | null;
  /** Version tag for display */
  versionTag: string | null;
  /** File size in bytes */
  sizeBytes: number | null;
  /** SHA-256 checksum */
  sha256: string | null;
  /** Build timestamp */
  builtAt: string | null;
  /** Short commit hash */
  commit: string | null;
  /** Why the download is unavailable, if applicable */
  unavailableReason: string | null;
  /** The full validated manifest, if available */
  manifest: ReleaseManifest | null;
}

function validateManifest(data: unknown): ReleaseManifest | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  // Required fields
  if (typeof d.url !== "string" || d.url.length === 0) return null;
  if (typeof d.version !== "string" || d.version.length === 0) return null;
  if (typeof d.sha256 !== "string" || d.sha256.length < 32) return null;
  if (typeof d.sizeBytes !== "number" || d.sizeBytes <= 0) return null;

  return {
    product: typeof d.product === "string" ? d.product : "redcore-os",
    channel: typeof d.channel === "string" ? d.channel : "latest",
    version: d.version as string,
    versionTag: typeof d.versionTag === "string" ? d.versionTag : `v${d.version}`,
    commit: typeof d.commit === "string" ? d.commit : "",
    builtAt: typeof d.builtAt === "string" ? d.builtAt : "",
    filename: typeof d.filename === "string" ? d.filename : "redcore-os-setup.exe",
    releaseFilename: typeof d.releaseFilename === "string" ? d.releaseFilename : "",
    sizeBytes: d.sizeBytes as number,
    sha256: d.sha256 as string,
    url: d.url as string,
    releaseUrl: typeof d.releaseUrl === "string" ? d.releaseUrl : d.url as string,
  };
}

/**
 * Fetch and validate the latest OS release manifest.
 * Returns a structured DownloadState that tells the UI exactly what to render.
 * Never silently falls back to a potentially stale URL.
 */
export async function getRedcoreOsDownloadState(): Promise<DownloadState> {
  try {
    const response = await fetch(OS_LATEST_URL, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return {
        available: false,
        url: null,
        version: null,
        versionTag: null,
        sizeBytes: null,
        sha256: null,
        builtAt: null,
        commit: null,
        unavailableReason: `Release metadata returned ${response.status}`,
        manifest: null,
      };
    }

    const raw = await response.json();
    const manifest = validateManifest(raw);

    if (!manifest) {
      return {
        available: false,
        url: null,
        version: null,
        versionTag: null,
        sizeBytes: null,
        sha256: null,
        builtAt: null,
        commit: null,
        unavailableReason: "Release metadata is invalid or incomplete",
        manifest: null,
      };
    }

    return {
      available: true,
      url: manifest.url,
      version: manifest.version,
      versionTag: manifest.versionTag,
      sizeBytes: manifest.sizeBytes,
      sha256: manifest.sha256,
      builtAt: manifest.builtAt,
      commit: manifest.commit,
      unavailableReason: null,
      manifest,
    };
  } catch {
    return {
      available: false,
      url: null,
      version: null,
      versionTag: null,
      sizeBytes: null,
      sha256: null,
      builtAt: null,
      commit: null,
      unavailableReason: "Could not reach release metadata server",
      manifest: null,
    };
  }
}

/** Format bytes as human-readable size */
export function formatDownloadSize(sizeBytes: number | null): string | null {
  if (!sizeBytes || sizeBytes <= 0) return null;
  const mb = sizeBytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// ─── Legacy exports (kept for backward compat during migration) ─────────────
// Pages should migrate to getRedcoreOsDownloadState() instead.

export const REDCORE_OS_DOWNLOAD = {
  path: "/downloads/os/redcore-os-setup.exe",
  absoluteUrl: OS_FALLBACK_URL,
  filename: "redcore-os-setup.exe",
  checksum: null,
  marketingSummary: "Download the latest redcore OS build. Free, no account required.",
  executableSummary: "Download redcore OS for free. Windows 10/11 x64 installer.",
} as const;

export async function getLatestRedcoreOsDownloadManifest(): Promise<ReleaseManifest | null> {
  const state = await getRedcoreOsDownloadState();
  return state.manifest;
}

export async function getLatestRedcoreOsDownloadUrl(): Promise<string> {
  const state = await getRedcoreOsDownloadState();
  return state.url ?? OS_FALLBACK_URL;
}
