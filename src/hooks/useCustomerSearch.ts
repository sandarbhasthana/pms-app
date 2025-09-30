"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export interface CustomerSearchResult {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  idNumber?: string;
  idType?: string;
  issuingCountry?: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

export interface UseCustomerSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: CustomerSearchResult[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clearSearch: () => void;
  selectCustomer: (customer: CustomerSearchResult) => void;
  onCustomerSelect?: (customer: CustomerSearchResult) => void;
}

export interface UseCustomerSearchOptions {
  onCustomerSelect?: (customer: CustomerSearchResult) => void;
  debounceMs?: number;
  minQueryLength?: number;
}

export const useCustomerSearch = (
  options: UseCustomerSearchOptions = {}
): UseCustomerSearchReturn => {
  const { onCustomerSelect, debounceMs = 500, minQueryLength = 3 } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debounceTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([]);
        setIsLoading(false);
        setIsOpen(true); // Keep dropdown open to show "Type at least 2 characters" message
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/customers/search?q=${encodeURIComponent(searchQuery)}`,
          {
            signal: abortControllerRef.current.signal
          }
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        // Only update if this is still the current search
        if (!abortControllerRef.current.signal.aborted) {
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (error) {
        // Ignore abort errors (they're expected when canceling requests)
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Customer search error:", error);
          setResults([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [minQueryLength]
  );

  // Handle query changes with debouncing
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }

      // If query is empty, clear results immediately
      if (!newQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        setIsOpen(false);
        return;
      }

      // Show dropdown immediately when user starts typing
      setIsOpen(true);

      // Set new timeout for debounced search
      debounceTimeoutRef.current = window.setTimeout(() => {
        performSearch(newQuery.trim());
      }, debounceMs);
    },
    [performSearch, debounceMs]
  );

  // Clear search function
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    setIsOpen(false);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear timeout
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  // Select customer function
  const selectCustomer = useCallback(
    (customer: CustomerSearchResult) => {
      // Call the callback if provided
      if (onCustomerSelect) {
        onCustomerSelect(customer);
      }

      // Close dropdown and clear search after a small delay to ensure form updates complete
      setTimeout(() => {
        clearSearch();
      }, 100);
    },
    [onCustomerSelect, clearSearch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    clearSearch,
    selectCustomer,
    onCustomerSelect
  };
};
