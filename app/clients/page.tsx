import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/kernel/http";
import { AuthenticatedShell } from "@/app/authenticated-shell";
import { EmptyState } from "@/modules/web-app/ui";
import { CLIENT_CATEGORY_LABELS } from "@/modules/db/ids";

export default async function ClientListPage() {
  const { kernel, person } = await requirePageSession();
  if (person.role === "integration_operator") {
    notFound();
  }
  const clients = await kernel.clients.list(person);
  return (
    <AuthenticatedShell pathname="/clients">
      <h1 className="font-serif text-page mb-6">Clients</h1>
      {clients.length === 0 ? (
        <EmptyState>
          No clients yet. Clients appear when intake is matched.{" "}
          <Link href="/projects/new" className="quiet-button inline-flex">
            Create project
          </Link>
        </EmptyState>
      ) : (
        <table className="sticky-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Client category</th>
              <th>Practice area</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{CLIENT_CATEGORY_LABELS[client.client_category]}</td>
                <td>{client.practice_area}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AuthenticatedShell>
  );
}
