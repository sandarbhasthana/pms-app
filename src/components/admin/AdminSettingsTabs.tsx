"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const adminTabs = [
  { label: "Profile Settings", href: "/admin/settings/profile" },
  { label: "Select Organization", href: "/admin/settings/organization" },
  { label: "Properties", href: "/admin/settings/properties" },
  { label: "User Assignments", href: "/admin/settings/user-properties" },
  { label: "Property Settings", href: "/settings/general" }
];

export default function AdminSettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-300 dark:border-gray-700 mb-6">
      <nav className="flex flex-wrap gap-4 text-lg font-medium text-gray-600 dark:text-gray-300">
        {adminTabs.map((tab) => {
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
