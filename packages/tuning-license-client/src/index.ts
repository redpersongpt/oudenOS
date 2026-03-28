// ─── License Client ─────────────────────────────────────────────────────────
// Client-side license validation: fetch from cloud, validate offline,
// and maintain a 7-day encrypted grace period cache.
//
// Used by: Electron main process (Node.js context only — never import in renderer)

import type { LicenseState, SubscriptionTier } from "@redcore/shared-schema/license";
import { FEATURE_GATES } from "@redcore/shared-schema/license";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export { FEATURE_GATES } from "@redcore/shared-schema/license";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchLicenseOptions {
  apiBaseUrl: string;
  licenseKey: string;
  deviceFingerprint: string;
  cacheDir: string;
  /** Seconds between forced remote revalidation. Default: 86400 (24h) */
  revalidateAfterSecs?: number;
}

export interface LicenseCache {
  state: LicenseState;
  cachedAt: string;     // ISO timestamp
  expiresAt: string;    // ISO timestamp (cachedAt + offlineGraceDays)
  signature: string;    // HMAC-SHA256 of JSON(state+cachedAt) for tamper detection
}

const CACHE_FILE = "license-cache.enc";
export const GRACE_PERIOD_DAYS = 7;
const GRACE_DAYS = GRACE_PERIOD_DAYS;
const REVALIDATE_AFTER_SECS = 86400; // 24 hours

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch current license state.
 * 1. Try cloud validation if cache is stale or missing.
 * 2. Fall back to cached (encrypted) state within the 7-day grace window.
 * 3. Return free tier if grace period is exhausted.
 */
export async function fetchLicense(opts: FetchLicenseOptions): Promise<LicenseState> {
  const {
    apiBaseUrl,
    licenseKey,
    deviceFingerprint,
    cacheDir,
    revalidateAfterSecs = REVALIDATE_AFTER_SECS,
  } = opts;

  const cachePath = path.join(cacheDir, CACHE_FILE);
  const cacheKey = deriveCacheKey(deviceFingerprint);
  const cached = loadCache(cachePath, cacheKey);

  const needsRemote = !cached || isCacheStale(cached, revalidateAfterSecs);

  if (needsRemote) {
    try {
      const fresh = await validateRemote(apiBaseUrl, licenseKey, deviceFingerprint);
      const graceDays = fresh.tier === "premium" ? GRACE_DAYS : 0;
      const withGrace: LicenseState = {
        ...fresh,
        offlineGraceDays: graceDays,
        offlineDaysRemaining: graceDays,
        lastValidatedAt: new Date().toISOString(),
      };
      saveCache(cachePath, cacheKey, withGrace);
      return withGrace;
    } catch (err) {
      // Network failure — fall through to cached state
      if (cached) {
        return applyOfflineGrace(cached);
      }
      // No cache, no network — free tier
      return freeTierState();
    }
  }

  // Cache is fresh enough
  return applyOfflineGrace(cached!);
}

/**
 * Validate license purely from the encrypted local cache.
 * Used by the Rust service at startup (no network call).
 * Returns free tier if cache is missing, tampered, or grace expired.
 */
export function validateLicenseOffline(cacheDir: string, deviceFingerprint: string): LicenseState {
  const cachePath = path.join(cacheDir, CACHE_FILE);
  const cacheKey = deriveCacheKey(deviceFingerprint);
  const cached = loadCache(cachePath, cacheKey);

  if (!cached) return freeTierState();
  return applyOfflineGrace(cached);
}

export function isFeatureAvailable(tier: SubscriptionTier, feature: string): boolean {
  const requiredTier = FEATURE_GATES[feature];
  if (!requiredTier) return false;
  if (requiredTier === "free") return true;
  return tier === "premium" || tier === "expert";
}

export function isLicenseValid(state: LicenseState): boolean {
  if (state.status !== "active" && state.status !== "trialing") return false;
  if (state.tier === "free") return true;
  if (state.offlineDaysRemaining <= 0) return false;
  return true;
}

/** Compare tier rank: expert > premium > free */
export function isTierSufficient(current: SubscriptionTier, required: SubscriptionTier): boolean {
  const rank: Record<SubscriptionTier, number> = { free: 0, premium: 1, expert: 2 };
  return rank[current] >= rank[required];
}

/**
 * Check whether a named action is permitted for the given tier.
 * Uses FEATURE_GATES from shared-schema for tier requirements.
 */
export function canApplyAction(action: string, tier: SubscriptionTier): boolean {
  const requiredTier = FEATURE_GATES[action];
  if (!requiredTier) return false;
  return isTierSufficient(tier, requiredTier as SubscriptionTier);
}

/**
 * Encrypt and persist a LicenseState to disk.
 * Key is derived from the device fingerprint via PBKDF2.
 */
export function cacheLicense(
  cacheDir: string,
  license: LicenseState,
  deviceFingerprint: string,
): void {
  const cachePath = path.join(cacheDir, CACHE_FILE);
  const key = deriveCacheKey(deviceFingerprint);
  saveCache(cachePath, key, license);
}

/**
 * Load and decrypt the cached LicenseState from disk.
 * Returns null if the cache is missing, tampered, or grace period is expired.
 */
export function loadCachedLicense(
  cacheDir: string,
  deviceFingerprint: string,
): LicenseState | null {
  const cachePath = path.join(cacheDir, CACHE_FILE);
  const key = deriveCacheKey(deviceFingerprint);
  const cached = loadCache(cachePath, key);
  if (!cached) return null;
  return applyOfflineGrace(cached);
}

/**
 * Generate a stable device fingerprint from hardware identifiers.
 * Combines CPU info + hostname into a non-reversible SHA256 hash.
 * This runs in Node.js context only (main process).
 */
export function generateDeviceFingerprint(): string {
  // In production, combine: CPU model, motherboard UUID, disk serial
  // from os module + WMI (passed in from Rust service scan result).
  // For portability, fall back to hostname + platform hash.
  const { hostname, platform } = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const os = require("os") as typeof import("os");
      return { hostname: os.hostname(), platform: os.platform() };
    } catch {
      return { hostname: "unknown", platform: "win32" };
    }
  })();

  return crypto
    .createHash("sha256")
    .update(`redcore:${hostname}:${platform}`)
    .digest("hex")
    .slice(0, 40);
}

// ─── Cloud validation ─────────────────────────────────────────────────────────

interface CloudLicenseResponse {
  tier: string;
  status: string;
  expiresAt: string | null;
  deviceBound: boolean;
  deviceId: string | null;
  features: Array<{ feature: string; tier: string; enabled: boolean }>;
}

async function validateRemote(
  apiBaseUrl: string,
  licenseKey: string,
  deviceFingerprint: string,
): Promise<LicenseState> {
  const url = `${apiBaseUrl}/v1/license/validate`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, deviceFingerprint }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`License validation failed: ${res.status} ${JSON.stringify(body)}`);
    }

    const data = await res.json() as CloudLicenseResponse;

    return {
      tier: data.tier as SubscriptionTier,
      status: data.status as LicenseState["status"],
      expiresAt: data.expiresAt,
      deviceBound: data.deviceBound,
      deviceId: data.deviceId,
      lastValidatedAt: new Date().toISOString(),
      offlineGraceDays: GRACE_DAYS,
      offlineDaysRemaining: GRACE_DAYS,
      features: data.features as LicenseState["features"],
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function deriveCacheKey(deviceFingerprint: string): Buffer {
  // Derive AES-256 key from device fingerprint + app salt
  const salt = Buffer.from("redcore-license-cache-v1", "utf8");
  return crypto.pbkdf2Sync(deviceFingerprint, salt, 10000, 32, "sha256");
}

function saveCache(cachePath: string, key: Buffer, state: LicenseState): void {
  try {
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + GRACE_DAYS * 86400 * 1000,
    ).toISOString();

    const payload: Omit<LicenseCache, "signature"> = { state, cachedAt: now, expiresAt };
    const payloadStr = JSON.stringify(payload);

    // Sign before encrypting to detect tampering after decryption
    const signature = crypto
      .createHmac("sha256", key)
      .update(payloadStr)
      .digest("hex");

    const fullPayload = JSON.stringify({ ...payload, signature });

    // AES-256-GCM encryption
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(fullPayload, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // File format: [4 bytes iv-len][iv][16 bytes authTag][encrypted]
    const ivLen = Buffer.alloc(4);
    ivLen.writeUInt32LE(iv.length, 0);
    const blob = Buffer.concat([ivLen, iv, authTag, encrypted]);

    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, blob);
  } catch {
    // Cache write failure is non-fatal
  }
}

function loadCache(cachePath: string, key: Buffer): LicenseCache | null {
  try {
    const blob = fs.readFileSync(cachePath);
    if (blob.length < 4 + 12 + 16) return null;

    const ivLen = blob.readUInt32LE(0);
    const iv = blob.subarray(4, 4 + ivLen);
    const authTag = blob.subarray(4 + ivLen, 4 + ivLen + 16);
    const encrypted = blob.subarray(4 + ivLen + 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

    const parsed: LicenseCache = JSON.parse(decrypted);

    // Verify HMAC signature
    const { signature, ...rest } = parsed;
    const expected = crypto
      .createHmac("sha256", key)
      .update(JSON.stringify(rest))
      .digest("hex");

    if (signature !== expected) {
      // Cache tampered — discard
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isCacheStale(cache: LicenseCache, revalidateAfterSecs: number): boolean {
  const cachedAt = new Date(cache.cachedAt).getTime();
  return Date.now() - cachedAt > revalidateAfterSecs * 1000;
}

function applyOfflineGrace(cache: LicenseCache): LicenseState {
  const now = Date.now();
  const expiresAt = new Date(cache.expiresAt).getTime();
  const remaining = Math.max(0, Math.floor((expiresAt - now) / 86400 / 1000));

  if (remaining <= 0 && cache.state.tier === "premium") {
    // Grace period exhausted — downgrade to free
    return { ...freeTierState(), lastValidatedAt: cache.state.lastValidatedAt };
  }

  return {
    ...cache.state,
    offlineDaysRemaining: remaining,
    lastValidatedAt: cache.state.lastValidatedAt,
  };
}

function freeTierState(): LicenseState {
  return {
    tier: "free",
    status: "active",
    expiresAt: null,
    deviceBound: false,
    deviceId: null,
    lastValidatedAt: new Date().toISOString(),
    offlineGraceDays: GRACE_DAYS,
    offlineDaysRemaining: 0,
    features: Object.entries(FEATURE_GATES)
      .filter(([, tier]) => tier === "free")
      .map(([feature]) => ({ feature, tier: "free" as SubscriptionTier, enabled: true })),
  };
}
