import { eq } from "drizzle-orm";
import type { AppDb } from "@/modules/db";
import { accountLockouts, rateLimitBuckets } from "@/modules/db/schema";
import { newId, nowUtc } from "@/modules/db/ids";
import type { EventBus } from "@/modules/event-bus";
import type { AppEnv } from "@/modules/db/env";

const WINDOW_MS = 60_000;

export function createRateLimit(getDb: () => AppDb, env: AppEnv, bus: EventBus) {
  async function hit(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const db = getDb();
    const now = nowUtc();
    const existing = await db.select().from(rateLimitBuckets).where(eq(rateLimitBuckets.key, key));
    const row = existing[0];
    if (!row || now.getTime() - row.windowStart.getTime() >= WINDOW_MS) {
      if (row) {
        await db.delete(rateLimitBuckets).where(eq(rateLimitBuckets.key, key));
      }
      await db.insert(rateLimitBuckets).values({
        id: newId(),
        key,
        windowStart: now,
        count: 1,
      });
      return { allowed: true, remaining: env.rateLimitMaxPerMinute - 1 };
    }
    const next = row.count + 1;
    await db.update(rateLimitBuckets).set({ count: next }).where(eq(rateLimitBuckets.key, key));
    if (next > env.rateLimitMaxPerMinute) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: env.rateLimitMaxPerMinute - next };
  }

  async function recordFailure(userId: string | null, emailKey: string): Promise<void> {
    if (!userId) return;
    const db = getDb();
    const failuresKey = `fail:${userId}`;
    const result = await hit(failuresKey);
    if (!result.allowed || env.rateLimitMaxPerMinute - result.remaining >= env.lockoutFailures) {
      const until = new Date(nowUtc().getTime() + 15 * 60 * 1000);
      const existing = await db.select().from(accountLockouts).where(eq(accountLockouts.userId, userId));
      if (existing[0]) {
        await db
          .update(accountLockouts)
          .set({ lockedUntil: until, reason: "repeated_failures" })
          .where(eq(accountLockouts.userId, userId));
      } else {
        await db.insert(accountLockouts).values({
          userId,
          lockedUntil: until,
          reason: "repeated_failures",
        });
      }
      await bus.dispatchEnvelope({
        id: newId(),
        type: "account.locked",
        at: nowUtc().toISOString(),
        source: "rate-limit",
        request_id: newId(),
        actor_id: null,
        payload: { user_id: userId, email_hash: emailKey },
        version: 1,
      });
    }
  }

  async function isLocked(userId: string): Promise<boolean> {
    const rows = await getDb().select().from(accountLockouts).where(eq(accountLockouts.userId, userId));
    const row = rows[0];
    if (!row) return false;
    if (row.lockedUntil.getTime() <= nowUtc().getTime()) {
      await getDb().delete(accountLockouts).where(eq(accountLockouts.userId, userId));
      return false;
    }
    return true;
  }

  async function clearFailures(userId: string): Promise<void> {
    await getDb().delete(accountLockouts).where(eq(accountLockouts.userId, userId));
  }

  return { hit, recordFailure, isLocked, clearFailures };
}

export type RateLimit = ReturnType<typeof createRateLimit>;
