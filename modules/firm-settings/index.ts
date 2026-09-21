import type { AppDb } from "@/modules/db";
import { firmSettings } from "@/modules/db/schema";
import { FIRM_SETTINGS_ID, nowUtc } from "@/modules/db/ids";
import type { AppEnv } from "@/modules/db/env";

export function createFirmSettings(getDb: () => AppDb, env: AppEnv) {
  async function ensureSingleton(): Promise<void> {
    const db = getDb();
    const existing = await db.select().from(firmSettings);
    if (existing.length > 0) return;
    await db.insert(firmSettings).values({
      id: FIRM_SETTINGS_ID,
      timezone: env.firmTimezone,
      locale: env.firmLocale,
      dedicatedIntakeAddress: env.dedicatedIntakeAddress ?? null,
      clientDeadlineOffsetsDays: [15, 7, 3, 1],
      authorityDeadlineOffsetsDays: [15, 7, 3, 1],
      includeOverdue: true,
      updatedAt: nowUtc(),
    });
  }

  async function read() {
    await ensureSingleton();
    const rows = await getDb().select().from(firmSettings);
    const row = rows[0];
    if (!row) {
      throw new Error("Firm settings missing");
    }
    return {
      timezone: row.timezone,
      locale: row.locale,
      dedicatedIntakeAddress: row.dedicatedIntakeAddress ?? env.dedicatedIntakeAddress ?? null,
    };
  }

  return { ensureSingleton, read };
}

export type FirmSettings = ReturnType<typeof createFirmSettings>;
