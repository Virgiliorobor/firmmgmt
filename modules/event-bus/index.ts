import { eq, isNull } from "drizzle-orm";
import type { AppDb, DbWriter } from "@/modules/db";
import { outboxEvents } from "@/modules/db/schema";
import type { EventEnvelope } from "@/modules/db/ids";
import { newId, nowUtc } from "@/modules/db/ids";

export type EventHandler = (event: EventEnvelope) => Promise<void>;

export type EventBus = {
  subscribe: (type: string, handler: EventHandler) => void;
  emitInTx: (
    tx: DbWriter,
    input: {
      type: string;
      source: string;
      actorId: string | null;
      requestId: string;
      payload: Record<string, unknown>;
    },
  ) => Promise<EventEnvelope>;
  dispatchPending: () => Promise<number>;
  dispatchEnvelope: (event: EventEnvelope) => Promise<void>;
  lastHeartbeatAt: () => Date | null;
};

export function createEventBus(getDb: () => AppDb): EventBus {
  const handlers = new Map<string, EventHandler[]>();
  let lastHeartbeat: Date | null = null;

  function subscribe(type: string, handler: EventHandler): void {
    const list = handlers.get(type) ?? [];
    list.push(handler);
    handlers.set(type, list);
  }

  async function dispatchEnvelope(event: EventEnvelope): Promise<void> {
    const matched = [...(handlers.get(event.type) ?? []), ...(handlers.get("*") ?? [])];
    for (const handler of matched) {
      await handler(event);
    }
    lastHeartbeat = nowUtc();
  }

  async function emitInTx(
    tx: DbWriter,
    input: {
      type: string;
      source: string;
      actorId: string | null;
      requestId: string;
      payload: Record<string, unknown>;
    },
  ): Promise<EventEnvelope> {
    const event: EventEnvelope = {
      id: newId(),
      type: input.type,
      at: nowUtc().toISOString(),
      source: input.source,
      request_id: input.requestId,
      actor_id: input.actorId,
      payload: input.payload,
      version: 1,
    };
    await tx.insert(outboxEvents).values({
      id: event.id,
      type: event.type,
      payload: event.payload,
      source: event.source,
      actorId: event.actor_id,
      requestId: event.request_id,
      version: event.version,
      createdAt: new Date(event.at),
      dispatchedAt: null,
    });
    return event;
  }

  async function dispatchPending(): Promise<number> {
    const db = getDb();
    const pending = await db.select().from(outboxEvents).where(isNull(outboxEvents.dispatchedAt));
    let count = 0;
    for (const row of pending) {
      const event: EventEnvelope = {
        id: row.id,
        type: row.type,
        at: row.createdAt.toISOString(),
        source: row.source,
        request_id: row.requestId,
        actor_id: row.actorId,
        payload: (row.payload ?? {}) as Record<string, unknown>,
        version: row.version,
      };
      await dispatchEnvelope(event);
      await db
        .update(outboxEvents)
        .set({ dispatchedAt: nowUtc() })
        .where(eq(outboxEvents.id, row.id));
      count += 1;
    }
    return count;
  }

  return {
    subscribe,
    emitInTx,
    dispatchPending,
    dispatchEnvelope,
    lastHeartbeatAt: () => lastHeartbeat,
  };
}
