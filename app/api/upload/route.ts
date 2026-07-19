import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getOrganiserSession, createServerSupabaseClient } from "@/lib/supabase-server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime", "video/avi", "video/ogg"];
const UPLOAD_TYPES = ["logo", "cover", "photo", "video"];

export async function POST(req: NextRequest) {
  const session = await getOrganiserSession();
  if (!session) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string;

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!UPLOAD_TYPES.includes(type)) return NextResponse.json({ error: "Invalid upload type." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "File type not allowed." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = await createServerSupabaseClient();
    const filePath = `uploads/${session.sub}/${type}/${filename}`;
    const { error } = await supabase.storage
      .from("uploads")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    return NextResponse.json({ fileUrl: publicUrl });
  }

  const dir = join(process.cwd(), "public", "uploads", type);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);
  return NextResponse.json({ fileUrl: `/uploads/${type}/${filename}` });
}
