"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, FormField, PrimaryButton } from "@/modules/web-app/ui";
import { CLIENT_CATEGORY_LABELS, type ClientCategory } from "@/modules/db/ids";

type PracticeAreaOption = { id: string; name: string };
type ClientOption = { id: string; name: string };

export function CreateProjectForm({
  practiceAreas,
  clients,
}: {
  practiceAreas: PracticeAreaOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [newClient, setNewClient] = useState(clients.length === 0);
  const [clientName, setClientName] = useState("");
  const [category, setCategory] = useState<ClientCategory>("standard");
  const [practiceAreaId, setPracticeAreaId] = useState(practiceAreas[0]?.id ?? "");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      let selectedClientId = clientId;
      if (newClient) {
        const created = await fetch("/api/clients", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: clientName,
            client_category: category,
            practice_area_id: practiceAreaId,
            domain: domain || undefined,
          }),
        });
        const body = (await created.json()) as { error?: string; id?: string };
        if (!created.ok || !body.id) {
          setError(body.error ?? "Client could not be created. Try again.");
          return;
        }
        selectedClientId = body.id;
      }
      const project = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, client_id: selectedClientId }),
      });
      const projectBody = (await project.json()) as { error?: string; id?: string };
      if (!project.ok || !projectBody.id) {
        setError(projectBody.error ?? "Project could not be created. Try again.");
        return;
      }
      router.push(`/projects/${projectBody.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-lg">
      {error ? <Banner kind="error" title={error} /> : null}
      <FormField label="Project title" htmlFor="title" required>
        <input
          id="title"
          required
          className="text-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </FormField>
      <label className="flex items-center gap-2 min-h-12">
        <input
          type="checkbox"
          checked={newClient}
          onChange={(e) => setNewClient(e.target.checked)}
          className="accent-accent"
        />
        New client
      </label>
      {newClient ? (
        <>
          <FormField label="Client name" htmlFor="client-name" required>
            <input
              id="client-name"
              required
              className="text-field"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </FormField>
          <FormField label="Client category" htmlFor="category" required>
            <select
              id="category"
              className="select-field"
              value={category}
              onChange={(e) => setCategory(e.target.value as ClientCategory)}
            >
              {(Object.keys(CLIENT_CATEGORY_LABELS) as ClientCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CLIENT_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Practice area" htmlFor="practice-area" required>
            <select
              id="practice-area"
              className="select-field"
              value={practiceAreaId}
              onChange={(e) => setPracticeAreaId(e.target.value)}
            >
              {practiceAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Domain" htmlFor="domain" hint="Optional">
            <input id="domain" className="text-field" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </FormField>
        </>
      ) : (
        <FormField label="Client" htmlFor="client" required>
          <select
            id="client"
            className="select-field"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating project" : "Create project"}
      </PrimaryButton>
    </form>
  );
}
