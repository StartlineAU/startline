import { NextRequest, NextResponse } from "next/server";

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

const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const BYPASS = process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

function hasSession(req: NextRequest): boolean {
  if (BYPASS) return true;
  return !!req.cookies.get(SESSION_COOKIE)?.value;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  if (host === ORGANISER_DOMAIN) {
    if (pathname === "/" || pathname === "/organiser") {
      return NextResponse.rewrite(new URL("/organiser-landing", req.url));
    }

    if (ORGANISER_PROTECTED.some((p) => pathname.startsWith(p))) {
      if (!hasSession(req)) return NextResponse.redirect(new URL("https://startlineau.com"));
      return NextResponse.next();
    }

    if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
      if (!hasSession(req)) return NextResponse.redirect(new URL("/admin/login", req.url));
      return NextResponse.next();
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

    return NextResponse.next();
  }

  if (host === USER_DOMAIN || host === `www.${USER_DOMAIN}`) {
    if (pathname === "/waitlist"
        || pathname.startsWith("/api/waitlist")
        || pathname.startsWith("/_next")
        || pathname.startsWith("/images")
        || pathname.startsWith("/favicon")) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL("/waitlist", req.url));
  }

  if (pathname === "/organiser" || pathname === "/organiser-landing") {
    return NextResponse.rewrite(new URL("/organiser-landing", req.url));
  }

  if (ORGANISER_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!hasSession(req)) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!hasSession(req)) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|images/|favicon.ico).*)",
  ],
};
