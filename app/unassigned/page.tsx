import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { CopyIntakeAddress, EmptyState, UnassignedMark } from "@/modules/web-app/ui";
import { formatFirmStamp } from "@/modules/web-app/format";

export default async function UnassignedPage() {
  const { kernel, person } = await requirePageSession();
  if (person.role === "integration_operator") {
    notFound();
  }
  const settings = await kernel.firmSettings.read();
  const projects = (await kernel.projects.list(person)).filter((p) => p.ownership === "Unassigned");
  return (
    <AuthenticatedShell pathname="/unassigned">
      <h1 className="font-serif text-page mb-2">Unassigned</h1>
      <p className="text-caption text-ink-faint mb-6">Timezone {settings.timezone}.</p>
      <CopyIntakeAddress address={settings.dedicatedIntakeAddress} />
      {projects.length === 0 ? (
        <EmptyState>
          No Unassigned projects. Forwarded work appears here for current authenticated staff.
        </EmptyState>
      ) : (
        <div className="mt-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="mail-row block">
              <span className="font-medium">{project.client_name}</span>
              <span className="mx-2">{project.title}</span>
              <UnassignedMark />
              <p className="text-caption text-ink-faint tabular">
                {formatFirmStamp(project.created_at, settings.timezone)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AuthenticatedShell>
  );
}
