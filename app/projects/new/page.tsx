import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { CreateProjectForm } from "@/modules/web-app/create-project-form";
import { isManagementRole } from "@/modules/db/ids";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const { kernel, person } = await requirePageSession();
  if (!isManagementRole(person.role)) {
    redirect("/projects");
  }
  const [areas, clients] = await Promise.all([kernel.practiceArea.list(), kernel.clients.list(person)]);
  return (
    <AuthenticatedShell pathname="/projects/new">
      <h1 className="font-serif text-page mb-6">Create project</h1>
      <p className="text-body text-ink-muted mb-6">
        Creates an Unassigned project. Follow-up owner is you. Intake from the dedicated intake address comes later.
      </p>
      <CreateProjectForm
        practiceAreas={areas.map((a) => ({ id: a.id, name: a.name }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      />
    </AuthenticatedShell>
  );
}
