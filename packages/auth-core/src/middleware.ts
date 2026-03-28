// ─── Auth Middleware ─────────────────────────────────────────────────────────
// Fastify preHandler for tuning-api and os-api.
// Validates Bearer token using shared auth-core.

import { verifyAccessToken } from "./tokens.js";

// ─── Fastify Types (minimal, avoids fastify dependency) ─────────────────────

interface FastifyRequest {
  headers: Record<string, string | string[] | undefined>;
  userId?: string;
  userRole?: string;
}

interface FastifyReply {
  code: (statusCode: number) => FastifyReply;
  send: (payload: unknown) => void;
}

// ─── requireAuth ────────────────────────────────────────────────────────────

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    reply.code(401).send({
      success: false,
      error: { code: "AUTH_001", message: "Missing authorization header" },
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    reply.code(401).send({
      success: false,
      error: { code: "AUTH_001", message: "Invalid authorization format" },
    });
    return;
  }

  try {
    const verified = await verifyAccessToken(parts[1]);
    request.userId = verified.userId;
    request.userRole = verified.role;
  } catch {
    reply.code(401).send({
      success: false,
      error: { code: "AUTH_003", message: "Invalid or expired token" },
    });
    return;
  }
}

// ─── requireAdmin ───────────────────────────────────────────────────────────

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.userRole !== "admin") {
    reply.code(403).send({
      success: false,
      error: { code: "ADMIN_001", message: "Admin access required" },
    });
    return;
  }
}
