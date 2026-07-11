"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/overview", label: "Dashboard" }],
  },
  {
    label: "Money In",
    items: [
      { href: "/donors", label: "Donors" },
      { href: "/donations", label: "Donations" },
    ],
  },
  {
    label: "Money Out",
    items: [
      { href: "/recipients", label: "Recipients" },
      { href: "/distributions", label: "Distributions" },
    ],
  },
  {
    label: "Reports",
    items: [{ href: "/reports", label: "Reports & Export" }],
  },
];

const ADMIN_NAV = {
  label: "Admin",
  items: [{ href: "/users", label: "Users & Access" }],
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const groups = session?.user.role === "ADMIN" ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-card h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border font-bold text-lg tracking-tight">Hisab</div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label} className="mb-1">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {g.label}
            </p>
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-sm mx-1",
                  pathname.startsWith(item.href) && "text-foreground bg-accent font-medium",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <Link
          href="/profile"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {session?.user.name} · Profile
        </Link>
      </div>
    </aside>
  );
}
