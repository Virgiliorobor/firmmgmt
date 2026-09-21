import type { ReactNode } from "react";
import type { UserRole } from "@/modules/db/ids";
import { RoleNav } from "./role-nav";
import { NetworkBanner } from "./ui";

export function AppShell({
  role,
  pathname,
  children,
}: {
  role: UserRole | null;
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <NetworkBanner />
      <div className="flex flex-col desktop:flex-row min-h-screen">
        {role ? <RoleNav role={role} pathname={pathname} /> : null}
        <main id="main" className="flex-1 px-5 desktop:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
