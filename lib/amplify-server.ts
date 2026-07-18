import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";
import prisma from "./prisma";

export type ServerSession = {
  sub:          string;
  email:        string;
  groups:       string[];
  phoneNumber?: string;
  birthdate?:   string;
};

export type UserSession = {
  sub:          string; // Prisma User.id
  email:        string;
  name:         string | null;
  phoneNumber?: string;
  birthdate?:   string;
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

const JWKS = createRemoteJWKSet(
  new URL(`${cognitoDomain}/.well-known/jwks.json`)
);

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: cognitoDomain,
    audience: undefined,
  });
  return payload;
}

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const cookieStore = await cookies();

    const lastAuthUser = cookieStore.get(
      `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`
    )?.value;
    if (!lastAuthUser) return null;

    const accessToken = (
      cookieStore.get(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`)?.value ??
      cookieStore.get(`CognitoIdentityServiceProvider.${clientId}.${encodeURIComponent(lastAuthUser)}.accessToken`)?.value
    );
    if (!accessToken) return null;

    const payload = await verifyToken(accessToken);

    const groups = (payload["cognito:groups"] as string[] | undefined) ?? [];
    const sub   = payload.sub as string;
    const phoneNumber = payload.phone_number as string | undefined;
    const birthdate   = payload.birthdate as string | undefined;

    // The email must come from the verified id-token `email` claim: access
    // tokens carry no email, and for this pool `LastAuthUser` is the Cognito
    // sub (a UUID), not an address. Fall back to LastAuthUser only if it is
    // itself an email (pools where the username is the email).
    let email = lastAuthUser.includes("@") ? lastAuthUser : "";
    const idToken = (
      cookieStore.get(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`)?.value ??
      cookieStore.get(`CognitoIdentityServiceProvider.${clientId}.${encodeURIComponent(lastAuthUser)}.idToken`)?.value
    );
    if (idToken) {
      try {
        const idPayload = await verifyToken(idToken);
        if (typeof idPayload.email === "string" && idPayload.email) {
          email = idPayload.email;
        }
      } catch {
        // Keep the fallback if the id token can't be verified.
      }
    }

    return { sub, email, groups, phoneNumber, birthdate };
  } catch {
    return null;
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  const cognitoSession = await getServerSession();
  if (!cognitoSession) return null;

  try {
    // Only write the email when we actually resolved one, so a missing id-token
    // email never clobbers a good stored address. When present it heals rows
    // that earlier sign-ins had stamped with the Cognito sub.
    const emailUpdate = cognitoSession.email ? { email: cognitoSession.email } : {};
    const user = await prisma.user.upsert({
      where:  { cognitoSub: cognitoSession.sub },
      update: emailUpdate,
      create: { cognitoSub: cognitoSession.sub, email: cognitoSession.email || cognitoSession.sub },
      select: { id: true, email: true, name: true },
    });
    return { sub: user.id, email: user.email, name: user.name, phoneNumber: cognitoSession.phoneNumber, birthdate: cognitoSession.birthdate };
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
      update: cognitoSession.email ? { email: cognitoSession.email } : {},
      create: { cognitoSub: cognitoSession.sub, email: cognitoSession.email || cognitoSession.sub },
      select: { id: true, email: true, name: true },
    });
    return { sub: admin.id, email: admin.email, name: admin.name };
  } catch {
    return null;
  }
}
