// Resolves the latest oudenOS Windows installer straight from GitHub Releases.
// Used by the site's one-click setup endpoint so the download button always
// points at the newest published installer (v1.0.2, v1.0.3, ...) without anyone
// having to update the site or visit the GitHub release page.

const REPO = "redpersongpt/oudenOS";
// The release workflow publishes the installer as oudenOS-setup-<version>.exe.
const ASSET_PATTERN = /^oudenOS-setup.*\.exe$/i;

export interface LatestInstaller {
  tag: string;
  version: string;
  assetName: string;
  /** Direct file URL on GitHub's asset CDN — a download, not the release page. */
  downloadUrl: string;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}
interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubAsset[];
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "oudenos-web",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional read-only token to avoid the 60 req/hr unauthenticated limit.
  // Never exposed to the client (server-only route).
  const token = process.env.GITHUB_RELEASES_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Resolve the latest non-draft, non-prerelease release and its Windows installer.
 * Cached for 5 minutes to stay well under GitHub rate limits. Returns null if
 * GitHub is unreachable or no matching installer asset is published yet.
 */
export async function resolveLatestInstaller(): Promise<LatestInstaller | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: authHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const release = (await res.json()) as GitHubRelease;
    if (!release || release.draft || release.prerelease) return null;

    const asset = (release.assets ?? []).find((a) => ASSET_PATTERN.test(a.name));
    if (!asset) return null;

    // browser_download_url is a direct file link (…/releases/download/<tag>/<asset>),
    // not the release page.
    if (!asset.browser_download_url.startsWith(`https://github.com/${REPO}/releases/download/`)) {
      return null;
    }

    const tag = release.tag_name;
    return {
      tag,
      version: tag.replace(/^v/, ""),
      assetName: asset.name,
      downloadUrl: asset.browser_download_url,
    };
  } catch {
    return null;
  }
}
