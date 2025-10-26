"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserIcon,
  PlusIcon,
  CreditCardIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { ViewTabNavigationProps, ViewBookingTab } from "./types";

const ViewTabNavigation: React.FC<ViewTabNavigationProps> = ({
  activeTab,
  setActiveTab
}) => {
  const tabConfig = {
    details: {
      id: "details" as ViewBookingTab,
      label: "Details",
      icon: UserIcon,
      description: "Guest & Booking Information"
    },
    addons: {
      id: "addons" as ViewBookingTab,
      label: "Add-ons",
      icon: PlusIcon,
      description: "Additional Services"
    },
    payment: {
      id: "payment" as ViewBookingTab,
      label: "Payment",
      icon: CreditCardIcon,
      description: "Payment Summary"
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ViewBookingTab)}
        >
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-0 overflow-hidden">
            {Object.values(tabConfig).map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              // Custom border radius based on position
              const getBorderRadius = () => {
                if (index === 0) return "rounded-l-md rounded-r-none"; // Details: left rounded, right square
                if (index === 2) return "rounded-r-md rounded-l-none"; // Payment: right rounded, left square
                return "rounded-none"; // Add-ons: no rounding
              };

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-all whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                    getBorderRadius(),
                    "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-purple-600",
                    "hover:bg-gray-50 dark:hover:bg-gray-700",
                    !isActive &&
                      "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex justify-end items-start">
        {/* Right side: Tabs and total */}
        <div className="flex flex-col items-end gap-3">
          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ViewBookingTab)}
          >
            <TabsList className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-0 overflow-hidden">
              {Object.values(tabConfig).map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                // Custom border radius based on position
                const getBorderRadius = () => {
                  if (index === 0) return "rounded-l-md rounded-r-none"; // Details: left rounded, right square
                  if (index === 2) return "rounded-r-md rounded-l-none"; // Payment: right rounded, left square
                  return "rounded-none"; // Add-ons: no rounding
                };

                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                      getBorderRadius(),
                      "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-purple-600",
                      "hover:bg-gray-50 dark:hover:bg-gray-700",
                      !isActive &&
                        "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ViewTabNavigation;
