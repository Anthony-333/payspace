import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirect only: it checks that a session cookie exists, not that it's valid.
// Real authorization happens in every Convex function (convex/lib/tenant.ts).
// /opengraph-image has no file extension, so the matcher below does not skip it.
const PUBLIC_PATHS = new Set(["/", "/sign-in", "/sign-up", "/privacy", "/terms", "/opengraph-image"]);
// The blog and the industry pages, with everything under them (articles, share images, RSS).
const PUBLIC_SECTIONS = ["/blog", "/pos"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/r/") ||
    PUBLIC_SECTIONS.some((s) => pathname === s || pathname.startsWith(`${s}/`))
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }
  if (!getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname + search);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, the auth API and static files.
  matcher: ["/((?!_next|api/auth|.*\\..*).*)"],
};
