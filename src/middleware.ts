import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const PUBLIC_PATHS = ["/login", "/register"];
const ADMIN_PATHS = ["/admin"];

interface JwtPayload {
  exp: number;
  role: "user" | "admin";
}

function isTokenValid(token: string): JwtPayload | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value;
  const refresh = req.cookies.get("refresh_token")?.value;

  // Root redirect
  if (pathname === "/") {
    return token
      ? NextResponse.redirect(new URL("/dashboard", req.url))
      : NextResponse.redirect(new URL("/login", req.url));
  }

  // Public pages — redirect logged-in users away
  if (PUBLIC_PATHS.includes(pathname)) {
    if (token && isTokenValid(token)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // All other pages require auth
  const payload = token ? isTokenValid(token) : null;

  if (!payload) {
    // Token missing or expired — check if refresh token exists
    // If it does, let the client-side axios interceptor handle the refresh.
    // If it doesn't, boot to login immediately.
    if (!refresh) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Has refresh token — let them through, axios will renew the access token
    return NextResponse.next();
  }

  // Admin route protection — role check at the edge
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|_static).*)"],
};