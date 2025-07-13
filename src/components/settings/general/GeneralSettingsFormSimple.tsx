"use client";

import "@/app/globals.css";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// import { Select } from "@/components/ui/select";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useGeneralSettings } from "@/lib/hooks/useGeneralSettings";
import { getCookie } from "cookies-next";

type FormValues = {
  propertyType: string;
  propertyName: string;
  propertyPhone: string;
  propertyEmail: string;
  propertyWebsite: string;
  firstName: string;
  lastName: string;
  photos: FileList | null;
  printHeaderImage: File | null;
};

export default function GeneralSettingsForm() {
  const {
    register,
    handleSubmit,
    setValue,
    //reset,
    formState: { errors }
  } = useForm<FormValues>({
    mode: "onBlur"
  });

  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [printHeaderPreview, setPrintHeaderPreview] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orgId = getCookie("orgId") as string;
  const { settings, isLoading, mutate } = useGeneralSettings(orgId);

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

  // Load settings data into form
  useEffect(() => {
    if (settings) {
      Object.entries(settings).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        // Only set values for fields that exist in our simplified form
        if (
          key in
          {
            propertyType: true,
            propertyName: true,
            propertyPhone: true,
            propertyEmail: true,
            propertyWebsite: true,
            firstName: true,
            lastName: true
          }
        ) {
          setValue(key as keyof FormValues, value as string, {
            shouldDirty: false
          });
        }
      });
    }
  }, [settings, setValue]);

  // Handle photo preview
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const previews = Array.from(files).map((file) =>
        URL.createObjectURL(file)
      );
      setPhotoPreview(previews);
    }
  };

  // Handle print header image preview
  const handlePrintHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setPrintHeaderPreview(preview);
    }
  };

  // Submit form
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();

      formData.append("orgId", orgId);
      formData.append("propertyType", data.propertyType);
      formData.append("propertyName", data.propertyName);
      formData.append("propertyPhone", data.propertyPhone);
      formData.append("propertyEmail", data.propertyEmail);
      formData.append("propertyWebsite", data.propertyWebsite);
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);

      // Handle photos
      if (data.photos) {
        Array.from(data.photos).forEach((photo) => {
          formData.append(`photos`, photo);
        });
      }

      // Handle print header image
      if (data.printHeaderImage) {
        formData.append("printHeaderImage", data.printHeaderImage);
      }

      const response = await fetch("/api/settings/general", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        console.log("Settings saved successfully");
        mutate(); // Refresh the data
      } else {
        console.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">General Settings</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Property Type */}
        <div>
          <Label htmlFor="propertyType">Property Type *</Label>
          <select
            {...register("propertyType", {
              required: "Property type is required"
            })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select property type</option>
            {propertyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.propertyType && (
            <p className="text-red-500 text-sm mt-1">
              {errors.propertyType.message}
            </p>
          )}
        </div>

        {/* Property Name */}
        <div>
          <Label htmlFor="propertyName">Property Name *</Label>
          <Input
            {...register("propertyName", {
              required: "Property name is required"
            })}
            placeholder="Enter property name"
          />
          {errors.propertyName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.propertyName.message}
            </p>
          )}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="propertyPhone">Phone</Label>
            <Input
              {...register("propertyPhone")}
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <Label htmlFor="propertyEmail">Email</Label>
            <Input
              {...register("propertyEmail")}
              type="email"
              placeholder="Enter email address"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <Label htmlFor="propertyWebsite">Website</Label>
          <Input
            {...register("propertyWebsite")}
            placeholder="Enter website URL"
          />
        </div>

        {/* Owner Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input {...register("firstName")} placeholder="Enter first name" />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input {...register("lastName")} placeholder="Enter last name" />
          </div>
        </div>

        {/* Photos */}
        <div>
          <Label htmlFor="photos">Property Photos</Label>
          <Input
            {...register("photos")}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {photoPreview.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {photoPreview.map((preview, index) => (
                <Image
                  key={index}
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  width={100}
                  height={100}
                  className="object-cover rounded"
                />
              ))}
            </div>
          )}
        </div>

        {/* Print Header Image */}
        <div>
          <Label htmlFor="printHeaderImage">Print Header Image</Label>
          <Input
            {...register("printHeaderImage")}
            type="file"
            accept="image/*"
            onChange={handlePrintHeaderChange}
          />
          {printHeaderPreview && (
            <div className="mt-2">
              <Image
                src={printHeaderPreview}
                alt="Print header preview"
                width={200}
                height={100}
                className="object-cover rounded"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
