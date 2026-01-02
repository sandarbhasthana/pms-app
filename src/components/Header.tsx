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
import { Menu, X, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

// Org-level staff roles that can access sidebar navigation
const ORG_STAFF_ROLES = new Set(["FRONT_DESK", "PROPERTY_MGR", "ORG_ADMIN"]);

export function Header({ onToggleSidebar, sidebarOpen = false }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role as string | undefined;
  // Allow org staff roles to see sidebar toggle (for Teams access)
  const canSeeSidebarToggle = !!role && ORG_STAFF_ROLES.has(role);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Hamburger menu toggle - for all staff roles */}
        {canSeeSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className={cn("-ml-3 mr-1 md:mr-2 px-3 cursor-pointer")}
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
            // ✅ OPTIMIZED: Local image - Next.js will optimize automatically
            onError={(e) => {
              // Fallback to text if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent && !parent.querySelector(".logo-fallback")) {
                const fallback = document.createElement("span");
                fallback.className =
                  "logo-fallback text-heading-md font-semibold text-gray-800 dark:text-gray-100";
                fallback.textContent = "PMS App";
                parent.appendChild(fallback);
              }
            }}
          />
        </Link>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Property switcher - only for non-SUPER_ADMIN users */}
        {role !== "SUPER_ADMIN" && (
          <PropertySwitcher className="cursor-pointer" />
        )}
        {/* Reports icon - for org staff (not SUPER_ADMIN - org-specific) */}
        {role && ORG_STAFF_ROLES.has(role) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/reports")}
            className="relative p-3 rounded-full hover:bg-purple-300 dark:hover:bg-[#8b5cf6] transition-colors cursor-pointer"
            title="Reports"
          >
            <BarChart3 className="h-6 w-6 text-gray-800! dark:text-[#f0f8f9]! cursor-pointer" />
          </Button>
        )}
        {/* Unified notification bell - for org staff */}
        {role && ORG_STAFF_ROLES.has(role) && (
          <UnifiedNotificationBell className="cursor-pointer dark:hover:bg-[#8b5cf6]" />
        )}
        {/* User menu with avatar and account options */}
        <UserMenu />
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
