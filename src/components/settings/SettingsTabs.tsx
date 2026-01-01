"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimpleThrottledCallback } from "@/hooks/use-debounce";

const tabs = [
  { label: "Property Settings", href: "/settings/general" },
  { label: "Accommodations", href: "/settings/accommodations" },
  { label: "Staff Management", href: "/settings/staff" },
  { label: "Policies & Taxes", href: "/settings/policies" },
  { label: "Channel Managers", href: "/settings/channels" },
  { label: "Pricing & Rates", href: "/settings/rates" },
  { label: "Business Rules", href: "/settings/business-rules" },
  { label: "Import Reservations", href: "/settings/import" }
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Filter tabs based on user role
  const getVisibleTabs = () => {
    const userRole = session?.user?.role;

    // Staff Management and Channel Managers are only visible to SUPER_ADMIN, ORG_ADMIN, and PROPERTY_MGR
    const hasManagerAccess =
      userRole &&
      ["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole);

    return tabs.filter((tab) => {
      if (tab.href === "/settings/staff" || tab.href === "/settings/channels") {
        return hasManagerAccess;
      }
      return true; // Show all other tabs
    });
  };

  const visibleTabs = getVisibleTabs();

  // Check scroll position and update arrow visibility
  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;

      const hasOverflow = scrollWidth > clientWidth;
      setCanScrollLeft(hasOverflow && scrollLeft > 5);
      setCanScrollRight(
        hasOverflow && scrollLeft < scrollWidth - clientWidth - 5
      );
    }
  }, []);

  // ✅ PERFORMANCE: Throttle scroll handler to max once per 100ms
  const throttledCheckScrollPosition = useSimpleThrottledCallback(
    checkScrollPosition,
    100
  );

  // ✅ PERFORMANCE: Throttle resize handler to max once per 150ms
  const throttledHandleResize = useSimpleThrottledCallback(
    checkScrollPosition,
    150
  );

  // Scroll functions
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  }, []);

  // Check scroll position on mount and when tabs change
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollPosition();
    }, 100); // Small delay to ensure DOM is ready

    window.addEventListener("resize", throttledHandleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", throttledHandleResize);
    };
  }, [visibleTabs, checkScrollPosition, throttledHandleResize]);

  // Also check on scroll (throttled)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", throttledCheckScrollPosition);
      return () =>
        container.removeEventListener("scroll", throttledCheckScrollPosition);
    }
  }, [throttledCheckScrollPosition]);

  return (
    <div className="relative mb-6">
      {/* Left scroll arrow */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
          <div className="bg-linear-to-r from-white dark:from-gray-900 to-transparent w-12 h-full flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollLeft}
              className="h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Right scroll arrow */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
          <div className="bg-linear-to-l from-white dark:from-gray-900 to-transparent w-12 h-full flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollRight}
              className="h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <nav className="flex gap-2 py-2 px-2" style={{ width: "max-content" }}>
          {visibleTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={
                  isActive
                    ? "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 border-transparent shadow-md text-white"
                    : "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 bg-transparent border-purple-600 dark:border-purple-600 hover:bg-purple-600/10 dark:hover:bg-purple-600/20 text-purple-600 dark:text-purple-400"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Hide scrollbar with CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
