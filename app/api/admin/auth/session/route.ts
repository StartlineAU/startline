import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/amplify-server";

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { authId: session.id },
    });
    if (!admin) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin session error:", err);
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }
}
