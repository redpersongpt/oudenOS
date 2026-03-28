// ─── Auth Middleware ───────────────────────────────────────────────────────────
// Validates Bearer JWT access tokens using jose.
// Attaches userId and role to the request object.

import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";
import { eq } from "drizzle-orm";
import { db, users } from "../db/index.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    userRole: "user" | "admin";
  }
}

/**
 * Requires a valid Bearer access token.
 * Replies 401 if missing or invalid.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Authorization header is required" });
  }

  const token = header.slice(7);
  try {
    const payload = await verifyAccessToken(token);

    // Reject tokens for soft-deleted accounts
    const [user] = await db
      .select({ deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.deletedAt) {
      return reply.code(401).send({ error: "Account not found or has been deleted" });
    }

    request.userId = payload.sub;
    request.userRole = payload.role;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired access token" });
  }
}

/**
 * Validates Bearer token if present, but does not fail if absent.
 * Useful for endpoints that serve both authenticated and guest users.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return;

  const token = header.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    request.userId = payload.sub;
    request.userRole = payload.role;
  } catch {
    // Silently ignore — endpoint handles the unauthenticated case
  }
}
