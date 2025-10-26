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
import { Building2, ArrowLeft } from "lucide-react";

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

interface GeneralSettingsFormFixedProps {
  propertyId?: string;
  onCancel?: () => void;
  isPropertyMode?: boolean;
}

export default function GeneralSettingsFormFixed({
  propertyId,
  onCancel,
  isPropertyMode = false
}: GeneralSettingsFormFixedProps = {}) {
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

  async function uploadToS3(file: File): Promise<string> {
    // 1) get presign + publicUrl
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type })
    });
    if (!presignRes.ok) throw new Error("Presign failed");

    const { presignedUrl, publicUrl } = (await presignRes.json()) as {
      presignedUrl: string;
      publicUrl: string;
    };

    // 2) upload the file to S3
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });

    if (!uploadRes.ok) {
      // log the full XML or JSON error from S3
      const errorText = await uploadRes.text();
      console.error("S3 upload error:", errorText);
      throw new Error(`Upload failed (${uploadRes.status}): ${errorText}`);
    }

    // 3) return the public URL we got from the server
    return publicUrl;
  }

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

  // Debug logging
  console.log("GeneralSettings Debug:", {
    orgId,
    propertyId,
    isPropertyMode,
    cookieValue: getCookie("orgId")
  });

  // For new property creation, don't fetch any settings (start with empty form)
  // For existing property/org, fetch the appropriate settings
  const isNewProperty = isPropertyMode && !propertyId;
  const shouldFetchSettings = !isNewProperty;
  const settingsId = isPropertyMode && propertyId ? propertyId : orgId;
  const isPropertyIdMode = isPropertyMode && !!propertyId;

  // Debug logging
  console.log("🔍 GeneralSettingsForm Debug:", {
    isPropertyMode,
    propertyId,
    isNewProperty,
    shouldFetchSettings,
    settingsId,
    isPropertyIdMode
  });

  // For new properties, don't use the hook at all to prevent any data fetching
  const hookResult = useGeneralSettings(
    shouldFetchSettings ? settingsId : undefined,
    isPropertyIdMode
  );

  // Override settings to null for new properties to ensure clean form
  const { settings: rawSettings, isLoading, mutate } = hookResult;
  const settings = isNewProperty ? null : rawSettings;

  useEffect(() => {
    console.log("🔍 useEffect Debug:", {
      isNewProperty,
      settings: settings ? "exists" : "null",
      hasUserInteracted,
      shouldPopulateForm:
        !isNewProperty && settings && !settings.error && !hasUserInteracted
    });

    // For new property creation, reset form to empty state
    if (isNewProperty) {
      console.log("✅ Skipping form population for new property");

      // Explicitly reset form to empty values for new property
      if (!hasUserInteracted) {
        console.log("🧹 Resetting form to empty state for new property");
        reset({
          propertyType: "",
          propertyName: "",
          propertyPhone: "",
          propertyEmail: "",
          propertyWebsite: "",
          firstName: "",
          lastName: "",
          country: "United States",
          street: "",
          suite: "",
          city: "",
          state: "",
          zip: "",
          latitude: 0,
          longitude: 0,
          isManuallyPositioned: false,
          photos: null,
          printHeaderImage: null,
          description: ""
        });

        // Clear image previews
        setPhotoPreview([]);
        setPrintHeaderPreview("");
      }
      return;
    }

    if (settings && !settings.error && !hasUserInteracted) {
      console.log("📝 Populating form with settings:", Object.keys(settings));

      // 1) Reset all form fields (empty out File inputs)
      reset({
        ...settings,
        photos: null,
        printHeaderImage: null
      });

      // 2) Populate existing images into your previews
      if (Array.isArray(settings.photos)) {
        setPhotoPreview(settings.photos);
      }
      if (
        typeof settings.printHeaderImage === "string" &&
        settings.printHeaderImage
      ) {
        setPrintHeaderPreview(settings.printHeaderImage);
      }

      // 3) Ensure latitude and longitude are valid numbers with fallbacks
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

      // 4) Set manual positioning flag from settings
      setIsManuallyPositioned(settings.isManuallyPositioned || false);

      // 5) Initial location accuracy for zoom calculation
      if (!settings.isManuallyPositioned) {
        setLocationAccuracy("approximate");
      }

      // 6) Country → State initialization
      if (settings.country) {
        setSelectedCountry(settings.country);
        const countries = Country.getAllCountries();
        const countryData = countries.find((c) => c.name === settings.country);
        if (countryData) {
          const countryStates = State.getStatesOfCountry(countryData.isoCode);
          if (settings.state) {
            const stateExists = countryStates.some(
              (st) => st.name === settings.state
            );
            if (stateExists) {
              setSelectedState(settings.state);
            } else {
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
    setIsSubmitting(true);

    try {
      // 1. Upload photos
      let uploadedPhotoUrls: string[] = [];
      if (data.photos && data.photos.length > 0) {
        uploadedPhotoUrls = await Promise.all(
          Array.from(data.photos).map(uploadToS3)
        );
      }

      // 2. Upload printHeaderImage
      let printHeaderImageUrl = "";
      if (data.printHeaderImage) {
        printHeaderImageUrl = await uploadToS3(data.printHeaderImage);
      }

      let finalPropertyId = propertyId;

      // 3. If creating a new property, create it first
      if (isPropertyMode && !propertyId) {
        const propertyData = {
          name: data.propertyName,
          description: data.description || "",
          // Send address components separately
          suite: data.suite || null,
          street: data.street || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zip || null,
          country: data.country || null,
          phone: data.propertyPhone,
          email: data.propertyEmail,
          website: data.propertyWebsite,
          timezone: "UTC",
          currency: "USD",
          isActive: true,
          isDefault: false
        };

        const propertyResponse = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(propertyData)
        });

        if (!propertyResponse.ok) {
          const error = await propertyResponse.json();
          const errorMessage =
            typeof error.error === "string"
              ? error.error
              : error.message ||
                JSON.stringify(error) ||
                "Failed to create property";
          throw new Error(errorMessage);
        }

        const createdProperty = await propertyResponse.json();
        finalPropertyId = createdProperty.id;
      }

      // 4. Update Property table if in property mode (sync core property data)
      if (finalPropertyId) {
        console.log("🔄 Syncing property data to Property table...");

        const propertyUpdateData = {
          name: data.propertyName,
          phone: data.propertyPhone,
          email: data.propertyEmail,
          // Send address components separately
          suite: data.suite || null,
          street: data.street || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zip || null,
          country: data.country || null
        };

        const propertyResponse = await fetch(
          `/api/properties/${finalPropertyId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(propertyUpdateData)
          }
        );

        if (!propertyResponse.ok) {
          const error = await propertyResponse.json();
          throw new Error(
            `Failed to update property: ${error.error || "Unknown error"}`
          );
        }

        console.log("✅ Property table updated successfully");
      }

      // 5. Create/update settings
      const baseData = {
        ...data,
        latitude,
        longitude,
        isManuallyPositioned,
        description: data.description || {},
        photos: uploadedPhotoUrls,
        printHeaderImage: printHeaderImageUrl
      };

      // Debug: Check what's in baseData
      console.log("BaseData keys:", Object.keys(baseData));
      console.log("BaseData has orgId:", "orgId" in baseData);
      console.log("BaseData has propertyId:", "propertyId" in baseData);

      // Clean baseData by removing any existing orgId/propertyId fields
      const cleanBaseData = Object.fromEntries(
        Object.entries(baseData).filter(
          ([key]) => key !== "orgId" && key !== "propertyId"
        )
      );

      // Add either propertyId or orgId, but not both
      let submitData;
      if (finalPropertyId) {
        // Property mode - only include propertyId
        submitData = { ...cleanBaseData, propertyId: finalPropertyId };
      } else {
        // Organization mode - only include orgId
        submitData = { ...cleanBaseData, orgId };
      }

      // Debug logging
      console.log("Submit Data:", {
        finalPropertyId,
        orgId,
        hasOrgId: !!orgId,
        submitData: { ...submitData, photos: "...", description: "..." } // Don't log large objects
      });

      // Validation
      if (!finalPropertyId && !orgId) {
        throw new Error(
          "Missing organization ID. Please refresh the page and try again."
        );
      }

      const response = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage =
          typeof error.error === "string"
            ? error.error
            : error.message ||
              JSON.stringify(error) ||
              "Failed to save settings";
        throw new Error(errorMessage);
      }

      toast.success(
        isPropertyMode && !propertyId
          ? "Property created successfully!"
          : "Settings saved!"
      );
      localStorage.removeItem(STORAGE_KEY);
      mutate(); // SWR revalidation

      // If in property mode, redirect back to property list
      if (isPropertyMode && onCancel) {
        setTimeout(() => {
          onCancel();
        }, 1000); // Small delay to show success message
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save");
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
    <div className="space-y-6">
      {/* Header with Back button for property mode */}
      {isPropertyMode && onCancel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <h1 className="text-xl font-semibold">
              {propertyId ? "Edit Property" : "Create New Property"}
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex items-center space-x-1 border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>
      )}

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
                    e.target.style.boxShadow =
                      "0 0 0 3px rgb(168 85 247 / 0.2)";

                    // Style the dropdown button (left side)
                    const button = e.target.parentElement?.querySelector(
                      ".flag-dropdown"
                    ) as HTMLElement;
                    if (button) {
                      button.style.borderColor = "rgb(168 85 247)"; // purple-400
                      button.style.boxShadow =
                        "0 0 0 3px rgb(168 85 247 / 0.2)";
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
                {...register("firstName", {
                  required: "First name is required"
                })}
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
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
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
                      {locationAccuracy === "exact"
                        ? "n exact"
                        : "n approximate"}
                      location based on your address ({locationAccuracy}). For
                      precise positioning, click on the map or drag the red
                      marker to the exact location.
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
    </div>
  );
}
