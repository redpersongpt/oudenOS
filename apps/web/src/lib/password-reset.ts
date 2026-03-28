import crypto from "node:crypto";
import { getAppUrl } from "./app-url";

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function buildPasswordResetUrl(rawToken: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
}
