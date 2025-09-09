// FIXED VERSION - Optimized AutocompleteInput to prevent Fast Refresh issues
"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";

interface Reservation {
  id: string;
  guestName: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  idType?: string;
  issuingCountry?: string;
}

interface Props {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  setValue: (val: string) => void;
  onCustomerSelect: (r: Reservation) => void;
  type?: string;
  isSelectingCustomerRef?: React.MutableRefObject<boolean>;
  selectedCustomerValuesRef?: React.MutableRefObject<{
    fullName: string;
    email: string;
    phone: string;
    idNumber: string;
  }>;
}

export default function AutocompleteInputFixed({
  label,
  name,
  value,
  setValue,
  placeholder,
  onCustomerSelect,
  type = "text",
  isSelectingCustomerRef,
  selectedCustomerValuesRef
}: Props) {
  const [results, setResults] = useState<Reservation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSelectedValueRef = useRef<string>("");

  // FIXED: Memoized search function to prevent recreation
  const searchCustomers = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/customers/search?q=${encodeURIComponent(query)}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setResults(data.results || []);
      setShowDropdown(true);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Customer search error:", error);
        setResults([]);
        setShowDropdown(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // FIXED: Optimized search effect with better debouncing and cleanup
  useEffect(() => {
    // Don't search if we're in the middle of selecting a customer
    if (isSelectingCustomerRef?.current) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length <= 1) {
      setResults([]);
      setShowDropdown(false);
      lastSelectedValueRef.current = "";
      return;
    }

    // Check if this value matches a recently selected customer value
    const selectedValues = selectedCustomerValuesRef?.current;
    if (selectedValues) {
      const isSelectedValue =
        trimmed === selectedValues.fullName ||
        trimmed === selectedValues.email ||
        trimmed === selectedValues.phone ||
        trimmed === selectedValues.idNumber;

      if (isSelectedValue) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
    }

    // Prevent search if this is the same value that was just selected
    if (trimmed === lastSelectedValueRef.current) {
      return;
    }

    // FIXED: Increased debounce delay to reduce API calls
    const timeoutId = setTimeout(() => {
      // Double-check the ref before making the API call
      if (!isSelectingCustomerRef?.current) {
        searchCustomers(trimmed);
      }
    }, 500); // Increased from 250ms to 500ms

    return () => {
      clearTimeout(timeoutId);
      // Cancel ongoing request when component unmounts or value changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    value,
    searchCustomers,
    isSelectingCustomerRef,
    selectedCustomerValuesRef
  ]); // FIXED: Removed results from dependencies to prevent infinite loop

  // FIXED: Memoized click outside handler
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setShowDropdown(false);
      setResults([]);
    }
  }, []);

  // FIXED: Optimized click outside effect
  useEffect(() => {
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown, handleClickOutside]);

  // FIXED: Memoized customer selection handler
  const handleCustomerClick = useCallback(
    (customer: Reservation) => {
      // Track the selected value to prevent unnecessary searches
      lastSelectedValueRef.current = value;
      onCustomerSelect(customer);
      setShowDropdown(false);
      setResults([]);
    },
    [onCustomerSelect, value]
  );

  // FIXED: Memoized focus handler
  const handleFocus = useCallback(() => {
    if (results.length > 0 && value.trim().length > 1) {
      setShowDropdown(true);
    }
  }, [results.length, value]);

  // FIXED: Memoized change handler
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear the last selected value when user manually types
      lastSelectedValueRef.current = "";

      // Clear selected customer values if user starts typing something different
      if (selectedCustomerValuesRef?.current) {
        const currentValue = e.target.value.trim();
        const selectedValues = selectedCustomerValuesRef.current;
        const isTypingSelectedValue =
          currentValue === selectedValues.fullName ||
          currentValue === selectedValues.email ||
          currentValue === selectedValues.phone ||
          currentValue === selectedValues.idNumber;

        if (!isTypingSelectedValue) {
          // User is typing something new, clear the selected customer values
          selectedCustomerValuesRef.current = {
            fullName: "",
            email: "",
            phone: "",
            idNumber: ""
          };
        }
      }

      setValue(e.target.value);
    },
    [setValue, selectedCustomerValuesRef]
  );

  // FIXED: Memoized dropdown items to prevent unnecessary re-renders
  const dropdownItems = useMemo(() => {
    return results.map((customer) => (
      <li
        key={customer.id}
        onClick={() => handleCustomerClick(customer)}
        className="px-4 py-2 cursor-pointer text-gray-900 dark:text-white hover:bg-gray-500 hover:text-white text-sm transition-colors"
      >
        <div className="font-medium">{customer.guestName}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {customer.email && `📧 ${customer.email}`}
          {customer.phone && ` | 📞 ${customer.phone}`}
        </div>
      </li>
    ));
  }, [results, handleCustomerClick]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </label>
      <div className="relative">
        <input
          name={name}
          value={value}
          type={type}
          onFocus={handleFocus}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm pr-8"
          placeholder={placeholder}
          autoComplete="off"
        />
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 mt-0.5">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          </div>
        )}
      </div>

      {/* FIXED: Optimized dropdown with better styling and performance */}
      {showDropdown && results.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute z-50 bg-white text-gray-700 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-lg w-full max-h-48 overflow-y-auto mt-1"
        >
          {dropdownItems}
        </ul>
      )}

      {/* No results message */}
      {showDropdown &&
        !isLoading &&
        results.length === 0 &&
        value.trim().length > 1 && (
          <div className="absolute z-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg w-full mt-1 p-3 text-sm text-gray-500 dark:text-gray-400">
            No customers found for &quot;{value.trim()}&quot;
          </div>
        )}
    </div>
  );
}
