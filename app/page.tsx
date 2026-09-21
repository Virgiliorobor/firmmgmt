import Link from "next/link";
import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { CopyIntakeAddress, EmptyState, UnassignedMark } from "@/modules/web-app/ui";
import { isManagementRole } from "@/modules/db/ids";
import { formatFirmStamp } from "@/modules/web-app/format";

export default async function HomePage() {
  const { kernel, person } = await requirePageSession();
  const settings = await kernel.firmSettings.read();

  if (person.role === "integration_operator") {
    return (
      <AuthenticatedShell pathname="/">
        <h1 className="font-serif text-page mb-6">Connection health</h1>
        <EmptyState>
          Mailbox check is healthy. No failed operations. Microsoft Graph is not connected in this local version.
        </EmptyState>
      </AuthenticatedShell>
    );
  }

  if (!isManagementRole(person.role)) {
    return (
      <AuthenticatedShell pathname="/">
        <h1 className="font-serif text-page mb-6">Your work</h1>
        <CopyIntakeAddress address={settings.dedicatedIntakeAddress} />
        <EmptyState>
          No work assigned to you. Unassigned projects you can claim appear on Unassigned. Forward client email from
          Outlook when new work arrives.
        </EmptyState>
      </AuthenticatedShell>
    );
  }

  const projects = await kernel.projects.list(person);
  const unassigned = projects.filter((p) => p.ownership === "Unassigned");

  return (
    <AuthenticatedShell pathname="/">
      <h1 className="font-serif text-page mb-2">Partner home</h1>
      <p className="text-caption text-ink-faint mb-8">
        Attention inbox. The full list is always on Projects. Dates use {settings.timezone}.
      </p>
      <CopyIntakeAddress address={settings.dedicatedIntakeAddress} />

      <section className="region-block mt-8">
        <h2>Needs you now</h2>
      </section>
      <section className="region-block mt-8">
        <h2>Unassigned</h2>
        {unassigned.length === 0 ? null : (
          <div>
            {unassigned.map((project) => (
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
      </section>
      <section className="region-block mt-8">
        <h2>Coming deadlines</h2>
      </section>
      <section className="region-block mt-8">
        <h2>New intake</h2>
      </section>
      <section className="region-block mt-8">
        <h2>Ownership</h2>
      </section>

      {unassigned.length === 0 && projects.length === 0 ? (
        <EmptyState>
          Nothing needs you now. Unassigned work will appear here after intake.{" "}
          <Link href="/projects/new" className="quiet-button inline-flex">
            Create project
          </Link>{" "}
          <Link href="/projects" className="quiet-button inline-flex">
            Open Projects
          </Link>
        </EmptyState>
      ) : (
        <p className="mt-8">
          <Link href="/projects" className="quiet-button inline-flex">
            Open Projects
          </Link>
          <Link href="/projects/new" className="quiet-button inline-flex">
            Create project
          </Link>
        </p>
      )}
    </AuthenticatedShell>
  );
}
