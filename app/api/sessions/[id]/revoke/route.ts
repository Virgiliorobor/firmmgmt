import { NextResponse } from "next/server";
import { jsonError, personFromRequest, requestIdFrom } from "@/kernel/http";
import { clearSessionCookieHeader } from "@/modules/auth/cookie";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { kernel, person, sessionId } = await personFromRequest(request);
    const result = await kernel.auth.revokeSession({
      actor: person,
      sessionId: id,
      requestId: requestIdFrom(request),
      currentSessionId: sessionId,
    });
    const response = NextResponse.json({ ok: true, message: "Session revoked." });
    if (result.signedOut) {
      response.headers.set("Set-Cookie", clearSessionCookieHeader(kernel.env.nodeEnv === "production"));
    }
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
