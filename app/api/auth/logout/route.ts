import { NextResponse } from "next/server";
import { jsonError, personFromRequest, requestIdFrom } from "@/kernel/http";
import { clearSessionCookieHeader } from "@/modules/auth/cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { kernel, person, sessionId } = await personFromRequest(request);
    await kernel.auth.logout(sessionId, person.id, requestIdFrom(request));
    const secure = kernel.env.nodeEnv === "production";
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const response = NextResponse.redirect(new URL("/sign-in", kernel.env.appBaseUrl), 303);
      response.headers.set("Set-Cookie", clearSessionCookieHeader(secure));
      return response;
    }
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", clearSessionCookieHeader(secure));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
