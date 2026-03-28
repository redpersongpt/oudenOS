// ─── JWT Utilities (jose) ─────────────────────────────────────────────────────
// Access tokens:  HS256, 15-minute TTL — server-side only.
// Refresh tokens: random bytes (not JWT), SHA-256 hash stored in DB.
// License tokens: HS256 (default) or RS256 when RSA key pair is configured.
//                 RS256 enables offline verification in the desktop client.

import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
} from "jose";

// jose v6 uses CryptoKey/Uint8Array as key types
type KeyLike = Awaited<ReturnType<typeof importPKCS8>>;

const ISSUER = "redcore-cloud-api";
const AUDIENCE_ACCESS = "redcore-app";
const AUDIENCE_LICENSE = "redcore-license";

// ─── Key helpers ──────────────────────────────────────────────────────────────

function getHmacSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

let _licensePrivateKey: KeyLike | null = null;
let _licensePublicKey: KeyLike | null = null;
let _licenseAlg: "RS256" | "HS256" = "HS256";

async function getLicenseSigningKey(): Promise<{ key: KeyLike | Uint8Array; alg: "RS256" | "HS256" }> {
  if (_licensePrivateKey) return { key: _licensePrivateKey, alg: "RS256" };

  const privB64 = process.env.LICENSE_PRIVATE_KEY_BASE64;
  const pubB64 = process.env.LICENSE_PUBLIC_KEY_BASE64;

  if (privB64 && pubB64) {
    try {
      const privPem = Buffer.from(privB64, "base64").toString("utf-8");
      const pubPem = Buffer.from(pubB64, "base64").toString("utf-8");
      _licensePrivateKey = await importPKCS8(privPem, "RS256");
      _licensePublicKey = await importSPKI(pubPem, "RS256");
      _licenseAlg = "RS256";
      return { key: _licensePrivateKey, alg: "RS256" };
    } catch (err) {
      console.error("Failed to import RSA license keys — falling back to HS256:", err);
    }
  }

  return { key: getHmacSecret(), alg: "HS256" };
}

async function getLicenseVerifyKey(): Promise<{ key: KeyLike | Uint8Array; alg: "RS256" | "HS256" }> {
  // Force initialization
  await getLicenseSigningKey();

  if (_licenseAlg === "RS256" && _licensePublicKey) {
    return { key: _licensePublicKey, alg: "RS256" };
  }
  return { key: getHmacSecret(), alg: "HS256" };
}

// ─── Access Tokens ────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;   // userId
  role: "user" | "admin";
}

export async function signAccessToken(userId: string, role: "user" | "admin"): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_ACCESS)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getHmacSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getHmacSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE_ACCESS,
  });

  const sub = payload.sub;
  const role = payload["role"] as "user" | "admin" | undefined;

  if (!sub) throw new Error("Access token missing sub claim");
  if (role !== "user" && role !== "admin") throw new Error("Access token missing role claim");

  return { sub, role };
}

// ─── License Tokens ───────────────────────────────────────────────────────────

export interface LicenseTokenPayload {
  sub: string;             // userId
  tier: "free" | "premium" | "expert";
  machineId: string;       // machineActivation.id (UUID)
  machineFingerprint: string;
  issuedFor: string;       // userId repeated for clarity
}

export async function signLicenseToken(payload: LicenseTokenPayload): Promise<string> {
  const { key, alg } = await getLicenseSigningKey();
  return new SignJWT({
    tier: payload.tier,
    machineId: payload.machineId,
    machineFingerprint: payload.machineFingerprint,
    issuedFor: payload.issuedFor,
  })
    .setProtectedHeader({ alg })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_LICENSE)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key as KeyLike);
}

export async function verifyLicenseToken(token: string): Promise<LicenseTokenPayload> {
  const { key } = await getLicenseVerifyKey();
  const { payload } = await jwtVerify(token, key as KeyLike, {
    issuer: ISSUER,
    audience: AUDIENCE_LICENSE,
  });

  const sub = payload.sub;
  const tier = payload["tier"] as LicenseTokenPayload["tier"] | undefined;
  const machineId = payload["machineId"] as string | undefined;
  const machineFingerprint = payload["machineFingerprint"] as string | undefined;
  const issuedFor = payload["issuedFor"] as string | undefined;

  if (!sub || !tier || !machineId || !machineFingerprint || !issuedFor) {
    throw new Error("License token missing required claims");
  }

  return { sub, tier, machineId, machineFingerprint, issuedFor };
}

/**
 * Returns the PEM public key for offline license verification in the desktop client.
 * Returns null if RSA is not configured (HS256 mode — offline verification not possible).
 */
export async function getLicensePublicKeyPem(): Promise<string | null> {
  const pubB64 = process.env.LICENSE_PUBLIC_KEY_BASE64;
  if (!pubB64) return null;
  return Buffer.from(pubB64, "base64").toString("utf-8");
}
