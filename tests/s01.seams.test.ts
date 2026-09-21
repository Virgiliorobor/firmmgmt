import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { middleware } from "@/middleware";
import { projects } from "@/modules/db/schema";
import { resetKernelState } from "@/kernel/create-kernel";
import { formatFirmStamp } from "@/modules/web-app/format";
import { authed, login, makeKernel, withKernel } from "./helpers";

describe("S01 login-home-project seams", () => {
  afterEach(async () => {
    await resetKernelState();
  });

  it("unauthenticated /projects returns 401", async () => {
    const response = await middleware(new NextRequest("http://localhost/projects"));
    expect(response.status).toBe(401);
    const { GET } = await import("@/app/api/projects/route");
    const api = await GET(new Request("http://localhost/api/projects"));
    expect(api.status).toBe(401);
  });

  it("integration operator cannot see a project title", async () => {
    const kernel = await makeKernel();
    await withKernel(kernel, async () => {
      const partner = await login("partner@example.local");
      const areas = await kernel.practiceArea.list();
      const { POST: postClient } = await import("@/app/api/clients/route");
      const clientRes = await postClient(
        authed("http://localhost/api/clients", partner.cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Harbor Imports LLC",
            client_category: "close_attention",
            practice_area_id: areas[0]?.id,
          }),
        }),
      );
      expect(clientRes.status).toBe(201);
      const client = (await clientRes.json()) as { id: string };
      const { POST: postProject } = await import("@/app/api/projects/route");
      const projectRes = await postProject(
        authed("http://localhost/api/projects", partner.cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "Confidential classification memo", client_id: client.id }),
        }),
      );
      expect(projectRes.status).toBe(201);
      const created = (await projectRes.json()) as { id: string; title: string };

      const operator = await login("operator@example.local");
      const { GET } = await import("@/app/api/projects/route");
      const list = await GET(authed("http://localhost/api/projects", operator.cookie));
      expect(list.status).toBe(404);
      const listBody = await list.text();
      expect(listBody).not.toContain("Confidential classification memo");
      expect(listBody).not.toContain(created.title);

      const { GET: getOne } = await import("@/app/api/projects/[id]/route");
      const one = await getOne(authed(`http://localhost/api/projects/${created.id}`, operator.cookie), {
        params: Promise.resolve({ id: created.id }),
      });
      expect(one.status).toBe(404);
      const oneBody = await one.text();
      expect(oneBody).not.toContain("Confidential classification memo");
    });
  });

  it("managing partner and administrative manager land on partner-home", async () => {
    const kernel = await makeKernel();
    await withKernel(kernel, async () => {
      const partner = await login("partner@example.local");
      expect(partner.body.partner_home).toBe(true);
      expect(partner.body.role).toBe("managing_partner");
      const manager = await login("admin.manager@example.local");
      expect(manager.body.partner_home).toBe(true);
      expect(manager.body.role).toBe("administrative_manager");
    });
  });

  it("created project appears on project-list and as Unassigned", async () => {
    const kernel = await makeKernel();
    await withKernel(kernel, async () => {
      const partner = await login("partner@example.local");
      const areas = await kernel.practiceArea.list();
      const { POST: postClient } = await import("@/app/api/clients/route");
      const clientRes = await postClient(
        authed("http://localhost/api/clients", partner.cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Northwind Traders",
            client_category: "standard",
            practice_area_id: areas.find((a) => a.name === "Contracts")?.id ?? areas[0]?.id,
            domain: "northwind.example",
          }),
        }),
      );
      const client = (await clientRes.json()) as { id: string };
      const { POST: postProject, GET } = await import("@/app/api/projects/route");
      const createdRes = await postProject(
        authed("http://localhost/api/projects", partner.cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "Annual review", client_id: client.id }),
        }),
      );
      expect(createdRes.status).toBe(201);
      const created = (await createdRes.json()) as { id: string; ownership: string };
      expect(created.ownership).toBe("Unassigned");

      const listed = await GET(authed("http://localhost/api/projects", partner.cookie));
      const body = (await listed.json()) as {
        projects: Array<{ id: string; title: string; ownership: string; created_at: string }>;
      };
      const found = body.projects.find((p) => p.id === created.id);
      expect(found?.title).toBe("Annual review");
      expect(found?.ownership).toBe("Unassigned");
      expect(formatFirmStamp(found?.created_at ?? "", "America/New_York")).toContain("America/New_York");
    });
  });

  it("drizzle project insert persists an Unassigned project", async () => {
    const kernel = await makeKernel();
    const rows = await kernel.db.select().from(projects).where(eq(projects.title, "does-not-exist-yet"));
    expect(rows).toHaveLength(0);
    const partner = await kernel.auth.findUserByEmail("partner@example.local");
    if (!partner) throw new Error("missing partner");
    const areas = await kernel.practiceArea.list();
    const person = {
      id: partner.id,
      email: partner.email,
      displayName: partner.displayName,
      role: partner.role as "managing_partner",
      isActive: true,
    };
    const client = await kernel.clients.create(
      person,
      {
        name: "Acme Customs",
        client_category: "lower_priority",
        practice_area_id: areas[0]?.id,
      },
      partner.id,
    );
    await kernel.projects.create(person, { title: "Unassigned filing", client_id: client.id }, partner.id);
    const stored = await kernel.db.select().from(projects).where(eq(projects.title, "Unassigned filing"));
    expect(stored[0]?.assigneeId).toBeNull();
    expect(stored[0]?.followUpOwnerId).toBe(partner.id);
  });

  it("English US copy labels timezone America/New_York", () => {
    const stamp = formatFirmStamp("2026-09-20T16:00:00.000Z", "America/New_York");
    expect(stamp).toContain("America/New_York");
    expect(stamp).not.toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("policy.evaluate hides titles from the integration operator", async () => {
    const kernel = await makeKernel();
    const operator = await kernel.auth.findUserByEmail("operator@example.local");
    if (!operator) throw new Error("missing operator");
    const decision = await kernel.policy.evaluate(
      { id: operator.id, role: "integration_operator", isActive: true },
      { id: "00000000-0000-7000-8000-000000000099", title: "Hidden title", assigneeId: null },
    );
    expect(decision.discover).toBe(false);
    expect(decision.capabilities.seeTitle).toBe(false);
  });
});
