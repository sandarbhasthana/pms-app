"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import { useTheme } from "next-themes";

// Configure NProgress
NProgress.configure({
  showSpinner: false, // Hide the spinner, only show the bar
  trickleSpeed: 200,
  minimum: 0.08,
  easing: "ease",
  speed: 400
});

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme } = useTheme();

  // Update NProgress color based on theme
  useEffect(() => {
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    const isDark = currentTheme === "dark";

    // Theme-aware colors - high contrast
    const progressColor = isDark ? "#a78bfa" : "#7c3aed"; // purple-400 (dark) / purple-600 (light)
    const shadowColor = isDark ? "rgba(167, 139, 250, 0.5)" : "rgba(124, 58, 237, 0.5)";

    // Inject custom styles for NProgress
    const style = document.createElement("style");
    style.id = "nprogress-theme";
    style.innerHTML = `
      #nprogress {
        pointer-events: none;
      }

      #nprogress .bar {
        background: ${progressColor};
        position: fixed;
        z-index: 99999;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        box-shadow: 0 0 10px ${shadowColor}, 0 0 5px ${shadowColor};
      }

      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px ${progressColor}, 0 0 5px ${progressColor};
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `;

    // Remove existing style if present
    const existingStyle = document.getElementById("nprogress-theme");
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new style
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [theme, resolvedTheme]);

  // Handle route changes
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // Start progress on mount
  useEffect(() => {
    const handleStart = () => NProgress.start();
    const handleComplete = () => NProgress.done();

    // Listen to Next.js router events (for client-side navigation)
    window.addEventListener("beforeunload", handleStart);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      handleComplete();
    };
  }, []);

  return null;
}

