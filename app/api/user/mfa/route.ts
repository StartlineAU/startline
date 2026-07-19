import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/amplify-server";
import { generateRecoveryCodes, encryptRecoveryCodes, decryptRecoveryCodes, verifyRecoveryCode } from "@/lib/recovery-codes";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { cognitoSub: session.sub },
    select: { mfaEnabled: true, recoveryCodes: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const recoveryCodesRemaining = user.recoveryCodes
    ? decryptRecoveryCodes(user.recoveryCodes).length
    : 0;

  return NextResponse.json({ mfaEnabled: user.mfaEnabled, recoveryCodesRemaining });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "generate-recovery-codes") {
    const codes = generateRecoveryCodes();
    const encrypted = encryptRecoveryCodes(codes);
    await prisma.user.update({
      where: { cognitoSub: session.sub },
      data: { recoveryCodes: encrypted, mfaEnabled: true },
    });
    return NextResponse.json({ codes, message: "Store these codes safely. They will not be shown again." });
  }

  if (action === "use-recovery-code") {
    const { code } = body;
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Recovery code is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { cognitoSub: session.sub },
      select: { recoveryCodes: true },
    });
    if (!user?.recoveryCodes) {
      return NextResponse.json({ error: "No recovery codes available." }, { status: 400 });
    }

    const remaining = verifyRecoveryCode(user.recoveryCodes, code);
    if (remaining === null) {
      return NextResponse.json({ error: "Invalid recovery code." }, { status: 400 });
    }

    const reEncrypted = remaining.length > 0 ? encryptRecoveryCodes(remaining) : null;
    const updateData: { recoveryCodes: string | null; mfaEnabled?: boolean } = { recoveryCodes: reEncrypted };
    if (remaining.length === 0) updateData.mfaEnabled = false;

    await prisma.user.update({
      where: { cognitoSub: session.sub },
      data: updateData,
    });

    return NextResponse.json({ valid: true, remaining: remaining.length });
  }

  if (action === "disable") {
    await prisma.user.update({
      where: { cognitoSub: session.sub },
      data: { mfaEnabled: false, recoveryCodes: null },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
