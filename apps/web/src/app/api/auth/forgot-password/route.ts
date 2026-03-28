import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, resetPasswordTemplate } from "@/lib/email";
import { buildPasswordResetUrl, generatePasswordResetToken, hashPasswordResetToken } from "@/lib/password-reset";

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

    sendEmail({
      to: email,
      subject: "Reset your redcore password",
      html: resetPasswordTemplate(user.name, buildPasswordResetUrl(rawToken)),
    }).catch((error) => {
      console.error("Failed to send password reset email", error);
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If an account with that email exists, a reset link has been sent.",
  });
}
