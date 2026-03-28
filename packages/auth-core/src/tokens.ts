// ─── JWT Token Operations ────────────────────────────────────────────────────
// Shared across web, tuning-api, and os-api. Uses jose (modern JWT library).
// All services must set the same JWT_SECRET env var.

import { SignJWT, jwtVerify } from "jose";
import type {
  VerifiedAccessToken,
  VerifiedRefreshToken,
  DEFAULT_AUTH_CONFIG,
} from "./types.js";

const ISSUER = "redcore-platform";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

// ─── Sign ───────────────────────────────────────────────────────────────────

export async function signAccessToken(
  userId: string,
  role: string = "user",
): Promise<string> {
  return new SignJWT({ role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

// ─── Verify ─────────────────────────────────────────────────────────────────

export async function verifyAccessToken(
  token: string,
): Promise<VerifiedAccessToken> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
  });

  if (payload.type !== "access") {
    throw new Error("Token is not an access token");
  }

  if (!payload.sub) {
    throw new Error("Token missing subject");
  }

  return {
    userId: payload.sub,
    role: (payload.role as string) ?? "user",
  };
}

export async function verifyRefreshToken(
  token: string,
): Promise<VerifiedRefreshToken> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
  });

  if (payload.type !== "refresh") {
    throw new Error("Token is not a refresh token");
  }

  if (!payload.sub) {
    throw new Error("Token missing subject");
  }

  return { userId: payload.sub };
}
