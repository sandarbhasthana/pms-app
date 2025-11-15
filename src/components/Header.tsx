// File: src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { PropertySwitcher } from "@/components/PropertySwitcher";
import { UnifiedNotificationBell } from "@/components/notifications/UnifiedNotificationBell";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const PM_OR_ABOVE = new Set([
  "PROPERTY_MGR",
  "ORG_ADMIN",
  "SUPER_ADMIN",
  "FRONT_DESK",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "SECURITY",
  "GUEST_SERVICES",
  "ACCOUNTANT",
  "IT_SUPPORT"
]);
const ALL_STAFF_ROLES = new Set([
  "FRONT_DESK",
  "PROPERTY_MGR",
  "ORG_ADMIN",
  "SUPER_ADMIN"
]);

export function Header({ onToggleSidebar, sidebarOpen = false }: HeaderProps) {
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  // Allow all staff roles to see sidebar toggle (for Teams access)
  const canSeeSidebarToggle = !!role && ALL_STAFF_ROLES.has(role);

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Hamburger menu toggle - for all staff roles */}
        {canSeeSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className={cn("ml-[-0.75rem] mr-1 md:mr-2 px-3")}
            title={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <Image
            src="/logo.webp"
            alt="PMS App"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
          {/* Text logo fallback - commented out */}
          {/* <span className="text-heading-md font-semibold text-gray-800 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            PMS App
          </span> */}
        </Link>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Property switcher - only for non-SUPER_ADMIN users */}
        {role !== "SUPER_ADMIN" && <PropertySwitcher />}
        {/* Unified notification bell - for PROPERTY_MGR and above */}
        {role && PM_OR_ABOVE.has(role) && <UnifiedNotificationBell />}
        {/* User menu with avatar and account options */}
        <UserMenu />
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
