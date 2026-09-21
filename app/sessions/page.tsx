import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { EmptyState } from "@/modules/web-app/ui";
import { SessionRow } from "@/modules/web-app/session-row";
import { formatFirmStamp } from "@/modules/web-app/format";

export default async function SessionsPage() {
  const { kernel, person, sessionId } = await requirePageSession();
  const settings = await kernel.firmSettings.read();
  let rows;
  try {
    rows = await kernel.auth.listSessions(person);
  } catch {
    return (
      <AuthenticatedShell pathname="/sessions">
        <h1 className="font-serif text-page mb-6">Sessions</h1>
        <EmptyState>Sessions could not load. Try again.</EmptyState>
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell pathname="/sessions">
      <h1 className="font-serif text-page mb-6">Sessions</h1>
      {rows.length === 0 ? (
        <EmptyState>Only this session is active.</EmptyState>
      ) : (
        rows.map((row) => (
          <SessionRow
            key={row.id}
            sessionId={row.id}
            current={row.id === sessionId}
            started={formatFirmStamp(row.createdAt.toISOString(), settings.timezone)}
            idle={formatFirmStamp(row.idleExpiresAt.toISOString(), settings.timezone)}
            device={row.userAgent ?? ""}
            userName={person.displayName}
          />
        ))
      )}
    </AuthenticatedShell>
  );
}
