import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

async function notConfigured() {
  return NextResponse.json({ error: "Auth not configured." }, { status: 503 });
}

export const GET = auth ? auth.handler().GET : notConfigured;
export const POST = auth ? auth.handler().POST : notConfigured;
