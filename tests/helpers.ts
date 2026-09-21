import { Secret, TOTP } from "otpauth";
import { createKernel, runWithKernel, setFallbackKernel, type Kernel } from "@/kernel/create-kernel";
import { seedDemoUsers, type DemoUserSeed } from "@/kernel/seed";
import { loadEnv } from "@/modules/db/env";
import { SESSION_COOKIE } from "@/modules/auth/cookie";

export const TEST_TOTP = "JBSWY3DPEHPK3PXP";
export const TEST_PASSWORD = "local-demo-pass";

export const DEMO_USERS: DemoUserSeed[] = [
  {
    email: "partner@example.local",
    password: TEST_PASSWORD,
    totpSecret: TEST_TOTP,
    displayName: "Managing partner",
    role: "managing_partner",
  },
  {
    email: "admin.manager@example.local",
    password: TEST_PASSWORD,
    totpSecret: TEST_TOTP,
    displayName: "Administrative manager",
    role: "administrative_manager",
  },
  {
    email: "lawyer@example.local",
    password: TEST_PASSWORD,
    totpSecret: TEST_TOTP,
    displayName: "Lawyer",
    role: "lawyer_or_analyst",
  },
  {
    email: "operator@example.local",
    password: TEST_PASSWORD,
    totpSecret: TEST_TOTP,
    displayName: "Integration operator",
    role: "integration_operator",
  },
];

export function totpNow(secret = TEST_TOTP): string {
  return new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }).generate();
}

export async function makeKernel(): Promise<Kernel> {
  const kernel = await createKernel({ memory: true, env: loadEnv() });
  await seedDemoUsers(kernel, DEMO_USERS);
  setFallbackKernel(kernel);
  return kernel;
}

export function cookieFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) throw new Error("Missing session cookie");
  return match[1];
}

export function authed(url: string, cookie: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("cookie", `${SESSION_COOKIE}=${cookie}`);
  return new Request(url, { ...init, headers });
}

export async function login(email: string): Promise<{ cookie: string; body: { role: string; partner_home: boolean } }> {
  const { POST } = await import("@/app/api/auth/totp/verify/route");
  const response = await POST(
    new Request("http://localhost/api/auth/totp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: TEST_PASSWORD, code: totpNow() }),
    }),
  );
  const body = (await response.json()) as { role: string; partner_home: boolean; error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "login failed");
  }
  return { cookie: cookieFrom(response), body };
}

export async function withKernel<T>(kernel: Kernel, fn: () => Promise<T>): Promise<T> {
  return runWithKernel(kernel, fn);
}
