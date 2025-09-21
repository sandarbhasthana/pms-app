"use client";

// Organization details step component

import React, { useState, useCallback, useEffect } from "react";
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import {
  OrganizationStepProps,
  OrganizationDetailsData
} from "@/lib/types/organization-onboarding";
import {
  INDUSTRY_OPTIONS,
  SIZE_OPTIONS
} from "@/lib/validations/organization-onboarding";

export function OrganizationStep({
  data,
  errors,
  onDataChange,
  onDomainCheck
}: Omit<OrganizationStepProps, "isValidating">) {
  const [domainValidationState, setDomainValidationState] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isValid: null,
    message: ""
  });

  // Debounce domain input for validation
  const debouncedDomain = useDebounce(data.domain || "", 500);

  const validateDomain = useCallback(
    async (domain: string) => {
      setDomainValidationState({
        isChecking: true,
        isValid: null,
        message: "Checking availability..."
      });

      try {
        const isValid = await onDomainCheck(domain);

        setDomainValidationState({
          isChecking: false,
          isValid,
          message: isValid ? "Domain is available!" : "Domain is already taken"
        });
      } catch {
        setDomainValidationState({
          isChecking: false,
          isValid: false,
          message: "Failed to check domain availability"
        });
      }
    },
    [onDomainCheck]
  );

  // Domain validation effect
  useEffect(() => {
    if (debouncedDomain && debouncedDomain.length >= 3) {
      validateDomain(debouncedDomain);
    } else {
      setDomainValidationState({
        isChecking: false,
        isValid: null,
        message: ""
      });
    }
  }, [debouncedDomain, validateDomain]);

  const handleInputChange = useCallback(
    (field: keyof OrganizationDetailsData, value: string) => {
      onDataChange({
        ...data,
        [field]: value
      });
    },
    [data, onDataChange]
  );

  const handleContactInfoChange = useCallback(
    (field: string, value: string) => {
      onDataChange({
        ...data,
        contactInfo: {
          ...data.contactInfo,
          [field]: value
        }
      });
    },
    [data, onDataChange]
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Organization Details
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tell us about your hospitality business
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="org-name" className="text-sm font-medium">
            Organization Name *
          </Label>
          <Input
            id="org-name"
            type="text"
            placeholder="e.g., Grand Palace Hotels"
            value={data.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.name}
            </p>
          )}
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <Label htmlFor="org-domain" className="text-sm font-medium">
            Domain/Subdomain *
          </Label>
          <div className="relative">
            <div className="flex">
              <Input
                id="org-domain"
                type="text"
                placeholder="e.g., grandpalace"
                value={data.domain || ""}
                onChange={(e) =>
                  handleInputChange("domain", e.target.value.toLowerCase())
                }
                className={`pr-10 ${errors.domain ? "border-red-500" : ""}`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {domainValidationState.isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : domainValidationState.isValid === true ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : domainValidationState.isValid === false ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>
          </div>

          {/* Domain validation message */}
          {domainValidationState.message && (
            <p
              className={`text-sm ${
                domainValidationState.isValid === true
                  ? "text-green-600 dark:text-green-400"
                  : domainValidationState.isValid === false
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {domainValidationState.message}
            </p>
          )}

          {errors.domain && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.domain}
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            This will be used for your organization&apos;s unique identifier
          </p>
        </div>

        {/* Industry Type */}
        <div className="space-y-2">
          <Label htmlFor="org-industry" className="text-sm font-medium">
            Industry Type *
          </Label>
          <Select
            value={data.industry || "hotel"}
            onValueChange={(value) => handleInputChange("industry", value)}
          >
            <SelectTrigger className={errors.industry ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.industry && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.industry}
            </p>
          )}
        </div>

        {/* Organization Size */}
        <div className="space-y-2">
          <Label htmlFor="org-size" className="text-sm font-medium">
            Organization Size *
          </Label>
          <Select
            value={data.size || ""}
            onValueChange={(value) => handleInputChange("size", value)}
          >
            <SelectTrigger className={errors.size ? "border-red-500" : ""}>
              <SelectValue placeholder="Select organization size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.size && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.size}
            </p>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Information (Optional)
          </h4>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="org-phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="org-phone"
              type="tel"
              placeholder="e.g., +1 (555) 123-4567"
              value={data.contactInfo?.phone || ""}
              onChange={(e) => handleContactInfoChange("phone", e.target.value)}
              className={errors["contactInfo.phone"] ? "border-red-500" : ""}
            />
            {errors["contactInfo.phone"] && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors["contactInfo.phone"]}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label
              htmlFor="org-address"
              className="text-sm font-medium flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Business Address
            </Label>
            <Textarea
              id="org-address"
              placeholder="Enter your business address"
              value={data.contactInfo?.address || ""}
              onChange={(e) =>
                handleContactInfoChange("address", e.target.value)
              }
              className={`resize-none ${
                errors["contactInfo.address"] ? "border-red-500" : ""
              }`}
              rows={3}
            />
            {errors["contactInfo.address"] && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors["contactInfo.address"]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              About Your Organization
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This information helps us set up your organization correctly. The
              domain will be used to create a unique identifier for your
              business within our platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
