import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureKernel } from "@/kernel/create-kernel";
import { clientIp, jsonError, requestIdFrom } from "@/kernel/http";
import { sessionCookieHeader } from "@/modules/auth/cookie";
import { isManagementRole } from "@/modules/db/ids";

export const runtime = "nodejs";

const Body = z.object({
  challenge_id: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(12).optional(),
  code: z.string().min(6).max(10),
});

export async function POST(request: Request) {
  try {
    const kernel = await ensureKernel();
    const body = Body.parse(await request.json());
    const result = await kernel.auth.verifyTotp({
      challengeId: body.challenge_id,
      email: body.email,
      password: body.password,
      code: body.code,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
      requestId: requestIdFrom(request),
    });
    const secure = kernel.env.nodeEnv === "production";
    const response = NextResponse.json({
      ok: true,
      home: "/",
      role: result.person.role,
      partner_home: isManagementRole(result.person.role),
    });
    response.headers.set("Set-Cookie", sessionCookieHeader(result.cookieValue, result.maxAge, secure));
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
