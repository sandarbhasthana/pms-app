"use client";

import "@/app/globals.css";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useGeneralSettings } from "@/lib/hooks/useGeneralSettings";
import { getCookie } from "cookies-next";

type FormValues = {
  propertyType: string;
  propertyName: string;
  phoneCode: string;
  propertyPhone: string;
  propertyEmail: string;
};

export default function GeneralSettingsFormMinimal() {
  console.log("🔄 GeneralSettingsFormMinimal RENDER START");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    mode: "onBlur"
  });

  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  console.log("📊 Form state:", {
    hasUserInteracted,
    errorsCount: Object.keys(errors).length
  });

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

  // Simple phone country codes (just 5 for testing)
  const phoneCountryCodes = [
    { code: "+1", name: "United States/Canada" },
    { code: "+44", name: "United Kingdom" },
    { code: "+91", name: "India" },
    { code: "+86", name: "China" },
    { code: "+49", name: "Germany" }
  ];

  // Persistence Data
  const STORAGE_KEY = "pms_general_settings_draft_minimal";

  // RE-ENABLING: localStorage loading
  useEffect(() => {
    console.log("💾 localStorage useEffect TRIGGERED");
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      console.log("📥 Loading saved data from localStorage:", saved);
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, value]) => {
        console.log(`🔧 Setting ${key} = ${value}`);
        setValue(key as keyof FormValues, value as string);
      });
    } else {
      console.log("📭 No saved data in localStorage");
    }
  }, [setValue]);

  // RE-ENABLING: watch() subscription for localStorage persistence
  useEffect(() => {
    console.log("👀 watch() useEffect TRIGGERED - Setting up subscription");
    let timeoutId: NodeJS.Timeout;

    const subscription = watch((value) => {
      console.log("🔍 watch() CALLBACK FIRED with value:", value);

      // Clear previous timeout
      if (timeoutId) {
        console.log("⏰ Clearing previous timeout");
        clearTimeout(timeoutId);
      }

      // Debounce localStorage updates to prevent excessive writes
      timeoutId = setTimeout(() => {
        console.log("💾 Saving to localStorage after debounce:", value);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      }, 500);
    });

    return () => {
      console.log("🧹 watch() useEffect CLEANUP - Unsubscribing");
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [watch]);

  // TESTING: Fixed SWR hook with improved configuration
  const orgId = getCookie("orgId") as string;
  console.log("🔑 orgId on render:", orgId);

  const { settings, isLoading } = useGeneralSettings(orgId);
  console.log("🔧 Using FIXED useGeneralSettings hook:", {
    hasSettings: !!settings,
    isLoading,
    settingsKeys: settings ? Object.keys(settings) : null
  });

  // TEMPORARILY DISABLE the reset() call to test if that's the issue
  // useEffect(() => {
  //   console.log("🌐 Settings useEffect TRIGGERED", {
  //     hasSettings: !!settings,
  //     hasError: settings?.error,
  //     hasUserInteracted
  //   });

  //   if (settings && !settings.error && !hasUserInteracted) {
  //     console.log("📥 Resetting form with settings data:", settings);
  //     reset({
  //       propertyType: settings.propertyType || "",
  //       propertyName: settings.propertyName || "",
  //       phoneCode: settings.phoneCode || "",
  //       propertyPhone: settings.propertyPhone || "",
  //       propertyEmail: settings.propertyEmail || ""
  //     });
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [settings, hasUserInteracted]);

  // No manual registration needed - using register() directly in JSX

  // Submit form
  const onSubmit = (data: FormValues) => {
    localStorage.removeItem(STORAGE_KEY);
    console.log("Form Data:", data);
    // Submit data to your API
  };

  if (isLoading) {
    console.log("⏳ Component is LOADING - showing skeleton");
    return (
      <div className="space-y-4">
        <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-[200px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  console.log("✅ GeneralSettingsFormMinimal RENDER COMPLETE - returning JSX");
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 pb-10">
      {/* 1. Property Details - MINIMAL */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Property Details (Minimal Test)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Property Type</Label>
            <select
              {...register("propertyType", {
                required: "Property type is required",
                onChange: (e) => {
                  console.log(
                    "🏨 PropertyType onChange FIRED (FIXED), new value:",
                    e.target.value
                  );
                }
              })}
              className="mt-1 block w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
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

          {/* TEST 1: Using register() directly - NO watch/setValue */}
          <div>
            <Label>Phone Country Code (Method 1: register only)</Label>
            <select
              {...register("phoneCode", {
                required: "Phone country code is required",
                onChange: (e) => {
                  console.log(
                    "📞 PhoneCode onChange FIRED (via register), new value:",
                    e.target.value
                  );
                }
              })}
              className="mt-1 block w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select country code</option>
              {phoneCountryCodes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} ({item.name})
                </option>
              ))}
            </select>
            {errors.phoneCode && (
              <p className="text-sm text-red-500 mt-1">
                {errors.phoneCode.message}
              </p>
            )}
          </div>

          <div>
            <Label>Property Phone</Label>
            <Input
              {...register("propertyPhone", {
                required: "Phone number is required"
              })}
              placeholder="Enter phone number"
            />
            {errors.propertyPhone && (
              <p className="text-sm text-red-500 mt-1">
                {errors.propertyPhone.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
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
        </div>
      </section>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full md:w-fit bg-purple-700 hover:bg-purple-600 rounded-sm"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
