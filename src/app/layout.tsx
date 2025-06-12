// File: src/app/layout.tsx
import "./globals.css";
import { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Header";
import Providers from "./providers";

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
      <body className={cn("bg-background text-foreground")}>
        <Providers>
          {/* App header */}
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
