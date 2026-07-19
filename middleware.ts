import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ORGANISER_PROTECTED = [
  "/organiser/dashboard",
  "/organiser/listings",
  "/organiser/profile",
  "/organiser/new-listing",
  "/organiser/onboarding",
  "/organiser/payments",
  "/organiser/events",
];

const ADMIN_PROTECTED = [
  "/admin/dashboard",
  "/admin/events",
  "/admin/organisers",
  "/admin/reviews",
];

const USER_DOMAIN = "startlineau.com";
const ORGANISER_DOMAIN = "organiser.startlineau.com";

const isBypass =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabase = !!(supabaseUrl && supabaseKey);
const isUnconfigured = !hasSupabase && process.env.NODE_ENV !== "production";

export async function middleware(req: NextRequest) {
  if (isBypass || isUnconfigured) return NextResponse.next();

  let res = NextResponse.next();

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  function isAdmin(): boolean {
    return (
      session?.user?.app_metadata?.role === "admin"
    );
  }

  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  if (host === ORGANISER_DOMAIN) {
    if (pathname === "/" || pathname === "/organiser") {
      return NextResponse.rewrite(new URL("/organiser-landing", req.url));
    }

    if (ORGANISER_PROTECTED.some((p) => pathname.startsWith(p))) {
      if (!session) return NextResponse.redirect(new URL("https://startlineau.com"));
      return res;
    }

    if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
      if (!session || !isAdmin()) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      return res;
    }

    if (
      !pathname.startsWith("/organiser") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/images") &&
      !pathname.startsWith("/favicon")
    ) {
      return NextResponse.redirect(new URL("https://startlineau.com"));
    }

    return res;
  }

  if (host === USER_DOMAIN || host === `www.${USER_DOMAIN}`) {
    if (
      pathname === "/waitlist" ||
      pathname.startsWith("/api/waitlist") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/images") ||
      pathname.startsWith("/favicon")
    ) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL("/waitlist", req.url));
  }

  if (pathname === "/organiser" || pathname === "/organiser-landing") {
    return NextResponse.rewrite(new URL("/organiser-landing", req.url));
  }

  if (ORGANISER_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!session) return NextResponse.redirect(new URL("/", req.url));
    return res;
  }

  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!session || !isAdmin()) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico).*)"],
};
