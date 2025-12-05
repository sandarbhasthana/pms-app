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
  Settings as SettingsIcon,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useChat } from "@/contexts/ChatContext";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const PM_OR_ABOVE = new Set(["PROPERTY_MGR", "ORG_ADMIN", "SUPER_ADMIN"]);
const ALL_STAFF_ROLES = new Set([
  "FRONT_DESK",
  "PROPERTY_MGR",
  "ORG_ADMIN",
  "SUPER_ADMIN"
]);

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { totalUnreadCount } = useChat();

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

  // Hide completely if not authenticated
  if (status !== "authenticated" || !session?.user?.role) return null;
  const role = session.user.role as string;

  // Navigation items
  const nav = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      allowedRoles: ALL_STAFF_ROLES // All staff can access
    },
    {
      label: "Reservations",
      href: "/reservations",
      icon: CalendarDays,
      allowedRoles: ALL_STAFF_ROLES // All staff can access
    },
    // Calendar maps to Dashboard/bookings
    {
      label: "Calendar",
      href: "/dashboard/bookings",
      icon: Calendar,
      allowedRoles: ALL_STAFF_ROLES // All staff can access
    },
    {
      label: "Teams",
      href: "/dashboard/chat",
      icon: MessageSquare,
      badge: totalUnreadCount,
      allowedRoles: ALL_STAFF_ROLES // All staff can access
    },
    {
      label: "Settings",
      href: "/settings/general",
      icon: SettingsIcon,
      allowedRoles: PM_OR_ABOVE // Only managers and above
    }
    // Development test page - remove in production
    // ...(process.env.NODE_ENV === "development"
    //   ? [{ label: "🧪 Test Stripe", href: "/test-stripe", icon: SettingsIcon }]
    //   : [])
  ].filter((item) => item.allowedRoles.has(role));

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
          "fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-white dark:bg-gray-900 border-r border-border shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
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
                    pathname !== "/dashboard/bookings" &&
                    pathname !== "/dashboard/chat")
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition-colors",
                  active
                    ? "bg-purple-lightest dark:bg-purple-darker/20 font-medium text-purple-primary dark:text-purple-light hover:bg-purple-lightest dark:hover:bg-purple-darker/20"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                onClick={onClose} // Close sidebar when navigation item is clicked
              >
                <div className="flex items-center">
                  <Icon
                    className={cn("h-5 w-5", active && "sidebar-active-icon")}
                  />
                  <span
                    className={cn("ml-3", active && "sidebar-active-label")}
                  >
                    {item.label}
                  </span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer area: Theme toggle */}
        <div className="p-2 border-t border-border">
          {/* Keep ThemeToggle small in sidebar */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Theme</span>
          </div>
        </div>
      </aside>
    </>
  );
}
