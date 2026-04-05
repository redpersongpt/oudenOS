import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Version comparison
// ---------------------------------------------------------------------------

function parseVersion(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function isOlderThan(current: string, latest: string): boolean {
  const [cMajor, cMinor, cPatch] = parseVersion(current);
  const [lMajor, lMinor, lPatch] = parseVersion(latest);

  if (cMajor !== lMajor) return cMajor < lMajor;
  if (cMinor !== lMinor) return cMinor < lMinor;
  return cPatch < lPatch;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const checkQuerySchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in X.Y.Z format'),
  platform: z.string().default('win32'),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function updateRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /check
  // -----------------------------------------------------------------------
  app.get('/check', async (request, reply) => {
    const parsed = checkQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { version, platform } = parsed.data;

    // Latest version from env or default
    const latestVersion = process.env.LATEST_APP_VERSION ?? '0.1.1';
    const downloadBaseUrl =
      process.env.UPDATE_DOWNLOAD_URL ?? 'https://releases.redcore-os.com';
    const isCritical = process.env.CRITICAL_UPDATE === 'true';
    const releaseNotes = process.env.RELEASE_NOTES ?? '';
    const publishedAt = process.env.RELEASE_PUBLISHED_AT ?? new Date().toISOString();

    const hasUpdate = isOlderThan(version, latestVersion);

    return reply.send({
      success: true,
      data: {
        hasUpdate,
        latestVersion,
        downloadUrl: hasUpdate
          ? `${downloadBaseUrl}/redcore-os-${latestVersion}-${platform}.exe`
          : null,
        releaseNotes: hasUpdate ? releaseNotes : null,
        isCritical: hasUpdate ? isCritical : false,
        publishedAt: hasUpdate ? publishedAt : null,
      },
    });
  });
}
