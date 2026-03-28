// ─── JWT Auth Middleware ──────────────────────────────────────────────────────

import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET: string = _rawSecret;

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    request.userId = payload.userId;
  } catch {
    reply.code(401).send({ error: "Invalid or expired token" });
    return;
  }
}
