import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = typeof (payload as { token?: unknown })?.token === "string"
    ? (payload as { token: string }).token.trim()
    : "";
  const password = typeof (payload as { password?: unknown })?.password === "string"
    ? (payload as { password: string }).password
    : "";

  if (!token) {
    return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 8 and 128 characters" }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Reset token is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({
    ok: true,
    message: "Password has been reset. You can sign in with your new password now.",
  });
}
