import Link from "next/link";
import type { UserRole } from "@/modules/db/ids";
import { isManagementRole } from "@/modules/db/ids";

type NavItem = { href: string; label: string };

function itemsFor(role: UserRole): NavItem[] {
  if (role === "integration_operator") {
    return [
      { href: "/", label: "Home" },
      { href: "/sessions", label: "Sessions" },
    ];
  }
  if (isManagementRole(role)) {
    return [
      { href: "/", label: "Home" },
      { href: "/unassigned", label: "Unassigned" },
      { href: "/projects", label: "Projects" },
      { href: "/clients", label: "Clients" },
      { href: "/intake", label: "Intake" },
    ];
  }
  return [
    { href: "/", label: "Home" },
    { href: "/unassigned", label: "Unassigned" },
    { href: "/projects", label: "Projects" },
    { href: "/intake", label: "Intake" },
  ];
}

export function RoleNav({ role, pathname }: { role: UserRole; pathname: string }) {
  const items = itemsFor(role);
  return (
    <nav aria-label="Primary" className="role-nav flex desktop:flex-col gap-1 p-3 min-w-[14rem]">
      <p className="font-serif text-wordmark px-3 py-3">Law firm management</p>
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className="flex items-center min-h-12 px-5 text-body text-ink"
          >
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col">
        <Link href="/sessions" className="flex items-center min-h-12 px-5 quiet-button">
          Sessions
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="quiet-button w-full text-left px-5">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
