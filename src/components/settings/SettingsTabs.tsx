"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Property Settings", href: "/settings/general" },
  { label: "Accommodations", href: "/settings/accommodations" },
  { label: "Staff Management", href: "/settings/staff" },
  { label: "Policies & Taxes", href: "/settings/policies" },
  { label: "Channel Managers", href: "/settings/channels" },
  { label: "Pricing & Rates", href: "/settings/rates" },
  { label: "Import Reservations", href: "/settings/import" }
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Filter tabs based on user role
  const getVisibleTabs = () => {
    const userRole = session?.user?.role;

    // Staff Management is only visible to SUPER_ADMIN, ORG_ADMIN, and PROPERTY_MGR
    const hasStaffAccess =
      userRole &&
      ["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole);

    return tabs.filter((tab) => {
      if (tab.href === "/settings/staff") {
        return hasStaffAccess;
      }
      return true; // Show all other tabs
    });
  };

  const visibleTabs = getVisibleTabs();

  return (
    <div className="border-b border-gray-300 dark:border-gray-700 mb-6">
      <nav className="flex flex-wrap gap-4 text-lg font-medium text-gray-600 dark:text-gray-300">
        {visibleTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "whitespace-nowrap py-4 px-4 border-b-2 font-medium text-lg",
                isActive
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
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
