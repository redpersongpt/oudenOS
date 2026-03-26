// ─── Admin Middleware ─────────────────────────────────────────────────────────
// Validates that the request is from an authenticated admin.
// Admin role is encoded in the JWT claims as `role: "admin"`.

import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

export interface AdminJwtPayload {
  sub: string;       // user ID
  email: string;
  role: "admin" | "user";
  iat: number;
  exp: number;
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing authorization header" });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    request.log.error("JWT_SECRET not configured");
    return reply.code(500).send({ error: "Server misconfiguration" });
  }

  let payload: AdminJwtPayload;
  try {
    payload = jwt.verify(token, secret) as AdminJwtPayload;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }

  if (payload.role !== "admin") {
    return reply.code(403).send({ error: "Admin access required" });
  }

  // Attach caller info for audit logging
  (request as unknown as Record<string, unknown>).adminId = payload.sub;
  (request as unknown as Record<string, unknown>).adminEmail = payload.email;
}

export function getAdminId(request: FastifyRequest): string {
  return (request as unknown as Record<string, unknown>).adminId as string ?? "unknown";
}
