// File: src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { StripeProvider } from "@/components/providers/StripeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Reduce session polling frequency to prevent excessive API calls
      refetchInterval={5 * 60} // 5 minutes instead of default 1 minute
      refetchOnWindowFocus={false} // Don't refetch when window gains focus
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <StripeProvider>
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
        </StripeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
