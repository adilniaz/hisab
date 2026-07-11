import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

// ADMIN-only path prefixes (all other roles are redirected to /overview).
const ADMIN_ONLY = ["/admin", "/reports"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let response: NextResponse;
  if (isProtectedRoute(pathname)) {
    response = await applyAuthGuard(req, pathname);
  } else if (pathname === "/login") {
    // Send already-authenticated users to the dashboard.
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    response = token ? NextResponse.redirect(new URL("/overview", req.url)) : NextResponse.next();
  } else {
    response = NextResponse.next();
  }

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

async function applyAuthGuard(req: NextRequest, pathname: string): Promise<NextResponse> {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub as string },
    select: { active: true, tokenVersion: true, role: true },
  });

  if (!user || !user.active) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if ((user.tokenVersion ?? 0) !== ((token.tokenVersion as number) ?? 0)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/overview?error=forbidden", req.url));
  }

  return NextResponse.next();
}

function isProtectedRoute(pathname: string): boolean {
  // Everything except /login and /api is authenticated-only.
  return pathname !== "/login" && !pathname.startsWith("/api");
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"] };
