import type { ReactNode } from "react";
import { requirePageSession } from "@/kernel/http";
import { AppShell } from "@/modules/web-app/app-shell";

export async function AuthenticatedShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const { person } = await requirePageSession();
  return (
    <AppShell role={person.role} pathname={pathname}>
      {children}
    </AppShell>
  );
}
