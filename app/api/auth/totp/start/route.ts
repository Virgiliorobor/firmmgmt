import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureKernel } from "@/kernel/create-kernel";
import { clientIp, jsonError, requestIdFrom } from "@/kernel/http";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

export async function POST(request: Request) {
  try {
    const kernel = await ensureKernel();
    const body = Body.parse(await request.json());
    const result = await kernel.auth.startTotpLogin({
      email: body.email,
      password: body.password,
      ip: clientIp(request),
      requestId: requestIdFrom(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
