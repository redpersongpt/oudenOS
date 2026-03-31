import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const currentPassword = typeof (payload as { currentPassword?: unknown })?.currentPassword === "string"
    ? (payload as { currentPassword: string }).currentPassword
    : "";
  const newPassword = typeof (payload as { newPassword?: unknown })?.newPassword === "string"
    ? (payload as { newPassword: string }).newPassword
    : "";
  const confirmPassword = typeof (payload as { confirmPassword?: unknown })?.confirmPassword === "string"
    ? (payload as { confirmPassword: string }).confirmPassword
    : "";

  if (newPassword.length < 8 || newPassword.length > 128) {
    return NextResponse.json({ error: "New password must be between 8 and 128 characters" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

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
    message: "Password updated successfully. Sign in again on other devices.",
  });
}
