import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/amplify-server";

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { cognitoSub: session.sub } });
    if (existing) return NextResponse.json({ ok: true });

    if (session.email) {
      await prisma.user.upsert({
        where: { email: session.email },
        update: { cognitoSub: session.sub, email: session.email },
        create: { cognitoSub: session.sub, email: session.email },
        select: { id: true },
      });
    } else {
      await prisma.user.create({
        data: { cognitoSub: session.sub, email: session.sub },
        select: { id: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("User session upsert error:", err);
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }
}
