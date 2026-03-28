// ─── Update Check Routes ───────────────────────────────────────────────────────
// GET /check             — check if a newer version is available (semver)
// GET /releases          — list recent releases (latest N per channel)
// GET /releases/:version — get metadata for a specific version
//
// Version metadata is stored in the app_releases table.
// Env vars LATEST_VERSION_STABLE / LATEST_VERSION_BETA provide a fast path
// that bypasses DB lookup for the common case.

import type { FastifyPluginAsync } from "fastify";
import semver from "semver";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db, appReleases } from "../db/index.js";
import { requireAdmin } from "../middleware/admin.js";

const channelSchema = z.enum(["stable", "beta", "nightly"]);

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const updateRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /check ────────────────────────────────────────────────────────────
  // Query params:
  //   version  — current client version, e.g. "1.2.3"
  //   channel  — "stable" | "beta" | "nightly" (default: "stable")
  //   os       — "windows" | "macos" | "linux" (informational, for future use)
  app.get<{ Querystring: { version?: string; channel?: string; os?: string } }>(
    "/check",
    async (request, reply) => {
      const rawVersion = request.query.version;
      const channelRaw = request.query.channel ?? "stable";
      const channel = channelSchema.safeParse(channelRaw).success
        ? (channelRaw as "stable" | "beta" | "nightly")
        : "stable";

      if (!rawVersion || !semver.valid(rawVersion)) {
        return reply.code(400).send({ error: "Invalid or missing ?version= parameter (must be semver)" });
      }

      const clientVersion = semver.coerce(rawVersion)!.version;

      // Fast path: env var overrides DB lookup
      const envKey = channel === "beta" ? "LATEST_VERSION_BETA" : "LATEST_VERSION_STABLE";
      const envLatest = process.env[envKey];
      const criticalFlag = process.env.CRITICAL_UPDATE === "1";

      if (envLatest && semver.valid(envLatest)) {
        const updateAvailable = semver.gt(envLatest, clientVersion);
        return reply.send({
          currentVersion: clientVersion,
          latestVersion: envLatest,
          channel,
          updateAvailable,
          criticalUpdate: updateAvailable && criticalFlag,
          downloadUrl: updateAvailable ? (process.env.LATEST_VERSION_DOWNLOAD_URL ?? null) : null,
          changelog: null,
          checkAgainAfterSeconds: 3600,
        });
      }

      // DB lookup
      const [latest] = await db
        .select()
        .from(appReleases)
        .where(eq(appReleases.channel, channel))
        .orderBy(desc(appReleases.publishedAt))
        .limit(1);

      if (!latest) {
        return reply.send({
          currentVersion: clientVersion,
          latestVersion: clientVersion,
          channel,
          updateAvailable: false,
          criticalUpdate: false,
          downloadUrl: null,
          changelog: null,
          checkAgainAfterSeconds: 3600,
        });
      }

      const updateAvailable = semver.gt(latest.version, clientVersion);

      // Check if a minimum required version forces an upgrade
      const forcedUpgrade =
        latest.minRequiredVersion != null &&
        semver.valid(latest.minRequiredVersion) != null &&
        semver.lt(clientVersion, latest.minRequiredVersion!);

      return reply.send({
        currentVersion: clientVersion,
        latestVersion: latest.version,
        channel,
        updateAvailable,
        criticalUpdate: updateAvailable && (latest.criticalUpdate || forcedUpgrade),
        forcedUpgrade,
        downloadUrl: updateAvailable ? latest.downloadUrl : null,
        sha256: updateAvailable ? latest.sha256 : null,
        size: updateAvailable ? latest.size : null,
        changelog: updateAvailable ? latest.changelogMd : null,
        publishedAt: latest.publishedAt,
        checkAgainAfterSeconds: 3600,
      });
    },
  );

  // ── GET /releases ─────────────────────────────────────────────────────────
  app.get<{ Querystring: { channel?: string; limit?: string } }>(
    "/releases",
    async (request, reply) => {
      const channelRaw = request.query.channel ?? "stable";
      const channel = channelSchema.safeParse(channelRaw).success
        ? (channelRaw as "stable" | "beta" | "nightly")
        : "stable";
      const limit = Math.min(20, Math.max(1, parseInt(request.query.limit ?? "10", 10)));

      const releases = await db
        .select({
          version: appReleases.version,
          channel: appReleases.channel,
          criticalUpdate: appReleases.criticalUpdate,
          size: appReleases.size,
          publishedAt: appReleases.publishedAt,
        })
        .from(appReleases)
        .where(eq(appReleases.channel, channel))
        .orderBy(desc(appReleases.publishedAt))
        .limit(limit);

      return reply.send({ releases, channel });
    },
  );

  // ── GET /releases/:version ────────────────────────────────────────────────
  app.get<{ Params: { version: string } }>(
    "/releases/:version",
    async (request, reply) => {
      const { version } = request.params;
      if (!semver.valid(version)) {
        return reply.code(400).send({ error: "Invalid version format" });
      }

      const [release] = await db
        .select()
        .from(appReleases)
        .where(eq(appReleases.version, semver.coerce(version)!.version))
        .limit(1);

      if (!release) {
        return reply.code(404).send({ error: "Release not found" });
      }

      return reply.send({ release });
    },
  );

  // ── Admin: POST /releases — publish a new release ─────────────────────────
  const publishSchema = z.object({
    version: z.string().refine((v) => semver.valid(v) !== null, "Must be valid semver"),
    channel: channelSchema.default("stable"),
    downloadUrl: z.string().url(),
    sha256: z.string().length(64),
    size: z.number().int().positive().optional(),
    changelogMd: z.string().max(10_000).optional(),
    criticalUpdate: z.boolean().default(false),
    minRequiredVersion: z.string().optional().refine(
      (v) => !v || semver.valid(v) !== null,
      "Must be valid semver if provided",
    ),
  });

  app.post("/releases", { preHandler: requireAdmin }, async (request, reply) => {
    const parse = publishSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }

    const data = parse.data;
    const version = semver.coerce(data.version)!.version;

    const [existing] = await db
      .select({ id: appReleases.id })
      .from(appReleases)
      .where(eq(appReleases.version, version))
      .limit(1);

    if (existing) {
      return reply.code(409).send({ error: `Release ${version} already exists` });
    }

    const [release] = await db
      .insert(appReleases)
      .values({
        version,
        channel: data.channel,
        downloadUrl: data.downloadUrl,
        sha256: data.sha256,
        size: data.size ?? null,
        changelogMd: data.changelogMd ?? null,
        criticalUpdate: data.criticalUpdate,
        minRequiredVersion: data.minRequiredVersion ?? null,
      })
      .returning();

    return reply.code(201).send({ release });
  });
};
