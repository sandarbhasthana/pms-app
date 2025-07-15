// File: src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {/* Global toast container - using Sonner with progress bar */}
        <Toaster
          position="bottom-right"
          duration={4000}
          visibleToasts={5}
          closeButton
          richColors
          expand={false}
          toastOptions={{
            style: {
              background: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)"
            },
            className: "toast-with-progress"
          }}
        />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
