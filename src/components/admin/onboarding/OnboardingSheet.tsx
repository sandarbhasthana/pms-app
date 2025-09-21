"use client";

// Main onboarding sheet component using NewBookingSheet pattern

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  OnboardingStep,
  OnboardingSheetProps,
  OnboardingApiResponse
} from "@/lib/types/organization-onboarding";
import {
  completeOnboardingSchema,
  CompleteOnboardingData,
  STEP_DESCRIPTIONS
} from "@/lib/validations/organization-onboarding";

import { StepIndicator } from "./StepIndicator";
import { OrganizationStep } from "./OrganizationStep";
import { AdminUserStep } from "./AdminUserStep";
import { ReviewStep } from "./ReviewStep";

export function OnboardingSheet({
  isOpen,
  onClose,
  onSuccess
}: OnboardingSheetProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state management
  const form = useForm<CompleteOnboardingData>({
    resolver: zodResolver(completeOnboardingSchema),
    defaultValues: {
      organizationDetails: {
        name: "",
        domain: "",
        industry: "hotel",
        size: "small",
        contactInfo: {
          phone: "",
          address: ""
        }
      },
      adminUserDetails: {
        name: "",
        email: "",
        phone: ""
      },
      reviewConfirmation: {
        termsAccepted: false,
        privacyAccepted: false
      }
    },
    mode: "onChange"
  });

  const {
    watch,
    trigger,
    getValues,
    formState: { errors }
  } = form;
  const formData = watch();

  // Step navigation helpers
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 3;
  const canGoBack = !isFirstStep && !isSubmitting;

  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    try {
      let isValid = false;

      switch (currentStep) {
        case 1:
          isValid = await trigger("organizationDetails");
          break;
        case 2:
          isValid = await trigger("adminUserDetails");
          break;
        case 3:
          isValid = await trigger("reviewConfirmation");
          break;
      }

      return isValid;
    } catch (error) {
      console.error("Step validation error:", error);
      return false;
    }
  }, [currentStep, trigger]);

  // Form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const formValues = getValues();

      // Final validation
      const isValid = await trigger();
      if (!isValid) {
        toast.error("Please fix all errors before submitting");
        return;
      }

      // Submit to API
      const response = await fetch("/api/admin/organizations/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formValues)
      });

      const result: OnboardingApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create organization");
      }

      // Success
      toast.success("Organization created successfully!");
      toast.success(
        `Welcome email sent to ${formValues.adminUserDetails.email}`
      );

      if (onSuccess && result.data) {
        onSuccess(result.data);
      }

      onClose();
    } catch (error) {
      console.error("Onboarding submission error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create organization"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [getValues, trigger, onSuccess, onClose]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep();

    if (!isValid) {
      toast.error("Please fix the errors before proceeding");
      return;
    }

    if (isLastStep) {
      await handleSubmit();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 3) as OnboardingStep);
    }
  }, [isLastStep, validateCurrentStep, handleSubmit]);

  const handlePrevious = useCallback(() => {
    if (canGoBack) {
      setCurrentStep((prev) => Math.max(prev - 1, 1) as OnboardingStep);
    }
  }, [canGoBack]);

  const handleStepClick = useCallback(
    (step: OnboardingStep) => {
      if (step < currentStep || step === currentStep) {
        setCurrentStep(step);
      }
    },
    [currentStep]
  );

  // Domain validation
  const validateDomain = useCallback(
    async (domain: string): Promise<boolean> => {
      if (!domain || domain.length < 3) return false;

      try {
        const response = await fetch(
          `/api/admin/organizations/check-domain?domain=${encodeURIComponent(
            domain
          )}`
        );
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Domain validation failed");
          return false;
        }

        if (!data.available) {
          toast.error(`Domain "${domain}" is already taken`);
          if (data.suggestions?.length > 0) {
            toast.info(`Try: ${data.suggestions.slice(0, 2).join(", ")}`);
          }
          return false;
        }

        return true;
      } catch (error) {
        console.error("Domain validation error:", error);
        toast.error("Failed to validate domain");
        return false;
      }
    },
    []
  );

  // Email validation
  const validateEmail = useCallback(async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) return false;

    try {
      const response = await fetch(
        `/api/admin/organizations/check-email?email=${encodeURIComponent(
          email
        )}`
      );
      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (data.error === "Invalid email domain") {
          toast.error(
            data.message || "Please use a valid business email address"
          );
          if (data.suggestions && data.suggestions.length > 0) {
            toast.info(
              `Suggestions: ${data.suggestions.slice(0, 2).join(", ")}`
            );
          }
        } else {
          toast.error(data.error || "Email validation failed");
        }
        return false;
      }

      if (!data.available) {
        toast.error(`Email "${email}" is already registered`);
        if (data.existingUser) {
          toast.info(`Used by: ${data.existingUser.name}`);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("Email validation error:", error);
      toast.error("Failed to validate email");
      return false;
    }
  }, []);

  // Close handler
  const handleClose = useCallback(() => {
    if (isSubmitting) {
      toast.error("Cannot close while creating organization");
      return;
    }

    onClose();
  }, [isSubmitting, onClose]);

  // Render current step component
  const renderStepContent = () => {
    const commonProps = {
      errors: errors as Record<string, string>,
      onNext: handleNext,
      onPrevious: canGoBack ? handlePrevious : undefined
    };

    switch (currentStep) {
      case 1:
        return (
          <OrganizationStep
            {...commonProps}
            data={formData.organizationDetails}
            onDataChange={(data) => {
              // Update form values directly by merging with existing data
              const currentData = form.getValues("organizationDetails");
              form.setValue("organizationDetails", { ...currentData, ...data });
            }}
            onDomainCheck={validateDomain}
          />
        );

      case 2:
        return (
          <AdminUserStep
            {...commonProps}
            data={formData.adminUserDetails}
            onDataChange={(data) => {
              // Update form values directly by merging with existing data
              const currentData = form.getValues("adminUserDetails");
              form.setValue("adminUserDetails", { ...currentData, ...data });
            }}
            onEmailCheck={validateEmail}
          />
        );

      case 3:
        return (
          <ReviewStep
            {...commonProps}
            isValidating={false}
            organizationData={formData.organizationDetails}
            adminUserData={formData.adminUserDetails}
            data={formData.reviewConfirmation}
            onDataChange={(data) => {
              // Update form values directly by merging with existing data
              const currentData = form.getValues("reviewConfirmation");
              form.setValue("reviewConfirmation", { ...currentData, ...data });
            }}
            onSubmit={handleSubmit}
          />
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Organization Onboarding
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {STEP_DESCRIPTIONS[currentStep]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <StepIndicator
            currentStep={currentStep}
            completedSteps={[]}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="max-w-full">{renderStepContent()}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={!canGoBack || isSubmitting}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : isLastStep ? (
              "Create Organization"
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
