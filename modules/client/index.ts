import { eq } from "drizzle-orm";
import { z } from "zod";
import type { AppDb } from "@/modules/db";
import { clientDomains, clients, practiceAreas } from "@/modules/db/schema";
import { newId, nowUtc, type ClientCategory, type Person } from "@/modules/db/ids";
import type { EventBus } from "@/modules/event-bus";
import type { Policy } from "@/modules/policy";

export const CreateClientInput = z.object({
  name: z.string().trim().min(1).max(200),
  client_category: z.enum(["close_attention", "standard", "lower_priority"]),
  practice_area_id: z.string().uuid(),
  domain: z.string().trim().max(200).optional(),
});

export class ClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function createClientModule(getDb: () => AppDb, bus: EventBus, policy: Policy) {
  async function create(actor: Person, raw: unknown, requestId: string) {
    const decision = await policy.evaluate(actor, null);
    if (!decision.capabilities.createClient) {
      throw new ClientError("You cannot create a client.", 403);
    }
    const input = CreateClientInput.parse(raw);
    const db = getDb();
    const area = await db.select().from(practiceAreas).where(eq(practiceAreas.id, input.practice_area_id));
    if (!area[0]) {
      throw new ClientError("Choose a practice area from the firm list.", 400);
    }
    const id = newId();
    const domain = input.domain?.trim().toLowerCase();
    await db.transaction(async (tx) => {
      await tx.insert(clients).values({
        id,
        name: input.name,
        clientCategory: input.client_category,
        practiceAreaId: input.practice_area_id,
        createdAt: nowUtc(),
        updatedAt: nowUtc(),
      });
      if (domain) {
        await tx.insert(clientDomains).values({
          id: newId(),
          clientId: id,
          domain,
        });
      }
      await bus.emitInTx(tx, {
        type: "client.created",
        source: "client",
        actorId: actor.id,
        requestId,
        payload: { client_id: id, practice_area_id: input.practice_area_id },
      });
    });
    await bus.dispatchPending();
    return { id, name: input.name, client_category: input.client_category as ClientCategory };
  }

  async function list(actor: Person) {
    const decision = await policy.evaluate(actor, null);
    if (!decision.discover) {
      throw new ClientError("Not found.", 404);
    }
    const db = getDb();
    const rows = await db.select().from(clients);
    const domains = await db.select().from(clientDomains);
    const areas = await db.select().from(practiceAreas);
    const areaById = new Map(areas.map((a) => [a.id, a.name]));
    const categoryRank: Record<string, number> = {
      close_attention: 0,
      standard: 1,
      lower_priority: 2,
    };
    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        client_category: row.clientCategory as ClientCategory,
        practice_area: areaById.get(row.practiceAreaId) ?? "",
        practice_area_id: row.practiceAreaId,
        domains: domains.filter((d) => d.clientId === row.id).map((d) => d.domain),
        created_at: row.createdAt.toISOString(),
      }))
      .sort((a, b) => {
        const rank = (categoryRank[a.client_category] ?? 9) - (categoryRank[b.client_category] ?? 9);
        if (rank !== 0) return rank;
        return a.name.localeCompare(b.name, "en-US");
      });
  }

  async function getById(id: string) {
    const rows = await getDb().select().from(clients).where(eq(clients.id, id));
    return rows[0] ?? null;
  }

  return { create, list, getById };
}

export type ClientModule = ReturnType<typeof createClientModule>;
