// File: src/components/Header.tsx
"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 shadow-sm">
      {/* Logo / Brand */}
      <Link
        href="/"
        className="text-xl font-semibold text-gray-800 dark:text-gray-100"
      >
        PMS App
      </Link>

      {/* Right-side controls */}
      <div className="flex items-center space-x-4">
        {/* User menu with avatar and account options */}
        <UserMenu />
        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
