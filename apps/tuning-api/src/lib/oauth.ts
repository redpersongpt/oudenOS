// OAuth Token Verification
// Verifies id_tokens from Google and Apple using their public JWKS endpoints.
// Uses `jose` for standards-compliant JWKS + JWT verification.

import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function verifyGoogleToken(idToken: string): Promise<OAuthProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
    issuer: ["accounts.google.com", "https://accounts.google.com"],
  });

  const email = payload["email"] as string | undefined;
  const sub = payload["sub"] as string;
  const name = (payload["name"] as string | undefined) ?? email ?? sub;
  const picture = payload["picture"] as string | undefined;

  if (!email) throw new Error("Google token missing email claim");

  return { id: sub, email, name, avatarUrl: picture };
}

export async function verifyAppleToken(idToken: string): Promise<OAuthProfile> {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error("APPLE_CLIENT_ID not configured");

  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    audience: clientId,
    issuer: "https://appleid.apple.com",
  });

  const email = payload["email"] as string | undefined;
  const sub = payload["sub"] as string;

  if (!email) throw new Error("Apple token missing email claim");

  return { id: sub, email, name: email.split("@")[0] ?? email };
}
