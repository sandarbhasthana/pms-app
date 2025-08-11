// File: src/components/AppShell.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header stays at top */}
      <Header onToggleSidebar={() => setCollapsed((c) => !c)} sidebarCollapsed={collapsed} />

      <div className="flex flex-1">
        {/* Left Sidebar for PM and above */}
        <Sidebar collapsed={collapsed} />

        {/* Main content area */}
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}

