import { NextRequest, NextResponse } from "next/server";
import { getUserStatusByEmail } from "@/lib/athlete-accounts";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const { exists } = await getUserStatusByEmail(email);
    return NextResponse.json({ exists, status: exists ? "CONFIRMED" : null });
  } catch {
    return NextResponse.json({ error: "Failed to check user." }, { status: 503 });
  }
}
