"use client";

import "@/app/globals.css";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useGeneralSettings } from "@/lib/hooks/useGeneralSettings";
import { getCookie } from "cookies-next";

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
  description: string;
  photos: FileList | null;
  printHeaderImage: File | null;
};

export default function GeneralSettingsFormDebug() {
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

  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [printHeaderPreview, setPrintHeaderPreview] = useState<string | null>(
    null
  );

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

  // Phone country codes
  const phoneCountryCodes = [
    { code: "+1", country: "US/CA", name: "United States/Canada" },
    { code: "+44", country: "GB", name: "United Kingdom" },
    { code: "+91", country: "IN", name: "India" },
    { code: "+86", country: "CN", name: "China" },
    { code: "+49", country: "DE", name: "Germany" },
    { code: "+33", country: "FR", name: "France" },
    { code: "+81", country: "JP", name: "Japan" },
    { code: "+61", country: "AU", name: "Australia" },
    { code: "+55", country: "BR", name: "Brazil" },
    { code: "+7", country: "RU", name: "Russia" },
    { code: "+39", country: "IT", name: "Italy" },
    { code: "+34", country: "ES", name: "Spain" },
    { code: "+82", country: "KR", name: "South Korea" },
    { code: "+31", country: "NL", name: "Netherlands" },
    { code: "+46", country: "SE", name: "Sweden" },
    { code: "+47", country: "NO", name: "Norway" },
    { code: "+41", country: "CH", name: "Switzerland" },
    { code: "+65", country: "SG", name: "Singapore" },
    { code: "+971", country: "AE", name: "UAE" },
    { code: "+966", country: "SA", name: "Saudi Arabia" }
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

  // Fetch settings
  const orgId = getCookie("orgId") as string;
  const { settings, isLoading } = useGeneralSettings(orgId);

  useEffect(() => {
    if (settings && !settings.error && !hasUserInteracted) {
      reset({
        ...settings,
        photos: null,
        printHeaderImage: null
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, hasUserInteracted]);

  // Register propertyType field with validation
  useEffect(() => {
    register("propertyType", { required: "Property type is required" });
  }, [register]);

  // Submit form
  const onSubmit = (data: FormValues) => {
    localStorage.removeItem(STORAGE_KEY);
    console.log("Form Data:", data);
    // Submit data to your API
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 pb-10">
      {/* 1. Property Details */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Property Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Property Type</Label>
            <select
              value={watch("propertyType") || ""}
              onChange={(e) => setValue("propertyType", e.target.value)}
              className="mt-1 block w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
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
            <Label>Phone Country Code</Label>
            <select
              {...register("phoneCode", {
                required: "Phone country code is required"
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
              placeholder="Enter phone number without country code"
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

      {/* 3. Address - Simple Text Inputs */}
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
            <Input {...register("country")} />
          </div>
          <div>
            <Label>State / Province</Label>
            <Input {...register("state")} />
          </div>
          <div>
            <Label>City</Label>
            <Input {...register("city")} />
          </div>
          <div>
            <Label>ZIP / Postal Code</Label>
            <Input {...register("zip")} />
          </div>
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
          <textarea
            {...register("description")}
            className="mt-1 block w-full border border-input bg-background rounded-md px-3 py-2 text-sm min-h-[100px]"
            placeholder="Enter property description..."
          />
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
