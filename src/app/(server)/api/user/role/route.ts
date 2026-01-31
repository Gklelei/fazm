import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const existingUser = await db.user.findUnique({
    where: {
      id: session?.user.id,
    },
  });

  if (!existingUser) {
    return NextResponse.json(
      { message: "No user with id found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ role: existingUser.role });
}
