import { eq } from "drizzle-orm";
import type { AppDb } from "@/modules/db";
import { practiceAreas } from "@/modules/db/schema";
import { newId, nowUtc, SYSTEM_PRACTICE_AREAS } from "@/modules/db/ids";
import type { EventBus } from "@/modules/event-bus";

export function createPracticeArea(getDb: () => AppDb, bus: EventBus) {
  async function seedSystem(): Promise<void> {
    const db = getDb();
    const existing = await db.select().from(practiceAreas);
    const names = new Set(existing.map((row) => row.name));
    for (const name of SYSTEM_PRACTICE_AREAS) {
      if (names.has(name)) continue;
      const id = newId();
      await db.insert(practiceAreas).values({
        id,
        name,
        isSystem: true,
        createdAt: nowUtc(),
      });
      await bus.emitInTx(db, {
        type: "practice-area.created",
        source: "practice-area",
        actorId: null,
        requestId: id,
        payload: { practice_area_id: id },
      });
    }
    await bus.dispatchPending();
  }

  async function list() {
    return getDb().select().from(practiceAreas);
  }

  async function getById(id: string) {
    const rows = await getDb().select().from(practiceAreas).where(eq(practiceAreas.id, id));
    return rows[0] ?? null;
  }

  return { seedSystem, list, getById };
}

export type PracticeArea = ReturnType<typeof createPracticeArea>;
