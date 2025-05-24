// File: src/app/layout.tsx
import "./globals.css";
import { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { Toaster } from "react-hot-toast";
import { Header } from "@/components/Header";

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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Global toast container */}
          <Toaster position="bottom-right" />
          {/* App header */}
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
