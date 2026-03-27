import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    return NextResponse.json(
      { error: "Username must be 2-30 characters" },
      { status: 400 }
    );
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, _ and -" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: trimmed },
  });

  return NextResponse.json({ ok: true });
}
