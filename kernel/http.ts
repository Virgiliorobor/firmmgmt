import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { ensureKernel } from "@/kernel/create-kernel";
import { readSessionCookie, SESSION_COOKIE } from "@/modules/auth/cookie";
import { AuthError } from "@/modules/auth";
import { ClientError } from "@/modules/client";
import { ProjectError } from "@/modules/project";
import { newId, type Person } from "@/modules/db/ids";
import type { Kernel } from "@/kernel/create-kernel";

export function requestIdFrom(request: Request): string {
  return request.headers.get("x-request-id") ?? newId();
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

export async function personFromRequest(request: Request): Promise<{
  kernel: Kernel;
  person: Person;
  sessionId: string;
  requestId: string;
}> {
  const kernel = await ensureKernel();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  const token = match?.[1];
  const payload = await readSessionCookie(token, kernel.env.sessionSecret);
  if (!payload) {
    throw new AuthError("Authentication required", 401);
  }
  const person = await kernel.auth.loadSession(payload.sid);
  if (!person) {
    throw new AuthError("Authentication required", 401);
  }
  return { kernel, person, sessionId: payload.sid, requestId: requestIdFrom(request) };
}

export async function requirePageSession(): Promise<{
  kernel: Kernel;
  person: Person;
  sessionId: string;
}> {
  const kernel = await ensureKernel();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = await readSessionCookie(token, kernel.env.sessionSecret);
  if (!payload) redirect("/sign-in");
  const person = await kernel.auth.loadSession(payload.sid);
  if (!person) redirect("/sign-in");
  return { kernel, person, sessionId: payload.sid };
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Check the form and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (error instanceof AuthError || error instanceof ClientError || error instanceof ProjectError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "The request could not be completed. Try again." }, { status: 500 });
}
