import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const auth = baseUrl && cookieSecret
  ? createNeonAuth({ baseUrl, cookies: { secret: cookieSecret } })
  : null as unknown as ReturnType<typeof createNeonAuth>;
