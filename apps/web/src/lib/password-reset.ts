import crypto from "node:crypto";

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function buildPasswordResetUrl(rawToken: string): string {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "https://redcoreos.net").replace(/\/$/, "");
  return `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
}
