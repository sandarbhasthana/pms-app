"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Label } from "@/components/ui/label";

// Top 5 most common countries for immediate loading
const TOP_COUNTRIES = [
  { code: 'us', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'de', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'fr', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'ca', name: 'Canada', dialCode: '+1', flag: '🇨🇦' }
];

// Lazy load the full phone input component
const FullPhoneInput = lazy(() => import('react-phone-input-2'));

interface PhoneInputSmartProps {
  value: string;
  onChange: (phone: string, country: any) => void;
  placeholder?: string;
}

export default function PhoneInputSmart({ 
  value, 
  onChange, 
  placeholder = "Enter phone number" 
}: PhoneInputSmartProps) {
  const [showFullInput, setShowFullInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(TOP_COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Extract phone number without country code
  useEffect(() => {
    if (value && value.startsWith(selectedCountry.dialCode)) {
      setPhoneNumber(value.substring(selectedCountry.dialCode.length));
    } else {
      setPhoneNumber(value);
    }
  }, [value, selectedCountry.dialCode]);

  const handleCountryChange = (country: typeof TOP_COUNTRIES[0]) => {
    setSelectedCountry(country);
    const fullPhone = country.dialCode + phoneNumber;
    onChange(fullPhone, {
      name: country.name,
      dialCode: country.dialCode.substring(1),
      countryCode: country.code
    });
  };

  const handlePhoneChange = (phone: string) => {
    setPhoneNumber(phone);
    const fullPhone = selectedCountry.dialCode + phone;
    onChange(fullPhone, {
      name: selectedCountry.name,
      dialCode: selectedCountry.dialCode.substring(1),
      countryCode: selectedCountry.code
    });
  };

  const handleSearchFocus = () => {
    setShowFullInput(true);
  };

  const filteredCountries = TOP_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm)
  );

  if (showFullInput) {
    return (
      <div>
        <Label>Property Phone</Label>
        <Suspense fallback={
          <div className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm items-center">
            <div className="animate-pulse">Loading full phone input...</div>
          </div>
        }>
          <FullPhoneInput
            country={'us'}
            value={value}
            onChange={(phone, country: any) => {
              onChange(phone, country);
            }}
            inputStyle={{
              width: "100%",
              height: "36px",
              fontSize: "14px",
              border: "1px solid rgb(107 114 128)",
              borderLeft: "none",
              borderTopRightRadius: "6px",
              borderBottomRightRadius: "6px",
              borderTopLeftRadius: "0",
              borderBottomLeftRadius: "0",
              backgroundColor: "transparent",
              color: "inherit",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              transition: "all 0.2s ease"
            }}
            buttonStyle={{
              border: "1px solid rgb(107 114 128)",
              borderRight: "none",
              borderTopLeftRadius: "6px",
              borderBottomLeftRadius: "6px",
              borderTopRightRadius: "0",
              borderBottomRightRadius: "0",
              backgroundColor: "transparent",
              transition: "all 0.2s ease"
            }}
            dropdownStyle={{
              backgroundColor: "white",
              border: "1px solid rgb(107 114 128)",
              borderRadius: "6px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
            }}
          />
        </Suspense>
        <p className="text-xs text-gray-500 mt-1">
          Full phone input loaded with all countries
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label>Property Phone</Label>
      <div className="flex">
        {/* Country Selector */}
        <div className="relative">
          <select
            value={selectedCountry.code}
            onChange={(e) => {
              const country = TOP_COUNTRIES.find(c => c.code === e.target.value);
              if (country) handleCountryChange(country);
            }}
            className="flex h-9 rounded-l-md border border-gray-500 dark:border-gray-400 border-r-0 bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
          >
            {TOP_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.dialCode}
              </option>
            ))}
          </select>
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-r-md border border-gray-500 dark:border-gray-400 border-l-0 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
        />

        {/* Search/Expand Button */}
        <button
          type="button"
          onClick={handleSearchFocus}
          className="ml-2 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          More Countries
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        Quick select: Top 5 countries loaded. Click "More Countries" for full list.
      </p>
    </div>
  );
}
