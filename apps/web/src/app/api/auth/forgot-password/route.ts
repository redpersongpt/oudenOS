import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, resetPasswordTemplate } from "@/lib/email";
import { buildPasswordResetUrl, generatePasswordResetToken, hashPasswordResetToken } from "@/lib/password-reset";
import { callCloudApi } from "@/lib/cloud-api";
import { passwordResetRateLimit } from "@/lib/rate-limit";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof (payload as { email?: unknown })?.email === "string"
    ? (payload as { email: string }).email.toLowerCase().trim()
    : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const rateLimit = passwordResetRateLimit(req.headers, email);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const [user] = await prisma.user.findMany({
    where: { email },
    select: { id: true, name: true, passwordHash: true },
    take: 1,
  });

  if (user?.passwordHash) {
    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    void sendEmail({
      to: email,
      subject: "Password reset",
      html: resetPasswordTemplate(user.name, buildPasswordResetUrl(rawToken)),
    }).catch((error) => {
      console.error("Failed to send password reset email", error);
    });
  } else {
    // Best-effort cloud-api compatibility: desktop and cloud accounts can use the same web UI.
    const cloudResponse = await callCloudApi("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!cloudResponse.ok) {
      console.error("Failed to forward password reset request to cloud-api", cloudResponse.error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account with that email exists, a reset link has been sent.",
  });
}
