"use client";

// Review and confirmation step component

import React, { useCallback } from "react";
import {
  CheckCircle,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  FileText
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  ReviewStepProps,
  ReviewConfirmationData
} from "@/lib/types/organization-onboarding";
import {
  INDUSTRY_OPTIONS,
  SIZE_OPTIONS
} from "@/lib/validations/organization-onboarding";

export function ReviewStep({
  organizationData,
  adminUserData,
  data,
  errors,
  onDataChange
}: ReviewStepProps) {
  const handleCheckboxChange = useCallback(
    (field: keyof ReviewConfirmationData, checked: boolean) => {
      onDataChange({
        ...data,
        [field]: checked
      });
    },
    [data, onDataChange]
  );

  // Helper function to get industry label
  const getIndustryLabel = (value: string) => {
    return (
      INDUSTRY_OPTIONS.find((option) => option.value === value)?.label || value
    );
  };

  // Helper function to get size label
  const getSizeLabel = (value: string) => {
    return (
      SIZE_OPTIONS.find((option) => option.value === value)?.label || value
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Review & Confirm
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Please review all details before creating the organization
        </p>
      </div>

      {/* Organization Details Review */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Organization Details
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Name:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {organizationData.name || "Not specified"}
            </p>
          </div>

          <div>
            <span className="text-gray-500 dark:text-gray-400">Domain:</span>
            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {organizationData.domain || "Not specified"}
            </p>
          </div>

          <div>
            <span className="text-gray-500 dark:text-gray-400">Industry:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {organizationData.industry
                ? getIndustryLabel(organizationData.industry)
                : "Not specified"}
            </p>
          </div>

          <div>
            <span className="text-gray-500 dark:text-gray-400">Size:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {organizationData.size
                ? getSizeLabel(organizationData.size)
                : "Not specified"}
            </p>
          </div>

          {organizationData.contactInfo?.phone && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Phone:</span>
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {organizationData.contactInfo.phone}
              </p>
            </div>
          )}

          {organizationData.contactInfo?.address && (
            <div className="md:col-span-2">
              <span className="text-gray-500 dark:text-gray-400">Address:</span>
              <p className="font-medium text-gray-900 dark:text-white flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {organizationData.contactInfo.address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admin User Details Review */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Administrator Details
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Name:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {adminUserData.name || "Not specified"}
            </p>
          </div>

          <div>
            <span className="text-gray-500 dark:text-gray-400">Email:</span>
            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {adminUserData.email || "Not specified"}
            </p>
          </div>

          {adminUserData.phone && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Phone:</span>
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {adminUserData.phone}
              </p>
            </div>
          )}

          <div>
            <span className="text-gray-500 dark:text-gray-400">Role:</span>
            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Organization Administrator
            </p>
          </div>
        </div>
      </div>

      {/* What Will Happen */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
          What will happen when you create this organization?
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Organization will be created with the specified details
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Admin user account will be created with full access
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Temporary password will be generated and emailed
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Organization will be ready for property setup
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Analytics tracking will begin immediately
          </li>
        </ul>
      </div>

      {/* Terms and Conditions */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={data.termsAccepted || false}
            onCheckedChange={(checked) =>
              handleCheckboxChange("termsAccepted", checked as boolean)
            }
            className={errors.termsAccepted ? "border-red-500" : ""}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the Terms and Conditions *
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By creating this organization, you agree to our terms of service
              and usage policies.
            </p>
          </div>
        </div>

        {errors.termsAccepted && (
          <p className="text-sm text-red-600 dark:text-red-400 ml-6">
            {errors.termsAccepted}
          </p>
        )}

        <div className="flex items-start space-x-3">
          <Checkbox
            id="privacy"
            checked={data.privacyAccepted || false}
            onCheckedChange={(checked) =>
              handleCheckboxChange("privacyAccepted", checked as boolean)
            }
            className={errors.privacyAccepted ? "border-red-500" : ""}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="privacy"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the Privacy Policy *
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You acknowledge that you have read and understand our privacy
              policy.
            </p>
          </div>
        </div>

        {errors.privacyAccepted && (
          <p className="text-sm text-red-600 dark:text-red-400 ml-6">
            {errors.privacyAccepted}
          </p>
        )}
      </div>

      {/* Final Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Important Notice
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Once created, some organization details (like domain) cannot be
              easily changed. Please ensure all information is correct before
              proceeding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
