import { notFound } from "next/navigation";
import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { EmptyState, UnassignedMark } from "@/modules/web-app/ui";
import { formatFirmStamp } from "@/modules/web-app/format";
import { ProjectError } from "@/modules/project";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { kernel, person } = await requirePageSession();
  if (person.role === "integration_operator") {
    notFound();
  }
  const settings = await kernel.firmSettings.read();
  try {
    const project = await kernel.projects.get(person, id);
    return (
      <AuthenticatedShell pathname={`/projects/${id}`}>
        <header className="mail-row mb-8">
          <p className="text-caption text-ink-muted">{project.client_name}</p>
          <h1 className="font-serif text-page">{project.title}</h1>
          <p className="mt-2">{project.ownership === "Unassigned" ? <UnassignedMark /> : "Assigned"}</p>
          <p className="text-caption text-ink-faint tabular mt-2">
            {formatFirmStamp(project.created_at, settings.timezone)}
          </p>
        </header>
        <section className="region-block">
          <h2>Deadline classification</h2>
          <EmptyState>Not classified. Deadline classification is not No deadline.</EmptyState>
        </section>
        <section className="region-block mt-8">
          <h2>Developments</h2>
          <EmptyState>No development yet. Filing is Pending.</EmptyState>
        </section>
        <p className="text-caption text-ink-faint mt-8">
          SharePoint holds the file. This application records filing status.
        </p>
      </AuthenticatedShell>
    );
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) {
      notFound();
    }
    return (
      <AuthenticatedShell pathname={`/projects/${id}`}>
        <h1 className="font-serif text-page">Project</h1>
        <EmptyState>This project could not load. Try again.</EmptyState>
      </AuthenticatedShell>
    );
  }
}
