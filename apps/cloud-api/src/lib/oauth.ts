// ─── OAuth ID Token Verification ─────────────────────────────────────────────
// Verifies Google and Apple id_tokens using their public JWKS endpoints.
// Uses `jose` for standards-compliant JWKS + JWT verification.

import { createRemoteJWKSet, jwtVerify } from "jose";

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const appleJwks = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export interface OAuthProfile {
  id: string;         // provider-scoped user ID (sub claim)
  email?: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

// ─── Google ───────────────────────────────────────────────────────────────────

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured");

  const { payload } = await jwtVerify(idToken, googleJwks, {
    audience: clientId,
    issuer: ["accounts.google.com", "https://accounts.google.com"],
  });

  const sub = payload["sub"] as string | undefined;
  const email = payload["email"] as string | undefined;
  const emailVerified = Boolean(payload["email_verified"]);
  const name = (payload["name"] as string | undefined) ?? email ?? sub ?? "";
  const picture = payload["picture"] as string | undefined;

  if (!sub || !email) throw new Error("Google id_token is missing sub or email claim");

  return { id: sub, email, name, avatarUrl: picture, emailVerified };
}

// ─── Apple ────────────────────────────────────────────────────────────────────

export async function verifyAppleIdToken(idToken: string): Promise<OAuthProfile> {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error("APPLE_CLIENT_ID is not configured");

  const { payload } = await jwtVerify(idToken, appleJwks, {
    audience: clientId,
    issuer: "https://appleid.apple.com",
  });

  const sub = payload["sub"] as string | undefined;
  const email = payload["email"] as string | undefined;
  // Apple may hide real email behind private relay; email_verified is always true
  // when Apple provides an email.
  const emailVerified = Boolean(payload["email_verified"] ?? true);

  if (!sub) throw new Error("Apple id_token is missing sub claim");

  const name = email?.split("@")[0] ?? sub;
  return { id: sub, email, name, emailVerified };
}
