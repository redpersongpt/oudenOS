export const REDCORE_OS_DOWNLOAD = {
  path: "/downloads/os/redcore-os-setup.exe",
  absoluteUrl: "https://redcoreos.net/downloads/os/redcore-os-setup.exe",
  filename: "redcore-os-setup.exe",
  checksum: null,
  marketingSummary: "Download the latest redcore OS build. Free, no account required.",
  executableSummary: "Download redcore OS for free. Windows 10/11 x64 installer.",
} as const;

export interface RedcoreOsLatestManifest {
  version?: string;
  versionTag?: string;
  commit?: string;
  builtAt?: string;
  sizeBytes?: number;
  sha256?: string;
  url?: string;
  releaseUrl?: string;
}

export async function getLatestRedcoreOsDownloadManifest(): Promise<RedcoreOsLatestManifest | null> {
  try {
    const response = await fetch("https://redcoreos.net/downloads/os/latest.json", {
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as RedcoreOsLatestManifest;
  } catch {
    return null;
  }
}
