"use client";

import React, { useState } from "react";

export default function LegendBar() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode on mount
  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  // Reservation status legends with light and dark mode colors
  const statusLegends = [
    {
      label: "Confirmation Pending",
      description: "Awaiting confirmation",
      lightColor: "#ec4899",
      darkColor: "#db2777"
    },
    {
      label: "Confirmed",
      description: "Payment received",
      lightColor: "#9AB69B",
      darkColor: "#3b513b"
    },
    {
      label: "In-House",
      description: "Guest checked in",
      lightColor: "#22c55e",
      darkColor: "#10b981"
    },
    {
      label: "Checked Out",
      description: "Stay completed",
      lightColor: "#8b5cf6",
      darkColor: "#7c3aed"
    },
    {
      label: "No-Show",
      description: "Guest did not arrive",
      lightColor: "#f97316",
      darkColor: "#d97706"
    },
    {
      label: "Cancelled",
      description: "Reservation cancelled",
      lightColor: "#6b7280",
      darkColor: "#4b5563"
    }
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Reservation Status Legend
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statusLegends.map((item) => {
            const bgColor = isDarkMode ? item.darkColor : item.lightColor;
            const textColor = isDarkMode ? "#f0f8ff" : "#1e1e1e";

            return (
              <div
                key={item.label}
                className="p-4 rounded-lg transition-transform hover:scale-105"
                style={{
                  backgroundColor: bgColor,
                  color: textColor
                }}
              >
                <div className="font-semibold text-base">{item.label}</div>
                <div className="text-sm opacity-90 mt-1">
                  {item.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Theme indicator */}
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        Showing colors for{" "}
        <span className="font-semibold">{isDarkMode ? "Dark" : "Light"}</span>{" "}
        theme
      </div>
    </div>
  );
}
