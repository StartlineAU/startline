import { randomBytes } from "crypto";

const authUrl = process.env.NEON_AUTH_BASE_URL ?? "";

function generateTempPassword(): string {
  const rand = randomBytes(8).toString("hex");
  return rand + "A!";
}

export async function ensureAthleteCognitoUser(email: string): Promise<string> {
  if (!authUrl) return email;

  try {
    const res = await fetch(`${authUrl}/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password: generateTempPassword(),
        name: email.split("@")[0],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data?.user?.id ?? email;
    }

    const body = await res.json();
    if (body?.code === "USER_ALREADY_EXISTS" || res.status === 409) {
      return email;
    }

    return email;
  } catch {
    return email;
  }
}

export async function getCognitoUserStatus(email: string): Promise<{ exists: boolean; status: string | null }> {
  return { exists: false, status: null };
}
