import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/amplify-server";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { cognitoSub: session.sub } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ mfaEnabled: user.mfaEnabled });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  const user = await prisma.user.findUnique({ where: { cognitoSub: session.sub } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  switch (action) {
    case "enable": {
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      });
      return NextResponse.json({ ok: true });
    }

    case "disable": {
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: false, recoveryCodes: null },
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
