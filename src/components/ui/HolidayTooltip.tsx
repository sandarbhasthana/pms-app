"use client";

import React, { useState, useRef, useEffect } from "react";

interface HolidayTooltipProps {
  holidayName: string;
  children: React.ReactNode;
}

export function HolidayTooltip({ holidayName, children }: HolidayTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setIsVisible(true);
    updatePosition();
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Position tooltip above the icon, centered
    setPosition({
      top: rect.top + scrollTop - 8, // 8px above the icon
      left: rect.left + scrollLeft + rect.width / 2, // Center horizontally
    });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-9999 pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-1.5 rounded-md text-xs font-medium shadow-lg whitespace-nowrap">
            {holidayName}
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

