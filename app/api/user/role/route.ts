import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/amplify-server";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { authId: session.id },
    include: { organiser: { select: { id: true } } },
  });

  if (user?.organiser) {
    return NextResponse.json({ role: "organiser" });
  }

  return NextResponse.json({ role: "user" });
}
