// File: src/components/Header.tsx
"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { PropertySwitcher } from "@/components/PropertySwitcher";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const PM_OR_ABOVE = new Set(["PROPERTY_MGR", "ORG_ADMIN", "SUPER_ADMIN"]);

export function Header({ onToggleSidebar, sidebarOpen = false }: HeaderProps) {
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const canSeeSidebarToggle = !!role && PM_OR_ABOVE.has(role);

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Hamburger menu toggle - only for PM and above */}
        {canSeeSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className={cn("mr-1 md:mr-2")}
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
          className="text-heading-md font-semibold text-gray-800 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          PMS App
        </Link>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Property switcher */}
        <PropertySwitcher />
        {/* User menu with avatar and account options */}
        <UserMenu />
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
