"use client";

import "@/app/globals.css";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import Image from "next/image";
import { useGeneralSettings } from "@/lib/hooks/useGeneralSettings";
import { getCookie } from "cookies-next";
import { toast } from "sonner";
import { Building2, ArrowLeft } from "lucide-react";

// Optimized imports - lazy load heavy components
const CountrySelector = lazy(() => import("./optimized/CountrySelector"));
const PhoneInputSmart = lazy(() => import("./optimized/PhoneInputSmart"));
const TiptapProgressive = lazy(() => import("./optimized/TiptapProgressive"));
const StaticMapPreview = lazy(() => import("./optimized/StaticMapPreview"));
const LocationPickerMap = lazy(() => import("./LocationPickerMap"));

// Type definition for phone input country object
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

interface GeneralSettingsFormOptimizedProps {
  propertyId?: string;
  onCancel?: () => void;
  isPropertyMode?: boolean;
}

export default function GeneralSettingsFormOptimized({
  propertyId,
  onCancel,
  isPropertyMode = false
}: GeneralSettingsFormOptimizedProps = {}) {
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

  // State management
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [latitude, setLatitude] = useState(28.6139); // default to New Delhi
  const [longitude, setLongitude] = useState(77.209);
  const [isManuallyPositioned, setIsManuallyPositioned] = useState(false);
  const [locationAccuracy, setLocationAccuracy] =
    useState<string>("approximate");
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);

  // Performance tracking
  const [componentsLoaded, setComponentsLoaded] = useState<string[]>([]);

  const trackComponentLoad = (componentName: string) => {
    setComponentsLoaded((prev) => [...prev, componentName]);
  };

  // Storage key for form persistence
  const STORAGE_KEY =
    isPropertyMode && propertyId
      ? `generalSettings_property_${propertyId}`
      : "generalSettings_org";

  // Watch address fields for geocoding
  const watchedStreet = useWatch({ control, name: "street" });
  const watchedSuite = useWatch({ control, name: "suite" });
  const watchedCity = useWatch({ control, name: "city" });
  const watchedState = useWatch({ control, name: "state" });
  const watchedCountry = useWatch({ control, name: "country" });

  // Fetch settings
  const orgId = getCookie("orgId") as string;
  const settingsId = isPropertyMode && propertyId ? propertyId : orgId;
  const isPropertyIdMode = isPropertyMode && !!propertyId;
  const { settings, isLoading, mutate } = useGeneralSettings(
    settingsId,
    isPropertyIdMode
  );

  // Handle country change
  const handleCountryChange = useCallback(
    (country: string) => {
      setSelectedCountry(country);
      setSelectedState("");
      setValue("country", country);
      setValue("state", "");
      setValue("city", "");
      setHasUserInteracted(true);
    },
    [setValue]
  );

  // Handle state change
  const handleStateChange = useCallback(
    (state: string) => {
      setSelectedState(state);
      setValue("state", state);
      setValue("city", "");
      setHasUserInteracted(true);
    },
    [setValue]
  );

  // Handle manual positioning
  const handleManualPositioning = useCallback(() => {
    setIsManuallyPositioned(true);
    setValue("isManuallyPositioned", true);
    setLocationAccuracy("precise");
  }, [setValue]);

  // Debounced geocoding
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

        if (response.ok) {
          const data = await response.json();
          if (data.lat && data.lng) {
            setLatitude(data.lat);
            setLongitude(data.lng);
            setValue("latitude", data.lat);
            setValue("longitude", data.lng);
            setLocationAccuracy("approximate");

            if (!isManuallyPositioned) {
              setValue("isManuallyPositioned", false);
            }
          }
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
    },
    [setValue, isManuallyPositioned]
  );

  // Form submission
  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();

      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === "photos" && value instanceof FileList) {
          Array.from(value).forEach((file) => {
            formData.append("photos", file);
          });
        } else if (key === "printHeaderImage" && value instanceof File) {
          formData.append("printHeaderImage", value);
        } else if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Add coordinates
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      formData.append("isManuallyPositioned", isManuallyPositioned.toString());

      // Add org/property ID
      if (isPropertyMode && propertyId) {
        formData.append("propertyId", propertyId);
      } else {
        formData.append("orgId", orgId);
      }

      const response = await fetch("/api/settings/general", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        toast.success("Settings saved successfully!");
        mutate();
        localStorage.removeItem(STORAGE_KEY);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("An error occurred while saving settings");
    }
  };

  return (
    <div className="space-y-8">
      {/* Performance Dashboard */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
          🚀 Performance Optimizations Active
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="font-medium">Countries</div>
            <div className="text-green-600 dark:text-green-400">
              USA + Europe only
            </div>
          </div>
          <div>
            <div className="font-medium">Phone Input</div>
            <div className="text-green-600 dark:text-green-400">
              Top 5 + Search
            </div>
          </div>
          <div>
            <div className="font-medium">Rich Editor</div>
            <div className="text-green-600 dark:text-green-400">
              Progressive loading
            </div>
          </div>
          <div>
            <div className="font-medium">Maps</div>
            <div className="text-green-600 dark:text-green-400">
              Static preview
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-green-700 dark:text-green-300">
          Components loaded: {componentsLoaded.join(", ") || "None yet"}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Property Type</Label>
              <select
                {...register("propertyType", {
                  required: "Property type is required"
                })}
                className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
              >
                <option value="">Select Property Type</option>
                <option value="hotel">Hotel</option>
                <option value="motel">Motel</option>
                <option value="resort">Resort</option>
                <option value="hostel">Hostel</option>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="other">Other</option>
              </select>
              {errors.propertyType && (
                <p className="text-red-500 text-sm">
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
                placeholder="Enter property name"
              />
              {errors.propertyName && (
                <p className="text-red-500 text-sm">
                  {errors.propertyName.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Contact Information Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Suspense
                fallback={
                  <div className="space-y-2">
                    <Label>Property Phone</Label>
                    <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    <p className="text-xs text-gray-500">
                      Loading smart phone input...
                    </p>
                  </div>
                }
              >
                <PhoneInputSmart
                  value={watch("propertyPhone") || ""}
                  onChange={(phone, country: PhoneInputCountry) => {
                    setValue("propertyPhone", phone);
                    setValue("phoneCode", `+${country.dialCode}`);
                    trackComponentLoad("PhoneInput");
                  }}
                />
              </Suspense>
            </div>

            <div>
              <Label>Property Email</Label>
              <Input
                {...register("propertyEmail", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address"
                  }
                })}
                type="email"
                placeholder="property@example.com"
              />
              {errors.propertyEmail && (
                <p className="text-red-500 text-sm">
                  {errors.propertyEmail.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Address Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Address Information</h3>

          <Suspense
            fallback={
              <div className="space-y-2">
                <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <p className="text-xs text-gray-500">
                  Loading optimized country selector...
                </p>
              </div>
            }
          >
            <CountrySelector
              control={control}
              selectedCountry={selectedCountry}
              selectedState={selectedState}
              onCountryChange={handleCountryChange}
              onStateChange={handleStateChange}
            />
          </Suspense>
        </section>

        {/* Location Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Property Location</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Street Address</Label>
              <Input
                {...register("street", {
                  required: "Street address is required"
                })}
                placeholder="123 Main Street"
              />
              {errors.street && (
                <p className="text-red-500 text-sm">{errors.street.message}</p>
              )}
            </div>

            <div>
              <Label>Suite/Unit (Optional)</Label>
              <Input {...register("suite")} placeholder="Suite 100" />
            </div>

            <div>
              <Label>ZIP/Postal Code</Label>
              <Input
                {...register("zip", { required: "ZIP code is required" })}
                placeholder="12345"
              />
              {errors.zip && (
                <p className="text-red-500 text-sm">{errors.zip.message}</p>
              )}
            </div>
          </div>

          {/* Map Section */}
          <div className="w-full h-80 bg-gray-200 rounded-md overflow-hidden">
            {!showInteractiveMap ? (
              <Suspense
                fallback={
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
                    <div className="text-gray-500">Loading map preview...</div>
                  </div>
                }
              >
                <StaticMapPreview
                  lat={latitude}
                  lng={longitude}
                  locationAccuracy={locationAccuracy}
                  onEditClick={() => {
                    setShowInteractiveMap(true);
                    trackComponentLoad("InteractiveMap");
                  }}
                />
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
                    <div className="text-gray-500">
                      Loading interactive map...
                    </div>
                  </div>
                }
              >
                <LocationPickerMap
                  lat={latitude}
                  lng={longitude}
                  setLat={setLatitude}
                  setLng={setLongitude}
                  onManualPositioning={handleManualPositioning}
                  locationAccuracy={locationAccuracy}
                />
              </Suspense>
            )}
          </div>
        </section>

        {/* Description Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Property Description</h3>

          <Suspense
            fallback={
              <div className="space-y-2">
                <Label>Describe Your Property</Label>
                <div className="min-h-[200px] bg-gray-100 dark:bg-gray-800 rounded animate-pulse flex items-center justify-center">
                  <div className="text-gray-500">
                    Loading rich text editor...
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Loading progressive TipTap editor...
                </p>
              </div>
            }
          >
            <TiptapProgressive control={control} errors={errors} />
          </Suspense>
        </section>

        {/* Owner Information Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Owner Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input
                {...register("firstName", {
                  required: "First name is required"
                })}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <Label>Last Name</Label>
              <Input
                {...register("lastName", { required: "Last name is required" })}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm">
                  {errors.lastName.message}
                </p>
              )}
            </div>

            <div>
              <Label>Website (Optional)</Label>
              <Input
                {...register("propertyWebsite")}
                type="url"
                placeholder="https://www.yourproperty.com"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </div>
  );
}
