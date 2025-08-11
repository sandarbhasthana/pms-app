// File: src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarProps {
  collapsed?: boolean;
}

const PM_OR_ABOVE = new Set(["PROPERTY_MGR", "ORG_ADMIN", "SUPER_ADMIN"]);

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Hide completely if not authenticated or role is below Property Manager
  if (status !== "authenticated" || !session?.user?.role) return null;
  const role = session.user.role as string;
  if (!PM_OR_ABOVE.has(role)) return null;

  const nav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Reservations", href: "/reservations", icon: CalendarDays },
    // Calendar maps to Dashboard/bookings
    { label: "Calendar", href: "/dashboard/bookings", icon: Calendar },
    { label: "Settings", href: "/settings/general", icon: SettingsIcon }
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-white dark:bg-gray-900 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <nav className="flex-1 p-2 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname.startsWith("/dashboard/")
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                active && "bg-gray-100 dark:bg-gray-800 font-medium",
                collapsed && "justify-center"
              )}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer area: Theme toggle */}
      <div className={cn("p-2 border-t", collapsed ? "flex justify-center" : "px-2")}
      >
        {/* Keep ThemeToggle small in sidebar */}
        <div className={cn("flex items-center", collapsed ? "" : "space-x-2")}
        >
          <ThemeToggle />
          {!collapsed && <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>}
        </div>
      </div>
    </aside>
  );
}

