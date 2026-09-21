import { eq } from "drizzle-orm";
import { users, roleAssignments } from "@/modules/db/schema";
import { newId, nowUtc, type UserRole } from "@/modules/db/ids";
import type { Kernel } from "./create-kernel";
import { hashPassword } from "@/modules/auth";

export type DemoUserSeed = {
  email: string;
  password: string;
  totpSecret: string;
  displayName: string;
  role: UserRole;
};

export function demoUsersFromEnv(env: NodeJS.ProcessEnv = process.env): DemoUserSeed[] {
  const rows: Array<[string, string, string, string, UserRole]> = [
    [
      env.DEMO_MANAGING_PARTNER_EMAIL ?? "",
      env.DEMO_MANAGING_PARTNER_PASSWORD ?? "",
      env.DEMO_MANAGING_PARTNER_TOTP_SECRET ?? "",
      "Managing partner",
      "managing_partner",
    ],
    [
      env.DEMO_ADMINISTRATIVE_MANAGER_EMAIL ?? "",
      env.DEMO_ADMINISTRATIVE_MANAGER_PASSWORD ?? "",
      env.DEMO_ADMINISTRATIVE_MANAGER_TOTP_SECRET ?? "",
      "Administrative manager",
      "administrative_manager",
    ],
    [
      env.DEMO_LAWYER_EMAIL ?? "",
      env.DEMO_LAWYER_PASSWORD ?? "",
      env.DEMO_LAWYER_TOTP_SECRET ?? "",
      "Lawyer",
      "lawyer_or_analyst",
    ],
    [
      env.DEMO_INTEGRATION_OPERATOR_EMAIL ?? "",
      env.DEMO_INTEGRATION_OPERATOR_PASSWORD ?? "",
      env.DEMO_INTEGRATION_OPERATOR_TOTP_SECRET ?? "",
      "Integration operator",
      "integration_operator",
    ],
  ];
  return rows
    .filter(([email, password, secret]) => email && password && secret)
    .map(([email, password, totpSecret, displayName, role]) => ({
      email: email.trim().toLowerCase(),
      password,
      totpSecret: totpSecret.replaceAll(" ", "").toUpperCase(),
      displayName,
      role,
    }));
}

export async function seedDemoUsers(kernel: Kernel, demoUsers: DemoUserSeed[]): Promise<void> {
  for (const demo of demoUsers) {
    const existing = await kernel.auth.findUserByEmail(demo.email);
    if (existing) continue;
    const id = newId();
    const now = nowUtc();
    const passwordHash = await hashPassword(demo.password);
    await kernel.db.insert(users).values({
      id,
      email: demo.email,
      displayName: demo.displayName,
      role: demo.role,
      microsoftOid: null,
      passwordHash,
      isActive: true,
      mfaEnforced: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await kernel.db.insert(roleAssignments).values({
      id: newId(),
      userId: id,
      role: demo.role,
      assignedBy: id,
      createdAt: now,
    });
    await kernel.auth.enrollTotpForUser(id, demo.totpSecret);
    await kernel.bus.emitInTx(kernel.db, {
      type: "user.provisioned",
      source: "auth",
      actorId: id,
      requestId: id,
      payload: { user_id: id, role: demo.role },
    });
  }
  await kernel.bus.dispatchPending();
}

export async function getUserIdByEmail(kernel: Kernel, email: string): Promise<string | null> {
  const rows = await kernel.db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  return rows[0]?.id ?? null;
}
