// ─── Admin Middleware ──────────────────────────────────────────────────────────
// Validates Bearer JWT and enforces role === "admin".
// Attaches adminId and adminEmail to the request for audit logging.

import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";
import { db, users } from "../db/index.js";
import { eq } from "drizzle-orm";

declare module "fastify" {
  interface FastifyRequest {
    adminId: string;
  }
}

/**
 * Requires a valid admin Bearer token.
 * Replies 401 for missing/invalid tokens, 403 for non-admin users.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Authorization header is required" });
  }

  const token = header.slice(7);
  let payload: Awaited<ReturnType<typeof verifyAccessToken>>;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ error: "Invalid or expired access token" });
  }

  if (payload.role !== "admin") {
    return reply.code(403).send({ error: "Admin access required" });
  }

  // Verify the admin account still exists and has not been soft-deleted
  const [admin] = await db
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!admin || admin.deletedAt) {
    return reply.code(401).send({ error: "Account not found or has been deleted" });
  }

  request.userId = payload.sub;
  request.userRole = "admin";
  request.adminId = payload.sub;
}
