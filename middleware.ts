import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionCookie, SESSION_COOKIE } from "@/modules/auth/cookie";
import { isPublicPath, requiresJsonUnauthorized } from "@/modules/web-app/public-routes";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  const secret = process.env.SESSION_SECRET || "test-session-secret-at-least-32-chars!!";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionCookie(token, secret);
  if (session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-id", session.sid);
    requestHeaders.set("x-user-id", session.uid);
    requestHeaders.set("x-user-role", session.role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (requiresJsonUnauthorized(pathname)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
