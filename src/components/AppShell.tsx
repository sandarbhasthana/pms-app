// File: src/components/AppShell.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status } = useSession();
  const pathname = usePathname();

  // Don't show header/sidebar for unauthenticated users or on landing page
  const showNavigation = status === "authenticated" && pathname !== "/";

  if (!showNavigation) {
    // Clean layout for landing page and unauthenticated users
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header stays at top */}
      <Header
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        sidebarOpen={sidebarOpen}
      />

      {/* Hamburger menu sidebar overlay */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area - now takes full width */}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
