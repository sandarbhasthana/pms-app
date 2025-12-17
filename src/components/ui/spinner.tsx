"use client";

import * as React from "react";
import { ScaleLoader } from "react-spinners";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "default" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "destructive";
  className?: string;
}

function Spinner({
  size = "default",
  variant = "primary",
  className
}: SpinnerProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div
        className={cn("inline-block", className)}
        style={{ width: 35, height: 35 }}
      />
    );
  }

  // Determine the current theme
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";

  // Size mapping for ScaleLoader
  const sizeMap = {
    sm: { height: 20, width: 3 },
    default: { height: 30, width: 4 },
    lg: { height: 35, width: 4 },
    xl: { height: 45, width: 5 }
  };

  // Variant color mapping (theme-aware)
  const getColor = () => {
    switch (variant) {
      case "primary":
        return isDark ? "#a78bfa" : "#7c3aed"; // purple-400 / purple-600
      case "secondary":
        return isDark ? "#94a3b8" : "#64748b"; // slate-400 / slate-600
      case "destructive":
        return isDark ? "#f87171" : "#dc2626"; // red-400 / red-600
      case "default":
      default:
        return isDark ? "#9ca3af" : "#6b7280"; // gray-400 / gray-600
    }
  };

  const { height, width } = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <ScaleLoader
        color={getColor()}
        height={height}
        width={width}
        radius={2}
        margin={2}
        loading={true}
      />
    </div>
  );
}

interface LoadingSpinnerProps extends SpinnerProps {
  text?: string;
  center?: boolean;
  fullScreen?: boolean;
}

function LoadingSpinner({
  text = "Loading...",
  center = true,
  fullScreen = false,
  size = "lg",
  variant = "primary",
  className
}: LoadingSpinnerProps) {
  const containerClasses = cn(
    "flex flex-col items-center gap-3",
    {
      "justify-center": center,
      "min-h-[200px]": !fullScreen && center,
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 justify-center":
        fullScreen
    },
    className
  );

  return (
    <div className={containerClasses}>
      <Spinner size={size} variant={variant} />
      {text && (
        <span className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}

// Enterprise-level skeleton loader for tables/lists
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 border rounded-lg"
        >
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// Card skeleton for grid layouts
function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4">
          <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Spinner, LoadingSpinner, TableSkeleton, CardSkeleton };
