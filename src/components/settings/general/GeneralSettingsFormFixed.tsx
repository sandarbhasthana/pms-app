"use client";

import "@/app/globals.css";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Country, State, City } from "country-state-city";
import Image from "next/image";
import PhoneInput from "react-phone-input-2";
import LocationPickerMap from "@/components/settings/general/LocationPickerMap";
import DescriptionTiptap from "@/components/settings/general/DescriptionTiptap";
import { useGeneralSettings } from "@/lib/hooks/useGeneralSettings";
import { getCookie } from "cookies-next";
import { toast } from "sonner";

// Type definition for react-phone-input-2 country object
interface PhoneInputCountry {
  name: string;
  dialCode: string;
  countryCode: string;
}

type FormValues = {
  propertyType: string;
  propertyName: string;
  phoneCode: string;
  propertyPhone: string;
  propertyEmail: string;
  propertyWebsite: string;
  firstName: string;
  lastName: string;
  country: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  isManuallyPositioned: boolean;
  description: string;
  photos: FileList | null;
  printHeaderImage: File | null;
};

export default function GeneralSettingsFormFixed() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    mode: "onBlur"
  });

  // Only watch address fields for geocoding
  const watchedStreet = useWatch({ control, name: "street" });
  const watchedSuite = useWatch({ control, name: "suite" });
  const watchedCity = useWatch({ control, name: "city" });
  const watchedState = useWatch({ control, name: "state" });
  const watchedCountry = useWatch({ control, name: "country" });

  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [latitude, setLatitude] = useState(28.6139); // default to New Delhi
  const [longitude, setLongitude] = useState(77.209);
  const [isManuallyPositioned, setIsManuallyPositioned] = useState(false);
  const [locationAccuracy, setLocationAccuracy] =
    useState<string>("approximate");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [printHeaderPreview, setPrintHeaderPreview] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Property type options
  const propertyTypeOptions = [
    { value: "hotel", label: "Hotel" },
    { value: "resort", label: "Resort" },
    { value: "motel", label: "Motel" },
    { value: "inn", label: "Inn" },
    { value: "lodge", label: "Lodge" },
    { value: "hostel", label: "Hostel" },
    { value: "apartment", label: "Apartment" },
    { value: "villa", label: "Villa" },
    { value: "other", label: "Other" }
  ];

  // Persistence Data
  const STORAGE_KEY = "pms_general_settings_draft";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, value]) => {
        // Skip File/FileList types as they cannot be serialized/deserialized from JSON
        if (key === "photos" || key === "printHeaderImage") {
          return;
        }

        // Handle latitude and longitude specially to ensure they're valid numbers
        if (key === "latitude" || key === "longitude") {
          const numValue =
            typeof value === "number" ? value : parseFloat(value as string);
          if (isFinite(numValue)) {
            setValue(key as keyof FormValues, numValue);
            if (key === "latitude") setLatitude(numValue);
            if (key === "longitude") setLongitude(numValue);
          }
          return;
        }

        setValue(key as keyof FormValues, value as string | number);
      });
    }
  }, [setValue]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const subscription = watch((value) => {
      // Clear previous timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Debounce localStorage updates to prevent excessive writes
      timeoutId = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      }, 500);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [watch]);

  // Fetch settings - NOW USING FIXED SWR HOOK
  const orgId = getCookie("orgId") as string;
  const { settings, isLoading, mutate } = useGeneralSettings(orgId);

  useEffect(() => {
    if (settings && !settings.error && !hasUserInteracted) {
      reset({
        ...settings,
        photos: null,
        printHeaderImage: null
      });

      // Ensure latitude and longitude are valid numbers with fallbacks
      const lat =
        typeof settings.latitude === "number" && isFinite(settings.latitude)
          ? settings.latitude
          : 28.6139; // Default to New Delhi
      const lng =
        typeof settings.longitude === "number" && isFinite(settings.longitude)
          ? settings.longitude
          : 77.209; // Default to New Delhi

      setLatitude(lat);
      setLongitude(lng);

      // Set manual positioning flag from settings
      setIsManuallyPositioned(settings.isManuallyPositioned || false);

      // Set initial location accuracy for zoom calculation
      if (!settings.isManuallyPositioned) {
        setLocationAccuracy("approximate"); // Default for loaded settings
      }

      // Set country-state-city values
      if (settings.country) {
        setSelectedCountry(settings.country);
        const countries = Country.getAllCountries();
        const countryData = countries.find((c) => c.name === settings.country);
        if (countryData) {
          const countryStates = State.getStatesOfCountry(countryData.isoCode);

          if (settings.state) {
            // Validate that the saved state exists for this country
            const stateExists = countryStates.some(
              (state) => state.name === settings.state
            );
            if (stateExists) {
              setSelectedState(settings.state);
            } else {
              // If saved state doesn't exist for this country, clear it
              setSelectedState("");
              setValue("state", "");
            }
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, hasUserInteracted]);

  // Register propertyType field with validation
  useEffect(() => {
    register("propertyType", { required: "Property type is required" });
    register("propertyPhone", { required: "Phone number is required" });
    register("phoneCode", { required: "Phone country code is required" });
  }, [register]);

  // Geocode address
  const geocodeAddress = useCallback(
    async (address: string) => {
      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ address })
        });

        const data = await response.json();

        if (data.success) {
          console.log(
            "🌍 Geocoding successful:",
            data.accuracy,
            "zoom will be calculated based on accuracy"
          );
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          setLocationAccuracy(data.accuracy || "approximate");

          // Show subtle success toast for geocoding
          toast.success("Location updated", {
            description: `Found ${data.accuracy} location for your address`
          });
        } else {
          // Show error toast for failed geocoding
          toast.error("Location not found", {
            description: "Could not find coordinates for the entered address"
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        toast.error("Geocoding failed", {
          description: "Unable to find location for the entered address"
        });
      }
    },
    [setLatitude, setLongitude, setLocationAccuracy]
  );

  // Geocode address on change (only if not manually positioned)
  useEffect(() => {
    // Skip geocoding if coordinates are manually positioned
    if (isManuallyPositioned) {
      console.log(
        "🚫 Skipping geocoding - coordinates are manually positioned"
      );
      return;
    }

    const timeout = setTimeout(() => {
      const fullAddress = [
        watchedStreet,
        watchedSuite,
        watchedCity,
        watchedState,
        watchedCountry
      ]
        .filter(Boolean)
        .join(", ");

      if (fullAddress.length >= 10) {
        console.log("🌍 Auto-geocoding address:", fullAddress);
        geocodeAddress(fullAddress);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [
    watchedStreet,
    watchedSuite,
    watchedCity,
    watchedState,
    watchedCountry,
    geocodeAddress,
    isManuallyPositioned
  ]);

  // Country change handler
  const handleCountryChange = (countryName: string) => {
    setSelectedCountry(countryName);
    setValue("country", countryName);

    // Reset state and city when country changes
    setSelectedState("");
    setValue("state", "");
    setValue("city", "");

    setHasUserInteracted(true);
  };

  // State change handler
  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    setValue("state", stateName);

    // Reset city when state changes
    setValue("city", "");

    setHasUserInteracted(true);
  };

  // Handle manual positioning of marker
  const handleManualPositioning = useCallback(() => {
    console.log("🎯 Coordinates manually positioned by user");
    setIsManuallyPositioned(true);
    setHasUserInteracted(true);
  }, []);

  // Reset to address-based positioning
  const handleResetToAddressBased = useCallback(() => {
    console.log("🔄 Resetting to address-based positioning");
    setIsManuallyPositioned(false);
    setHasUserInteracted(true);

    toast.info("Reset to address-based location", {
      description: "Marker will now update automatically when address changes"
    });

    // Trigger geocoding immediately
    const fullAddress = [
      watchedStreet,
      watchedSuite,
      watchedCity,
      watchedState,
      watchedCountry
    ]
      .filter(Boolean)
      .join(", ");

    if (fullAddress.length >= 10) {
      console.log("🔄 Triggering geocoding after reset to address-based");
      geocodeAddress(fullAddress);
    } else {
      // If no full address, set default accuracy for zoom
      setLocationAccuracy("approximate");
    }
  }, [
    watchedStreet,
    watchedSuite,
    watchedCity,
    watchedState,
    watchedCountry,
    geocodeAddress
  ]);

  // Submit form
  const onSubmit = async (data: FormValues) => {
    console.log("🚀 onSubmit called with data:", data);
    console.log("🔍 Form errors:", errors);
    try {
      setIsSubmitting(true);

      const submitData = {
        orgId,
        propertyType: data.propertyType,
        propertyName: data.propertyName,
        propertyPhone: data.propertyPhone,
        phoneCode: data.phoneCode,
        propertyEmail: data.propertyEmail,
        propertyWebsite: data.propertyWebsite || "",
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        street: data.street,
        suite: data.suite || "",
        city: data.city,
        state: data.state,
        zip: data.zip,
        latitude,
        longitude,
        isManuallyPositioned,
        description: data.description || {},
        photos: [], // For now, skip file uploads
        printHeaderImage: "" // For now, skip file uploads
      };

      const response = await fetch("/api/settings/general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        console.log("Settings saved successfully");
        localStorage.removeItem(STORAGE_KEY);
        mutate(); // Refresh the data
        toast.success("Settings saved successfully!", {
          description: "Your property settings have been updated."
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to save settings";
        console.error("Failed to save settings:", errorMessage);
        toast.error("Failed to save settings", {
          description: errorMessage
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Error saving settings", {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form validation errors
  const onError = (errors: Record<string, { message?: string }>) => {
    console.log("❌ Form validation errors:", errors);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-[200px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onError)}
      className="space-y-10 pb-10"
    >
      {/* 1. Property Details */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Property Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Property Type</Label>
            <select
              value={watch("propertyType") || ""}
              onChange={(e) => setValue("propertyType", e.target.value)}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">Select a property type</option>
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.propertyType && (
              <p className="text-sm text-red-500 mt-1">
                {errors.propertyType.message}
              </p>
            )}
          </div>
          <div>
            <Label>Property Name</Label>
            <Input
              {...register("propertyName", {
                required: "Property name is required"
              })}
            />
            {errors.propertyName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.propertyName.message}
              </p>
            )}
          </div>
          <div>
            <Label>Property Phone</Label>
            <PhoneInput
              country={"us"}
              value={watch("propertyPhone")}
              onChange={(phone, country: PhoneInputCountry) => {
                setValue("propertyPhone", phone);
                setValue("phoneCode", `+${country.dialCode}`);
              }}
              inputStyle={{
                width: "100%",
                height: "36px",
                fontSize: "14px",
                border: "1px solid rgb(107 114 128)", // gray-500
                borderLeft: "none", // Remove left border to connect with dropdown
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
                border: "1px solid rgb(107 114 128)", // gray-500
                borderRight: "none", // Remove right border to connect with input
                borderTopLeftRadius: "6px",
                borderBottomLeftRadius: "6px",
                borderTopRightRadius: "0",
                borderBottomRightRadius: "0",
                backgroundColor: "transparent",
                height: "36px"
              }}
              inputProps={{
                onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
                  e.target.style.outline = "none";
                  // Style the input (right side)
                  e.target.style.borderColor = "rgb(168 85 247)"; // purple-400
                  e.target.style.boxShadow = "0 0 0 3px rgb(168 85 247 / 0.2)";

                  // Style the dropdown button (left side)
                  const button = e.target.parentElement?.querySelector(
                    ".flag-dropdown"
                  ) as HTMLElement;
                  if (button) {
                    button.style.borderColor = "rgb(168 85 247)"; // purple-400
                    button.style.boxShadow = "0 0 0 3px rgb(168 85 247 / 0.2)";
                  }
                },
                onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                  // Reset input (right side)
                  e.target.style.borderColor = "rgb(107 114 128)"; // gray-500
                  e.target.style.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";

                  // Reset dropdown button (left side)
                  const button = e.target.parentElement?.querySelector(
                    ".flag-dropdown"
                  ) as HTMLElement;
                  if (button) {
                    button.style.borderColor = "rgb(107 114 128)"; // gray-500
                    button.style.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
                  }
                }
              }}
              containerStyle={{ width: "100%" }}
            />
            {errors.propertyPhone && (
              <p className="text-sm text-red-500 mt-1">
                {errors.propertyPhone.message}
              </p>
            )}
          </div>
          <div>
            <Label>Property Email</Label>
            <Input
              type="email"
              {...register("propertyEmail", {
                required: "Property email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
            />
            {errors.propertyEmail && (
              <p className="text-sm text-red-500 mt-1">
                {errors.propertyEmail.message}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label>Property Website</Label>
            <Input {...register("propertyWebsite")} />
          </div>
        </div>
      </section>

      {/* 2. Contact Person */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Contact Person</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>First Name</Label>
            <Input
              {...register("firstName", { required: "First name is required" })}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <Label>Last Name</Label>
            <Input
              {...register("lastName", { required: "Last name is required" })}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Address */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Apt, Suite #, Floor</Label>
            <Input {...register("suite")} />
          </div>
          <div>
            <Label>Street Address</Label>
            <Input {...register("street")} />
          </div>
          <div>
            <Label>Country</Label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Country</option>
                  {Country.getAllCountries().map((country) => (
                    <option key={country.isoCode} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div>
            <Label>State / Province</Label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!selectedCountry}
                  className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select State</option>
                  {selectedCountry &&
                    State.getStatesOfCountry(
                      Country.getAllCountries().find(
                        (c) => c.name === selectedCountry
                      )?.isoCode || ""
                    ).map((state) => (
                      <option key={state.isoCode} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                </select>
              )}
            />
          </div>
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
                  {selectedCountry &&
                    selectedState &&
                    City.getCitiesOfState(
                      Country.getAllCountries().find(
                        (c) => c.name === selectedCountry
                      )?.isoCode || "",
                      State.getStatesOfCountry(
                        Country.getAllCountries().find(
                          (c) => c.name === selectedCountry
                        )?.isoCode || ""
                      ).find((s) => s.name === selectedState)?.isoCode || ""
                    ).map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                </select>
              )}
            />
          </div>
          <div>
            <Label>ZIP / Postal Code</Label>
            <Input {...register("zip")} />
          </div>
        </div>
      </section>

      {/* 4. Location Map */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Location on Map</h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Location Accuracy:</strong>
                {isManuallyPositioned ? (
                  <span className="text-green-700 dark:text-green-300">
                    {" "}
                    The marker has been manually positioned by you. Address
                    changes will not move the marker automatically.{" "}
                    <button
                      type="button"
                      onClick={handleResetToAddressBased}
                      className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      Reset to address-based location
                    </button>
                  </span>
                ) : (
                  <>
                    {" "}
                    The map shows a
                    {locationAccuracy === "exact" ? "n exact" : "n approximate"}
                    location based on your address ({locationAccuracy}). For
                    precise positioning, click on the map or drag the red marker
                    to the exact location.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full h-80 bg-gray-200 rounded-md flex items-center justify-center text-muted overflow-hidden">
          <LocationPickerMap
            lat={latitude}
            lng={longitude}
            setLat={setLatitude}
            setLng={setLongitude}
            onManualPositioning={handleManualPositioning}
            locationAccuracy={locationAccuracy}
          />
        </div>
      </section>

      {/* 5. Media & Descriptions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Media & Descriptions</h2>

        <div>
          <Label>Property Images</Label>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const previews = files.map((file) => URL.createObjectURL(file));
              setPhotoPreview(previews);
              setValue("photos", e.target.files);
            }}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {photoPreview.map((src, i) => (
              <Image
                key={i}
                src={src}
                alt="Property Image"
                width={128}
                height={96}
                className="rounded border object-cover w-32 h-24"
              />
            ))}
          </div>
        </div>

        <div>
          <Label>Print Header Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setValue("printHeaderImage", file);
                setPrintHeaderPreview(URL.createObjectURL(file));
              }
            }}
          />
          {printHeaderPreview && (
            <div className="mt-2">
              <Image
                src={printHeaderPreview}
                alt="Print Header"
                width={512}
                height={96}
                className="w-full max-w-md h-24 object-contain border rounded"
              />
            </div>
          )}
        </div>

        <div>
          <Label>Description</Label>
          <DescriptionTiptap control={control} errors={errors} />
        </div>
      </section>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-fit bg-purple-700 hover:bg-purple-600 rounded-sm"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
