"use client";

import { useState, useEffect } from "react";
import { Country, State, City } from "country-state-city";
import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";

// Optimized: Load only USA and Europe countries
const SUPPORTED_REGIONS = {
  northAmerica: ['US', 'CA', 'MX'],
  europe: [
    'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK',
    'FI', 'IE', 'PT', 'GR', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK',
    'EE', 'LV', 'LT', 'LU', 'MT', 'CY'
  ]
};

const ALLOWED_COUNTRIES = [...SUPPORTED_REGIONS.northAmerica, ...SUPPORTED_REGIONS.europe];

// Pre-filter countries to reduce bundle size
const getOptimizedCountries = () => {
  return Country.getAllCountries().filter(
    country => ALLOWED_COUNTRIES.includes(country.isoCode)
  );
};

interface FormValues {
  country: string;
  state: string;
  city: string;
}

interface CountrySelectorProps {
  control: Control<FormValues>;
  selectedCountry: string;
  selectedState: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
}

export default function CountrySelector({
  control,
  selectedCountry,
  selectedState,
  onCountryChange,
  onStateChange
}: CountrySelectorProps) {
  const [optimizedCountries] = useState(() => getOptimizedCountries());
  const [availableStates, setAvailableStates] = useState<any[]>([]);
  const [availableCities, setAvailableCities] = useState<any[]>([]);

  // Update states when country changes
  useEffect(() => {
    if (selectedCountry) {
      const countryData = optimizedCountries.find((c) => c.name === selectedCountry);
      if (countryData) {
        const states = State.getStatesOfCountry(countryData.isoCode);
        setAvailableStates(states);
      }
    } else {
      setAvailableStates([]);
      setAvailableCities([]);
    }
  }, [selectedCountry, optimizedCountries]);

  // Update cities when state changes
  useEffect(() => {
    if (selectedCountry && selectedState) {
      const countryData = optimizedCountries.find((c) => c.name === selectedCountry);
      if (countryData) {
        const stateData = availableStates.find((s) => s.name === selectedState);
        if (stateData) {
          const cities = City.getCitiesOfState(countryData.isoCode, stateData.isoCode);
          setAvailableCities(cities);
        }
      }
    } else {
      setAvailableCities([]);
    }
  }, [selectedCountry, selectedState, optimizedCountries, availableStates]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Country Selector */}
      <div>
        <Label>Country</Label>
        <Controller
          name="country"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              value={selectedCountry}
              onChange={(e) => {
                field.onChange(e.target.value);
                onCountryChange(e.target.value);
              }}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            >
              <option value="">Select Country</option>
              {optimizedCountries.map((country) => (
                <option key={country.isoCode} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          )}
        />
        <p className="text-xs text-gray-500 mt-1">
          Optimized: {optimizedCountries.length} countries loaded (USA + Europe)
        </p>
      </div>

      {/* State Selector */}
      <div>
        <Label>State / Province</Label>
        <Controller
          name="state"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              value={selectedState}
              onChange={(e) => {
                field.onChange(e.target.value);
                onStateChange(e.target.value);
              }}
              disabled={!selectedCountry}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select State</option>
              {availableStates.map((state) => (
                <option key={state.isoCode} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {/* City Selector */}
      <div>
        <Label>City</Label>
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              disabled={!selectedState}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select City</option>
              {availableCities.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          )}
        />
      </div>
    </div>
  );
}
