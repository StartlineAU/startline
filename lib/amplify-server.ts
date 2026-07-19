import "server-only";

import { auth as neonAuth } from "@/lib/auth/server";
import prisma from "./prisma";

function getAuth() {
  if (!neonAuth) return null;
  return neonAuth;
}

export type ServerSession = {
  id:     string;
  email:  string;
  name:   string | null;
};

export type UserSession = {
  sub:   string;
  email: string;
  name:  string | null;
};

export type OrganiserSession = {
  sub:      string;
  email:    string;
  status:   string;
  verified: boolean;
};

export type AdminSession = {
  sub:   string;
  email: string;
  name:  string | null;
};

export const dynamic = "force-dynamic";

export async function getServerSession(): Promise<ServerSession | null> {
  const bypass = process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
  if (bypass) {
    return { id: "dev-bypass-admin", email: "admin@startline.test", name: "Admin User" };
  }

  try {
    const instance = getAuth();
    if (!instance) return null;
    const { data: session } = await instance.getSession();
    if (!session?.user) return null;
    return { id: session.user.id, email: session.user.email, name: session.user.name ?? null };
  } catch {
    return null;
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  const session = await getServerSession();
  if (!session) return null;

  try {
    const emailUpdate = session.email ? { email: session.email } : {};
    const user = await prisma.user.upsert({
      where:  { authId: session.id },
      update: emailUpdate,
      create: { authId: session.id, email: session.email },
      select: { id: true, email: true, name: true },
    });
    return { sub: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}

export async function getOrganiserSession(): Promise<OrganiserSession | null> {
  const session = await getServerSession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { authId: session.id },
    });
    if (!user) return null;

    const organiser = await prisma.organiser.findUnique({
      where:  { userId: user.id },
      select: { id: true, email: true, status: true, verified: true },
    });
    if (!organiser) return null;

    return { sub: organiser.id, email: organiser.email, status: String(organiser.status), verified: organiser.verified };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getServerSession();
  if (!session) return null;

  try {
    const admin = await prisma.admin.upsert({
      where:  { authId: session.id },
      update: session.email ? { email: session.email } : {},
      create: { authId: session.id, email: session.email },
      select: { id: true, email: true, name: true },
    });
    return { sub: admin.id, email: admin.email, name: admin.name };
  } catch {
    return null;
  }
}
