import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/amplify-server";
import { generateRecoveryCodes, encryptRecoveryCodes, decryptRecoveryCodes, verifyRecoveryCode } from "@/lib/recovery-codes";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { cognitoSub: session.sub } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const recoveryCodesRemaining = user.recoveryCodes ? decryptRecoveryCodes(user.recoveryCodes).length : 0;

  return NextResponse.json({
    mfaEnabled: user.mfaEnabled,
    recoveryCodesRemaining,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  const user = await prisma.user.findUnique({ where: { cognitoSub: session.sub } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  switch (action) {
    case "generate-recovery-codes": {
      const codes = generateRecoveryCodes();
      const encrypted = encryptRecoveryCodes(codes);
      await prisma.user.update({
        where: { id: user.id },
        data: { recoveryCodes: encrypted },
      });
      return NextResponse.json({ codes });
    }

    case "use-recovery-code": {
      const { code } = body;
      if (!code || typeof code !== "string") {
        return NextResponse.json({ error: "Code is required." }, { status: 400 });
      }
      if (!user.recoveryCodes) {
        return NextResponse.json({ error: "No recovery codes." }, { status: 400 });
      }
      const result = verifyRecoveryCode(user.recoveryCodes, code);
      if (result.codes === null) {
        return NextResponse.json({ valid: false, error: "Invalid code." }, { status: 400 });
      }
      if (result.remaining === null) {
        return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
      }
      const newEncrypted = result.remaining.length > 0 ? encryptRecoveryCodes(result.remaining) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { recoveryCodes: newEncrypted },
      });
      return NextResponse.json({ valid: true, remaining: result.remaining.length });
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
