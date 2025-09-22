"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserIcon,
  PlusIcon,
  CreditCardIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { BookingTab, TabNavigationProps } from "./types";
import { CustomerSearchDropdown } from "../CustomerSearchDropdown";
import {
  useCustomerSearch,
  CustomerSearchResult
} from "@/hooks/useCustomerSearch";

const tabConfig = {
  details: {
    id: "details" as BookingTab,
    label: "Details",
    icon: UserIcon,
    description: "Guest information"
  },
  addons: {
    id: "addons" as BookingTab,
    label: "Add-ons",
    icon: PlusIcon,
    description: "Extra services"
  },
  payment: {
    id: "payment" as BookingTab,
    label: "Payment",
    icon: CreditCardIcon,
    description: "Payment & summary"
  }
};

export const BookingTabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab,
  completedTabs,
  formData,
  onCustomerSelect
}) => {
  // Customer search functionality
  const handleCustomerSelect = React.useCallback(
    (customer: CustomerSearchResult) => {
      if (onCustomerSelect) {
        onCustomerSelect({
          guestName: customer.guestName,
          email: customer.email,
          phone: customer.phone,
          idNumber: customer.idNumber,
          idType: customer.idType,
          issuingCountry: customer.issuingCountry
        });
      }
    },
    [onCustomerSelect]
  );

  const customerSearch = useCustomerSearch({
    onCustomerSelect: handleCustomerSelect,
    debounceMs: 500,
    minQueryLength: 3
  });

  const isTabCompleted = (tab: BookingTab): boolean => {
    return completedTabs.has(tab);
  };

  const isTabAccessible = (tab: BookingTab): boolean => {
    // Details tab is always accessible
    if (tab === "details") return true;

    // Add-ons tab is accessible if details are filled
    if (tab === "addons") {
      return formData.fullName.trim() !== "" && formData.email.trim() !== "";
    }

    // Payment tab is accessible if details are filled (add-ons are optional)
    if (tab === "payment") {
      return formData.fullName.trim() !== "" && formData.email.trim() !== "";
    }

    return false;
  };

  return (
    <div className="mb-6">
      {/* Mobile: Header above tabs */}
      <div className="block md:hidden mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Booking Information
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
          Complete all sections to finalize your reservation
        </p>

        {/* Customer Search - Mobile */}
        <CustomerSearchDropdown
          query={customerSearch.query}
          onQueryChange={customerSearch.setQuery}
          results={customerSearch.results}
          isLoading={customerSearch.isLoading}
          isOpen={customerSearch.isOpen}
          onClose={() => customerSearch.setIsOpen(false)}
          onSelectCustomer={customerSearch.selectCustomer}
          placeholder="Search Customer's Name, Email or Phone..."
        />
      </div>

      {/* Desktop: Header with Search and Tabs */}
      <div className="hidden md:flex items-start mb-4">
        {/* Left: Title and Description */}
        <div className="flex-shrink-0 w-64">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Booking Information
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete all sections to finalize your reservation
          </p>
        </div>

        {/* Center: Customer Search - Desktop */}
        <div className="flex-1 flex justify-center px-8">
          <div className="w-full max-w-md">
            <CustomerSearchDropdown
              query={customerSearch.query}
              onQueryChange={customerSearch.setQuery}
              results={customerSearch.results}
              isLoading={customerSearch.isLoading}
              isOpen={customerSearch.isOpen}
              onClose={() => customerSearch.setIsOpen(false)}
              onSelectCustomer={customerSearch.selectCustomer}
              placeholder="Search Customer's Name, Email or Phone..."
            />
          </div>
        </div>

        {/* Right: Tabs and Progress */}
        <div className="flex-shrink-0 flex flex-col items-end gap-3">
          {/* Tab Navigation - Compact horizontal layout */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as BookingTab)}
          >
            <TabsList className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-0 overflow-hidden">
              {Object.values(tabConfig).map((tab, index) => {
                const Icon = tab.icon;
                const isCompleted = isTabCompleted(tab.id);
                const isAccessible = isTabAccessible(tab.id);
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
                    disabled={!isAccessible}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                      getBorderRadius(),
                      "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-purple-600",
                      "hover:bg-gray-50 dark:hover:bg-gray-700",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                      !isActive &&
                        !isCompleted &&
                        "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800",
                      isCompleted &&
                        !isActive &&
                        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Progress indicator */}
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Progress: {completedTabs.size}/3 completed
            </div>
            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedTabs.size / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Tabs and Progress full-width */}
      <div className="block md:hidden">
        {/* Tab Navigation - Mobile full-width */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as BookingTab)}
        >
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-0 overflow-hidden">
            {Object.values(tabConfig).map((tab, index) => {
              const Icon = tab.icon;
              const isCompleted = isTabCompleted(tab.id);
              const isAccessible = isTabAccessible(tab.id);
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
                  disabled={!isAccessible}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-all whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0",
                    getBorderRadius(),
                    "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-purple-600",
                    "hover:bg-gray-50 dark:hover:bg-gray-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                    !isActive &&
                      !isCompleted &&
                      "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800",
                    isCompleted &&
                      !isActive &&
                      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Progress indicator - Mobile */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{completedTabs.size}/3 completed</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedTabs.size / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
