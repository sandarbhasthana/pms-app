// File: src/components/admin/PropertyForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Phone, Mail, Globe, ArrowLeft } from "lucide-react";

const propertySchema = z.object({
  name: z
    .string()
    .min(1, "Property name is required")
    .max(100, "Name too long"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional()
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: PropertyFormData & { id: string };
  onSubmit: (data: PropertyFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PropertyForm({
  property,
  onSubmit,
  onCancel,
  isLoading = false
}: PropertyFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: property || {
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      timezone: "UTC",
      currency: "USD",
      isActive: true,
      isDefault: false
    }
  });

  const isDefaultValue = watch("isDefault");

  const handleFormSubmit = async (data: PropertyFormData) => {
    try {
      setSubmitError(null);
      await onSubmit(data);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>{property ? "Edit Property" : "Create New Property"}</span>
          </CardTitle>
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
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter property name"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Brief description of the property"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Address</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Enter street address"
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Enter city"
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  {...register("state")}
                  placeholder="Enter state"
                  className={errors.state ? "border-red-500" : ""}
                />
                {errors.state && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.state.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                <Input
                  id="zipCode"
                  {...register("zipCode")}
                  placeholder="Enter ZIP code"
                  className={errors.zipCode ? "border-red-500" : ""}
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.zipCode.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  {...register("country")}
                  placeholder="Enter country"
                  className={errors.country ? "border-red-500" : ""}
                />
                {errors.country && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.country.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Phone</span>
                </Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter email address"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label
                  htmlFor="website"
                  className="flex items-center space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </Label>
                <Input
                  id="website"
                  {...register("website")}
                  placeholder="https://example.com"
                  className={errors.website ? "border-red-500" : ""}
                />
                {errors.website && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.website.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  {...register("timezone")}
                  placeholder="UTC"
                  className={errors.timezone ? "border-red-500" : ""}
                />
                {errors.timezone && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.timezone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  {...register("currency")}
                  placeholder="USD"
                  className={errors.currency ? "border-red-500" : ""}
                />
                {errors.currency && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.currency.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="isActive"
                checked={watch("isActive")}
                onCheckedChange={(checked) => setValue("isActive", !!checked)}
                className="mt-0.5"
              />
              <Label
                htmlFor="isActive"
                className="text-sm font-medium leading-5 cursor-pointer"
              >
                Property is active
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="isDefault"
                checked={isDefaultValue}
                onCheckedChange={(checked) => setValue("isDefault", !!checked)}
                className="mt-0.5"
              />
              <Label
                htmlFor="isDefault"
                className="text-sm font-medium leading-5 cursor-pointer"
              >
                Set as default property for new users
              </Label>
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
              className="flex items-center space-x-1 border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to List</span>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-purple-primary text-white hover:bg-purple-dark border-purple-primary"
            >
              {isSubmitting || isLoading
                ? "Saving..."
                : property
                ? "Update Property"
                : "Create Property"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
