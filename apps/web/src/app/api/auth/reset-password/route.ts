import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { callCloudApi } from "@/lib/cloud-api";

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
    const cloudResponse = await callCloudApi<{ ok: true; message?: string }>("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!cloudResponse.ok) {
      return NextResponse.json({ error: cloudResponse.error }, { status: cloudResponse.status || 400 });
    }

    return NextResponse.json({
      ok: true,
      message: cloudResponse.data.message ?? "Password has been reset. You can sign in with your new password now.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Password has been reset. You can sign in with your new password now.",
  });
}
