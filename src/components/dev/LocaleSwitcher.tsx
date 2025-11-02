"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

/**
 * Developer Tool: Locale Switcher
 * 
 * This component allows developers to test different locale/date formats
 * without needing to change their actual location or use a VPN.
 * 
 * Usage: Add this component to any page during development
 * Remove or hide in production using environment variables
 */

interface LocaleOption {
  code: string;
  name: string;
  flag: string;
  latitude: number;
  longitude: number;
}

const LOCALE_OPTIONS: LocaleOption[] = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    latitude: 37.7749,
    longitude: -122.4194
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    latitude: 28.6139,
    longitude: 77.2090
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    latitude: 51.5074,
    longitude: -0.1278
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    latitude: 43.6532,
    longitude: -79.3832
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    latitude: -33.8688,
    longitude: 151.2093
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    latitude: 52.5200,
    longitude: 13.4050
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    latitude: 48.8566,
    longitude: 2.3522
  },
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    latitude: 40.4168,
    longitude: -3.7038
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    latitude: 41.9028,
    longitude: 12.4964
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    latitude: 35.6762,
    longitude: 139.6503
  },
  {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    latitude: 39.9042,
    longitude: 116.4074
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    latitude: -23.5505,
    longitude: -46.6333
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "🇲🇽",
    latitude: 19.4326,
    longitude: -99.1332
  }
];

export const LocaleSwitcher: React.FC = () => {
  const [currentLocale, setCurrentLocale] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("user_location");
      if (cached) {
        const data = JSON.parse(cached);
        return data.countryCode || "US";
      }
    } catch {
      // Ignore errors
    }
    return "US";
  });

  const handleLocaleChange = (locale: LocaleOption) => {
    // Update localStorage with new location
    localStorage.setItem(
      "user_location",
      JSON.stringify({
        countryCode: locale.code,
        latitude: locale.latitude,
        longitude: locale.longitude,
        timestamp: Date.now()
      })
    );

    setCurrentLocale(locale.code);

    // Reload page to apply new locale
    window.location.reload();
  };

  const handleClearCache = () => {
    localStorage.removeItem("user_location");
    alert("Location cache cleared! The app will request location permission on next load.");
    window.location.reload();
  };

  const currentLocaleOption = LOCALE_OPTIONS.find(
    (opt) => opt.code === currentLocale
  );

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="shadow-lg bg-white dark:bg-gray-800 border-2 border-purple-500"
          >
            <GlobeAltIcon className="h-4 w-4 mr-2" />
            {currentLocaleOption?.flag} {currentLocaleOption?.code || "Locale"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-gray-500">
            🛠️ Dev Tool: Test Locale/Date Formats
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {LOCALE_OPTIONS.map((locale) => (
            <DropdownMenuItem
              key={locale.code}
              onClick={() => handleLocaleChange(locale)}
              className={`cursor-pointer ${
                currentLocale === locale.code
                  ? "bg-purple-100 dark:bg-purple-900"
                  : ""
              }`}
            >
              <span className="mr-2">{locale.flag}</span>
              <span className="flex-1">{locale.name}</span>
              {currentLocale === locale.code && (
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleClearCache}
            className="cursor-pointer text-red-600 dark:text-red-400"
          >
            🗑️ Clear Location Cache
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LocaleSwitcher;

