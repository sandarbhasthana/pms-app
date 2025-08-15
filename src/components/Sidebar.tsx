// File: src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const PM_OR_ABOVE = new Set(["PROPERTY_MGR", "ORG_ADMIN", "SUPER_ADMIN"]);

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && onClose) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

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
    <>
      {/* Backdrop overlay */}
      {open && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar overlay */}
      <aside
        className={cn(
          "fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-white dark:bg-gray-900 border-r shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard" ||
                  (pathname.startsWith("/dashboard/") &&
                    pathname !== "/dashboard/bookings")
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                  active && "bg-gray-100 dark:bg-gray-800 font-medium"
                )}
                onClick={onClose} // Close sidebar when navigation item is clicked
              >
                <Icon className="h-5 w-5" />
                <span className="ml-3">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer area: Theme toggle */}
        <div className="p-2 border-t px-2">
          {/* Keep ThemeToggle small in sidebar */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Theme
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
