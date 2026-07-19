import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "./prisma";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}

type ServerSession = {
  sub: string;
  email: string;
  groups: string[];
};

type UserSession = {
  sub: string;
  email: string;
  name: string | null;
  phoneNumber?: string;
  birthdate?: string;
};

type OrganiserSession = {
  sub: string;
  email: string;
  status: string;
  verified: boolean;
};

type AdminSession = {
  sub: string;
  email: string;
  name: string | null;
};

const isBypass =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

export async function getServerSession(): Promise<ServerSession | null> {
  if (isBypass) {
    return {
      sub: "dev-bypass-admin",
      email: "admin@startline.test",
      groups: ["admins"],
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  return {
    sub: session.user.id,
    email: session.user.email ?? "",
    groups:
      (session.user.app_metadata?.role as string) === "admin"
        ? ["admins"]
        : [],
  };
}

export async function getUserSession(): Promise<UserSession | null> {
  const authSession = await getServerSession();
  if (!authSession) return null;

  const user = await prisma.user
    .upsert({
      where: { authId: authSession.sub },
      update: { email: authSession.email },
      create: {
        authId: authSession.sub,
        email: authSession.email,
      },
      select: { id: true, email: true, name: true },
    })
    .catch(() => null);

  if (!user) return null;
  return { sub: user.id, email: user.email, name: user.name, phoneNumber: undefined, birthdate: undefined };
}

export async function getOrganiserSession(): Promise<OrganiserSession | null> {
  const userSession = await getUserSession();
  if (!userSession) return null;

  const organiser = await prisma.organiser
    .findUnique({
      where: { userId: userSession.sub },
      select: { id: true, email: true, status: true, verified: true },
    })
    .catch(() => null);

  if (!organiser) return null;
  return {
    sub: organiser.id,
    email: organiser.email,
    status: String(organiser.status),
    verified: organiser.verified,
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const authSession = await getServerSession();
  if (!authSession || !authSession.groups.includes("admins")) return null;

  const admin = await prisma.admin
    .upsert({
      where: { authId: authSession.sub },
      update: { email: authSession.email },
      create: {
        authId: authSession.sub,
        email: authSession.email,
      },
      select: { id: true, email: true, name: true },
    })
    .catch(() => null);

  if (!admin) return null;
  return { sub: admin.id, email: admin.email, name: admin.name };
}
