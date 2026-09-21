import { afterEach, describe, expect, it } from "vitest";
import { resetKernelState } from "@/kernel/create-kernel";
import { makeKernel, totpNow, withKernel } from "./helpers";

describe("AUTH-3 login rate limit", () => {
  afterEach(async () => {
    await resetKernelState();
  });

  it("sixth rapid login attempt returns 429", async () => {
    const kernel = await makeKernel();
    await withKernel(kernel, async () => {
      const { POST } = await import("@/app/api/auth/totp/start/route");
      let last = 0;
      for (let i = 0; i < 6; i += 1) {
        const response = await POST(
          new Request("http://localhost/api/auth/totp/start", {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
            body: JSON.stringify({
              email: "partner@example.local",
              password: "wrong-password-12",
            }),
          }),
        );
        last = response.status;
      }
      expect(last).toBe(429);
    });
  });

  it("valid TOTP still issues a session", async () => {
    const kernel = await makeKernel();
    await withKernel(kernel, async () => {
      const { POST } = await import("@/app/api/auth/totp/verify/route");
      const response = await POST(
        new Request("http://localhost/api/auth/totp/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "partner@example.local",
            password: "local-demo-pass",
            code: totpNow(),
          }),
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
      expect(response.headers.get("set-cookie")).toMatch(/SameSite=Lax/i);
    });
  });
});
