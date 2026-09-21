import { test, expect } from "@playwright/test";
import { Secret, TOTP } from "otpauth";

function totpNow(): string {
  return new TOTP({
    secret: Secret.fromBase32("JBSWY3DPEHPK3PXP"),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }).generate();
}

test.describe("@smoke login home create project", () => {
  test("login → partner-home → create project → see it", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
    await page.getByLabel("Work email").fill("partner@example.local");
    await page.getByLabel("Password").fill("local-demo-pass");
    await page.getByRole("button", { name: "Use authenticator code" }).click();
    await expect(page.getByLabel("Authenticator code")).toBeVisible();
    await page.getByLabel("Authenticator code").fill(totpNow());
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Partner home" })).toBeVisible();
    await expect(page.getByText("America/New_York")).toBeVisible();

    await page.getByRole("link", { name: "Create project" }).first().click();
    await page.getByLabel("Project title").fill("Pilot Unassigned project");
    await page.getByLabel("Client name").fill("Atlantic Brokers");
    await page.getByLabel("Client category").selectOption("standard");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("heading", { name: "Pilot Unassigned project" })).toBeVisible();
    await expect(page.locator(".unassigned-mark")).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Projects" }).click();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByText("Pilot Unassigned project")).toBeVisible();
    await expect(page.getByText("Permanent full list")).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Unassigned" }).click();
    await expect(page.getByRole("heading", { name: "Unassigned" })).toBeVisible();
    await expect(page.getByText("Pilot Unassigned project")).toBeVisible();
  });
});
