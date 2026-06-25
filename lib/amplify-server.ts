import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession } from "aws-amplify/auth/server";
import type { AuthSession } from "aws-amplify/auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import JwksClientModule from "jwks-rsa";
import { amplifyConfig } from "./amplify-config";
import prisma from "./prisma";

export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});

export type ServerSession = {
  sub:         string;
  email:       string;
  groups:      string[];
  phoneNumber: string | null;
  birthdate:   string | null;
};

export type UserSession = {
  sub:         string; // Prisma User.id
  email:       string;
  name:        string | null;
  phoneNumber: string | null;
  birthdate:   string | null;
};

export type OrganiserSession = {
  sub:      string; // Prisma Organiser.id
  email:    string;
  status:   string;
  verified: boolean;
};

export type AdminSession = {
  sub:   string; // Prisma Admin.id
  email: string;
  name:  string | null;
};

const region   = process.env.NEXT_PUBLIC_AWS_REGION          ?? "";
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const clientId   = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID    ?? "";

const cognitoDomain = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const jwksClient = new JwksClientModule.JwksClient({
  jwksUri: `${cognitoDomain}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: 10000,
});

function isEmail(value: string | undefined | null): value is string {
  return !!value && value.includes("@");
}

function resolveSessionEmail(
  idPayload: jwt.JwtPayload | null,
  accessPayload: jwt.JwtPayload,
  lastAuthUser: string
): string {
  if (isEmail(idPayload?.email as string | undefined)) return idPayload!.email as string;
  if (isEmail(lastAuthUser)) return lastAuthUser;
  if (isEmail(accessPayload.email as string | undefined)) return accessPayload.email as string;
  return "";
}

function verifyToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      function getKey(header: any, callback: (err: Error | null, key?: string) => void) {
        jwksClient.getSigningKey(header.kid as string, (err: any, key: any) => {
          if (err) return callback(err);
          callback(null, key.getPublicKey());
        });
      },
      { issuer: cognitoDomain, algorithms: ["RS256"] },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as jwt.JwtPayload);
      }
    );
  });
}

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const cookieStore = await cookies();

    const lastAuthUser = cookieStore.get(
      `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`
    )?.value;
    if (!lastAuthUser) return null;

    const cookiePrefix = `CognitoIdentityServiceProvider.${clientId}.${encodeURIComponent(lastAuthUser)}`;

    const accessToken = cookieStore.get(`${cookiePrefix}.accessToken`)?.value;
    if (!accessToken) return null;

    const idToken = cookieStore.get(`${cookiePrefix}.idToken`)?.value;
    const accessPayload = await verifyToken(accessToken);
    const idPayload = idToken ? await verifyToken(idToken).catch(() => null) : null;

    const groups = (accessPayload["cognito:groups"] as string[] | undefined) ?? [];
    const sub = accessPayload.sub as string;
    const email = resolveSessionEmail(idPayload, accessPayload, lastAuthUser);
    const phoneNumber = (idPayload?.phone_number as string | undefined) ?? null;
    const birthdate = (idPayload?.birthdate as string | undefined) ?? null;

    return { sub, email, groups, phoneNumber, birthdate };
  } catch {
    return null;
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  const cognitoSession = await getServerSession();
  if (!cognitoSession) return null;

  try {
    const existing = await prisma.user.findUnique({
      where:  { cognitoSub: cognitoSession.sub },
      select: { email: true },
    });

    const emailForDb = isEmail(cognitoSession.email)
      ? cognitoSession.email
      : (isEmail(existing?.email) ? existing!.email : cognitoSession.email);

    const user = await prisma.user.upsert({
      where:  { cognitoSub: cognitoSession.sub },
      update: isEmail(cognitoSession.email) ? { email: cognitoSession.email } : {},
      create: { cognitoSub: cognitoSession.sub, email: emailForDb },
      select: { id: true, email: true, name: true },
    });

    const email = isEmail(cognitoSession.email) ? cognitoSession.email : user.email;

    return {
      sub:         user.id,
      email,
      name:        user.name,
      phoneNumber: cognitoSession.phoneNumber,
      birthdate:   cognitoSession.birthdate,
    };
  } catch {
    return null;
  }
}

export async function getOrganiserSession(): Promise<OrganiserSession | null> {
  const cognitoSession = await getServerSession();
  if (!cognitoSession) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { cognitoSub: cognitoSession.sub },
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
  const cognitoSession = await getServerSession();
  if (!cognitoSession) return null;
  if (!cognitoSession.groups.includes("admins")) return null;

  try {
    const admin = await prisma.admin.upsert({
      where:  { cognitoSub: cognitoSession.sub },
      update: isEmail(cognitoSession.email) ? { email: cognitoSession.email } : {},
      create: { cognitoSub: cognitoSession.sub, email: cognitoSession.email },
      select: { id: true, email: true, name: true },
    });
    const email = isEmail(cognitoSession.email) ? cognitoSession.email : admin.email;
    return { sub: admin.id, email, name: admin.name };
  } catch {
    return null;
  }
}
