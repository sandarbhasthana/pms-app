"use client";

import React, { useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { CustomerSearchResult } from "@/hooks/useCustomerSearch";

export interface CustomerSearchDropdownProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: CustomerSearchResult[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const CustomerSearchDropdown: React.FC<CustomerSearchDropdownProps> = ({
  query,
  onQueryChange,
  results,
  isLoading,
  isOpen,
  onClose,
  onSelectCustomer,
  placeholder = "Search by name, email, or phone...",
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown - DISABLED
  useEffect(() => {
    // Click-outside handler disabled because it interferes with button clicks
    // The dropdown will close when a customer is selected via the selectCustomer function
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
      inputRef.current?.blur();
    }
  };

  // Handle clear button click
  const handleClear = () => {
    onQueryChange("");
    onClose();
    inputRef.current?.focus();
  };

  // Format last stay info
  const formatLastStay = (customer: CustomerSearchResult) => {
    const checkIn = new Date(customer.checkIn);
    const checkOut = new Date(customer.checkOut);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    return `Last stay: ${checkIn.toLocaleDateString()} (${nights} night${
      nights > 1 ? "s" : ""
    })`;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 py-2 text-sm",
            query ? "pr-10" : "pr-4", // Add right padding when clear button is visible
            "bg-white dark:!bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]",
            "border border-gray-300 dark:border-gray-600 rounded-md",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "placeholder-gray-500 dark:placeholder-gray-400",
            "transition-colors duration-200"
          )}
        />

        {/* Clear button - shows when there's text */}
        {query && !isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                "bg-gray-200 dark:!bg-gray-700",
                "hover:bg-gray-300 dark:hover:bg-gray-700",
                "transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
              )}
              title="Clear search"
            >
              <XMarkIcon className="h-3 w-3 text-gray-600 dark:!text-gray-300" />
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
        >
          {isLoading && results.length === 0 && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                Searching...
              </div>
            </div>
          )}

          {!isLoading && results.length === 0 && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              No customers found for &quot;{query}&quot;
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-700/50">
                {results.length} customer{results.length > 1 ? "s" : ""} found
              </div>

              {results.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectCustomer(customer);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800",
                    "focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800",
                    "border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    "transition-colors duration-150"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {customer.guestName}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {customer.email && (
                          <div className="truncate">{customer.email}</div>
                        )}
                        {customer.phone && (
                          <div className="truncate">{customer.phone}</div>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatLastStay(customer)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {query.length > 0 && query.length < 3 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              Type at least 3 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};
