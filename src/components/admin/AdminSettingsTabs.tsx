"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// All admin tabs with role restrictions
const adminTabs = [
  {
    label: "Profile Settings",
    href: "/admin/settings/profile",
    allowedRoles: ["SUPER_ADMIN", "ORG_ADMIN"] // All admins
  },
  {
    label: "Select Organization",
    href: "/admin/settings/organization",
    allowedRoles: ["SUPER_ADMIN", "ORG_ADMIN"] // All admins
  },
  {
    label: "Properties",
    href: "/admin/settings/properties",
    allowedRoles: ["ORG_ADMIN"] // ORG_ADMIN only (org-specific)
  },
  {
    label: "User Assignments",
    href: "/admin/settings/user-properties",
    allowedRoles: ["ORG_ADMIN"] // ORG_ADMIN only (org-specific)
  },
  {
    label: "Property Settings",
    href: "/settings/general",
    allowedRoles: ["ORG_ADMIN"] // ORG_ADMIN only (property-specific)
  }
];

export default function AdminSettingsTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Filter tabs based on user role
  const visibleTabs = adminTabs.filter(
    (tab) => userRole && tab.allowedRoles.includes(userRole)
  );

  return (
    <div className="border-b border-purple-600 dark:border-purple-600 mb-6">
      <nav className="flex flex-wrap gap-4 text-lg font-medium text-gray-600 dark:text-gray-300">
        {visibleTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "whitespace-nowrap py-4 px-4 border-b-2 font-medium text-lg transition-all duration-200",
                isActive
                  ? "border-purple-600 bg-purple-600 text-white rounded-t-lg"
                  : "border-transparent hover:bg-purple-600/10 dark:hover:bg-purple-600/20 hover:border-purple-600",
                !isActive && "text-purple-600 dark:text-purple-400"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
