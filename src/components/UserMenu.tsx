// File: src/components/UserMenu.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession({
    required: false
  });

  // Don't render anything if not authenticated or still loading
  if (status === "loading") {
    return (
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const user = session.user;
  const displayName = user.name || user.email?.split("@")[0] || "User";
  const userRole = user.role || "User";

  // Check if user has access to settings (Admins and Property Managers)
  const hasSettingsAccess =
    userRole === "ORG_ADMIN" || userRole === "PROPERTY_MGR";

  // Check if user has access to admin settings (Only Admins and Super Admins)
  const hasAdminSettingsAccess =
    userRole === "ORG_ADMIN" || userRole === "SUPER_ADMIN";

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <div className="flex items-center space-x-3">
      {/* User name - hidden on mobile */}
      <div className="hidden md:block text-right">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {displayName}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {userRole.toLowerCase().replace("_", " ")}
        </div>
      </div>

      {/* User menu dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Avatar
              email={user.email}
              name={user.name}
              src={user.image}
              size="md"
              className="border border-solid border-[#7210A2] dark:border-[#B23CEC]"
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* My Profile */}
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-3 h-4 w-4" />
              My Profile
            </Link>
          </DropdownMenuItem>

          {/* Admin Settings - Only for Admins and Super Admins */}
          {hasAdminSettingsAccess && (
            <DropdownMenuItem asChild>
              <Link href="/admin/settings/profile" className="cursor-pointer">
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          )}

          {/* Property Settings - Only for Property Managers (non-admin) */}
          {hasSettingsAccess && !hasAdminSettingsAccess && (
            <DropdownMenuItem asChild>
              <Link href="/settings/general" className="cursor-pointer">
                <Settings className="mr-3 h-4 w-4" />
                Property Settings
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
