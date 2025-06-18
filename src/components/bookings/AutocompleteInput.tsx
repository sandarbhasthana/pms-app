"use client";
import React, { useState, useEffect, useRef } from "react";

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
}

export default function AutocompleteInput({
  label,
  name,
  value,
  setValue,
  placeholder,
  onCustomerSelect,
  type = "text"
}: Props) {
  const [results, setResults] = useState<Reservation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const delay = setTimeout(() => {
      const trimmed = value.trim();

      if (trimmed.length <= 1) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      // Prevent dropdown from re-opening if value matches a previously selected item
      const match = results.find(
        (r) =>
          r.guestName === trimmed ||
          r.email === trimmed ||
          r.phone === trimmed ||
          r.idNumber === trimmed
      );
      if (match) {
        setShowDropdown(false);
        return;
      }

      fetch(`/api/customers/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results || []);
          setShowDropdown(true);
        })
        .catch(() => {
          setResults([]);
          setShowDropdown(false);
        });
    }, 250);

    return () => clearTimeout(delay);
  }, [value, results]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </label>
      <input
        name={name}
        value={value}
        type={type}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
        placeholder={placeholder}
      />
      {showDropdown && results.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute z-50 bg-white text-gray-700 dark:bg-gray-700 dark:text-white border border-gray-800 rounded shadow-md w-full max-h-40 overflow-y-auto mt-1"
        >
          {results.map((cust) => (
            <li
              key={cust.id}
              onClick={() => {
                onCustomerSelect(cust);
                setShowDropdown(false);
                setResults([]);
              }}
              className="px-4 py-2 cursor-pointer text-gray-900 dark:text-white hover:bg-gray-500 hover:text-white text-sm"
            >
              {cust.guestName}
              {cust.email && ` | ${cust.email}`}
              {cust.phone && ` | ${cust.phone}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
