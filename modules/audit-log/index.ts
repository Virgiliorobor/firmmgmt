import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/modules/db";
import { auditEvents, processedEvents } from "@/modules/db/schema";
import { newId, nowUtc } from "@/modules/db/ids";
import type { EventEnvelope } from "@/modules/db/ids";
import type { EventBus } from "@/modules/event-bus";

const BLOCKED_KEYS = [
  "password",
  "secret",
  "totp",
  "body",
  "filename",
  "recipient",
  "recipients",
  "document",
  "token",
  "code",
];

function isSafeKey(key: string): boolean {
  const lower = key.toLowerCase();
  return !BLOCKED_KEYS.some((blocked) => lower.includes(blocked));
}

export function sanitizeAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!isSafeKey(key)) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeAuditPayload(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function createAuditLog(getDb: () => AppDb, bus: EventBus): void {
  bus.subscribe("*", async (event: EventEnvelope) => {
    if (event.type === "audit.event_recorded") return;
    const db = getDb();
    const already = await db
      .select()
      .from(processedEvents)
      .where(and(eq(processedEvents.id, event.id), eq(processedEvents.consumer, "audit-log")));
    if (already.length > 0) return;

    const entityId =
      typeof event.payload.project_id === "string"
        ? event.payload.project_id
        : typeof event.payload.client_id === "string"
          ? event.payload.client_id
          : typeof event.payload.user_id === "string"
            ? event.payload.user_id
            : typeof event.payload.session_id === "string"
              ? event.payload.session_id
              : null;

    const entityType = event.type.split(".")[0] ?? "system";
    const actorType = event.actor_id ? "human" : "system";
    const auditId = newId();

    await db.insert(auditEvents).values({
      id: auditId,
      actorId: event.actor_id,
      actorType,
      action: event.type,
      entityType,
      entityId,
      before: null,
      after: sanitizeAuditPayload(event.payload),
      requestId: event.request_id,
      at: nowUtc(),
    });
    await db.insert(processedEvents).values({
      id: event.id,
      consumer: "audit-log",
      processedAt: nowUtc(),
    });
  });
}
