// File: src/app/layout.tsx
import "./globals.css";
import { Metadata } from "next";
import { Jost } from "next/font/google";
import { cn } from "@/lib/utils";
import { PropertyCookieManager } from "@/components/PropertyCookieManager";
import Providers from "./providers";
import ThemeProviderWrapper from "./theme-provider-wrapper";
import AppShell from "@/components/AppShell";

// Configure Jost font with Next.js optimization
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
  display: "swap" // Ensures consistent font loading
});

export const metadata: Metadata = {
  title: "PMS App",
  description: "Property Management System"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn("bg-background text-foreground font-sans", jost.variable)}
      >
        <ThemeProviderWrapper>
          <Providers>
            {/* Property cookie manager */}
            <PropertyCookieManager />
            {/* App shell with header + sidebar */}
            <AppShell>{children}</AppShell>
          </Providers>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
