"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PerformanceTestWrapperProps {
  children: React.ReactNode;
  testName: string;
}

const PerformanceTestWrapper: React.FC<PerformanceTestWrapperProps> = ({
  children,
  testName
}) => {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTimes, setRenderTimes] = useState<number[]>([]);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(Date.now());

  // Track renders using useRef to avoid infinite loops
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTimeRef.current;

  // Only update if this is actually a new render (not the same render cycle)
  if (renderCountRef.current === renderCount) {
    renderCountRef.current += 1;
    lastRenderTimeRef.current = currentTime;

    // Use a microtask to update state without causing immediate re-render
    Promise.resolve().then(() => {
      setRenderCount(renderCountRef.current);
      setRenderTimes((prev) => [...prev.slice(-9), timeSinceLastRender]); // Keep last 10 render times
    });

    console.log(
      `🔄 ${testName} - Render #${renderCountRef.current} (${timeSinceLastRender}ms since last)`
    );
  }

  const resetStats = () => {
    renderCountRef.current = 0;
    setRenderCount(0);
    setRenderTimes([]);
    startTimeRef.current = Date.now();
    console.log(`🔄 ${testName} - Stats reset`);
  };

  const averageRenderTime =
    renderTimes.length > 0
      ? Math.round(renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length)
      : 0;

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">
            🧪 Performance Test: {testName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Total Renders:
              </span>
              <div className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                {renderCount}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Avg Time:
              </span>
              <div className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                {averageRenderTime}ms
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Last Render:
              </span>
              <div className="font-mono text-lg font-bold text-purple-600 dark:text-purple-400">
                {renderTimes[renderTimes.length - 1] || 0}ms
              </div>
            </div>
          </div>

          {renderTimes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Recent render times:
              </span>
              <div className="flex gap-1 flex-wrap">
                {renderTimes.slice(-10).map((time, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      time < 16
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : time < 50
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {time}ms
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={resetStats}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Reset Stats
          </Button>
        </CardContent>
      </Card>

      {children}
    </div>
  );
};

export default PerformanceTestWrapper;
