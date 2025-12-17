"use client";

import { useGlobalLoader } from "@/contexts/LoadingContext";
import { ScaleLoader } from "react-spinners";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function GlobalLoader() {
  const { isLoading, loadingText } = useGlobalLoader();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoading || !mounted) return null;

  // Determine the current theme (light or dark)
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";

  // Theme-aware colors
  const loaderColor = isDark ? "#a78bfa" : "#7c3aed"; // purple-400 (dark) / purple-600 (light)

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-9999 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <ScaleLoader
          color={loaderColor}
          height={35}
          width={4}
          radius={2}
          margin={2}
          loading={isLoading}
        />
        {loadingText && (
          <p className="text-sm font-medium text-foreground animate-pulse">
            {loadingText}
          </p>
        )}
      </div>
    </div>
  );
}

