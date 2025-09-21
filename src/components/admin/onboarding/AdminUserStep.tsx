"use client";

// Admin user details step component

import React, { useState, useCallback, useEffect } from "react";
import {
  User,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  Shield
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  AdminUserStepProps,
  AdminUserDetailsData
} from "@/lib/types/organization-onboarding";

export function AdminUserStep({
  data,
  errors,
  onDataChange,
  onEmailCheck
}: Omit<AdminUserStepProps, "isValidating">) {
  const [emailValidationState, setEmailValidationState] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isValid: null,
    message: ""
  });

  // Debounce email input for validation
  const debouncedEmail = useDebounce(data.email || "", 500);

  // Email validation effect - optimized to avoid unnecessary re-renders
  useEffect(() => {
    if (!debouncedEmail || !debouncedEmail.includes("@")) {
      setEmailValidationState({
        isChecking: false,
        isValid: null,
        message: ""
      });
      return;
    }

    // Inline validation to avoid dependency issues
    const validateEmail = async () => {
      setEmailValidationState({
        isChecking: true,
        isValid: null,
        message: "Checking availability..."
      });

      try {
        const isValid = await onEmailCheck(debouncedEmail);

        setEmailValidationState({
          isChecking: false,
          isValid,
          message: isValid
            ? "Email is available!"
            : "Email is already registered"
        });
      } catch {
        setEmailValidationState({
          isChecking: false,
          isValid: false,
          message: "Failed to check email availability"
        });
      }
    };

    validateEmail();
  }, [debouncedEmail, onEmailCheck]);

  const handleInputChange = useCallback(
    (field: keyof AdminUserDetailsData, value: string) => {
      onDataChange({
        ...data,
        [field]: value
      });
    },
    [data, onDataChange]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
          <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Admin User Details
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create the organization administrator account
        </p>
      </div>

      {/* Admin Role Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Organization Administrator
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              This user will have full administrative access to manage the
              organization, properties, users, and all system settings.
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Admin Name */}
        <div className="space-y-2">
          <Label htmlFor="admin-name" className="text-sm font-medium">
            Full Name *
          </Label>
          <Input
            id="admin-name"
            type="text"
            placeholder="e.g., John Smith"
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

        {/* Admin Email */}
        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-sm font-medium">
            Email Address *
          </Label>
          <div className="relative">
            <div className="flex">
              <Input
                id="admin-email"
                type="email"
                placeholder="e.g., admin@grandpalace.com"
                value={data.email || ""}
                onChange={(e) =>
                  handleInputChange("email", e.target.value.toLowerCase())
                }
                className={`pr-10 ${errors.email ? "border-red-500" : ""}`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {emailValidationState.isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : emailValidationState.isValid === true ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : emailValidationState.isValid === false ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>
          </div>

          {/* Email validation message */}
          {emailValidationState.message && (
            <p
              className={`text-sm ${
                emailValidationState.isValid === true
                  ? "text-green-600 dark:text-green-400"
                  : emailValidationState.isValid === false
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {emailValidationState.message}
            </p>
          )}

          {errors.email && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.email}
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            This email will be used for login and system notifications
          </p>
        </div>

        {/* Admin Phone (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="admin-phone" className="text-sm font-medium">
            Phone Number (Optional)
          </Label>
          <Input
            id="admin-phone"
            type="tel"
            placeholder="e.g., +1 (555) 123-4567"
            value={data.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.phone}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Used for account recovery and important notifications
          </p>
        </div>
      </div>

      {/* Password Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Account Credentials
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              A temporary password will be generated and sent to the
              admin&apos;s email address. They will be prompted to change it on
              first login for security.
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps Preview */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          What happens next?
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
            User account will be created with ORG_ADMIN role
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
            Welcome email with login credentials will be sent
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
            Admin can immediately start setting up properties
          </li>
        </ul>
      </div>
    </div>
  );
}
