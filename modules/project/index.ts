import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AppDb } from "@/modules/db";
import { clients, projects } from "@/modules/db/schema";
import { newId, nowUtc, type Person } from "@/modules/db/ids";
import type { EventBus } from "@/modules/event-bus";
import type { Policy } from "@/modules/policy";

export const CreateProjectInput = z.object({
  title: z.string().trim().min(1).max(300),
  client_id: z.string().uuid(),
});

export class ProjectError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type ProjectListItem = {
  id: string;
  title: string;
  client_id: string;
  client_name: string;
  assignee_id: string | null;
  ownership: "Unassigned" | "assigned";
  follow_up_owner_id: string;
  created_at: string;
  intake_received_at: string | null;
  status: string;
};

export function createProjectModule(getDb: () => AppDb, bus: EventBus, policy: Policy) {
  async function create(actor: Person, raw: unknown, requestId: string) {
    const gate = await policy.evaluate(actor, null);
    if (!gate.capabilities.createProject) {
      throw new ProjectError("You cannot create a project.", 403);
    }
    const input = CreateProjectInput.parse(raw);
    const db = getDb();
    const clientRows = await db.select().from(clients).where(eq(clients.id, input.client_id));
    const client = clientRows[0];
    if (!client) {
      throw new ProjectError("Choose an existing client.", 400);
    }
    const id = newId();
    const createdAt = nowUtc();
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id,
        clientId: input.client_id,
        title: input.title,
        assigneeId: null,
        practiceAreaId: client.practiceAreaId,
        status: "active",
        primaryPendingActionId: null,
        followUpOwnerId: actor.id,
        intakeReceivedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      await bus.emitInTx(tx, {
        type: "project.created",
        source: "project",
        actorId: actor.id,
        requestId,
        payload: { project_id: id, client_id: input.client_id, assignee_id: null },
      });
    });
    await bus.dispatchPending();
    return {
      id,
      title: input.title,
      client_id: input.client_id,
      assignee_id: null,
      ownership: "Unassigned" as const,
      follow_up_owner_id: actor.id,
    };
  }

  async function list(actor: Person): Promise<ProjectListItem[]> {
    const gate = await policy.evaluate(actor, null);
    if (actor.role === "integration_operator" || !gate.discover) {
      throw new ProjectError("Not found.", 404);
    }
    const db = getDb();
    const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
    const clientRows = await db.select().from(clients);
    const clientName = new Map(clientRows.map((c) => [c.id, c.name]));
    const visible: ProjectListItem[] = [];
    for (const row of rows) {
      const decision = await policy.evaluate(actor, {
        id: row.id,
        title: row.title,
        assigneeId: row.assigneeId,
      });
      if (!decision.discover || !decision.capabilities.seeTitle) continue;
      visible.push({
        id: row.id,
        title: row.title,
        client_id: row.clientId,
        client_name: clientName.get(row.clientId) ?? "",
        assignee_id: row.assigneeId,
        ownership: row.assigneeId ? "assigned" : "Unassigned",
        follow_up_owner_id: row.followUpOwnerId,
        created_at: row.createdAt.toISOString(),
        intake_received_at: row.intakeReceivedAt?.toISOString() ?? null,
        status: row.status,
      });
    }
    return visible;
  }

  async function get(actor: Person, id: string) {
    if (actor.role === "integration_operator") {
      throw new ProjectError("Not found.", 404);
    }
    const db = getDb();
    const rows = await db.select().from(projects).where(eq(projects.id, id));
    const row = rows[0];
    if (!row) {
      throw new ProjectError("Not found.", 404);
    }
    const decision = await policy.evaluate(actor, {
      id: row.id,
      title: row.title,
      assigneeId: row.assigneeId,
    });
    if (!decision.discover || !decision.capabilities.seeTitle) {
      throw new ProjectError("Not found.", 404);
    }
    const clientRows = await db.select().from(clients).where(eq(clients.id, row.clientId));
    return {
      id: row.id,
      title: row.title,
      client_id: row.clientId,
      client_name: clientRows[0]?.name ?? "",
      assignee_id: row.assigneeId,
      ownership: row.assigneeId ? "assigned" : "Unassigned",
      follow_up_owner_id: row.followUpOwnerId,
      created_at: row.createdAt.toISOString(),
      intake_received_at: row.intakeReceivedAt?.toISOString() ?? null,
      status: row.status,
    };
  }

  return { create, list, get };
}

export type ProjectModule = ReturnType<typeof createProjectModule>;
