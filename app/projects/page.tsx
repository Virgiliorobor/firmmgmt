import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { EmptyState, UnassignedMark } from "@/modules/web-app/ui";
import { formatFirmStamp } from "@/modules/web-app/format";
import { isManagementRole } from "@/modules/db/ids";

export default async function ProjectListPage() {
  const { kernel, person } = await requirePageSession();
  if (person.role === "integration_operator") {
    notFound();
  }
  const settings = await kernel.firmSettings.read();
  let projects;
  try {
    projects = await kernel.projects.list(person);
  } catch {
    return (
      <AuthenticatedShell pathname="/projects">
        <h1 className="font-serif text-page mb-6">Projects</h1>
        <EmptyState>Projects could not load. Try again.</EmptyState>
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell pathname="/projects">
      <h1 className="font-serif text-page mb-2">Projects</h1>
      <p className="text-caption text-ink-faint mb-6">
        Permanent full list. Home does not replace this list. Timezone {settings.timezone}.
      </p>
      {isManagementRole(person.role) ? (
        <p className="mb-6">
          <Link href="/projects/new" className="primary-button inline-flex items-center">
            Create project
          </Link>
        </p>
      ) : null}
      {projects.length === 0 ? (
        <EmptyState>No projects match these filters. Forwarded work appears after intake.</EmptyState>
      ) : (
        <table className="sticky-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Project</th>
              <th>Ownership</th>
              <th className="text-right">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.client_name}</td>
                <td>
                  <Link href={`/projects/${project.id}`}>{project.title}</Link>
                </td>
                <td>{project.ownership === "Unassigned" ? <UnassignedMark /> : "Assigned"}</td>
                <td className="text-right tabular">{formatFirmStamp(project.created_at, settings.timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AuthenticatedShell>
  );
}
