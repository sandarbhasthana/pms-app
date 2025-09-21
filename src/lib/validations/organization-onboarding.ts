// Validation schemas for organization onboarding flow

import { z } from "zod";

// Step 1: Organization Details Schema
export const organizationDetailsSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters")
    .trim(),

  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(50, "Domain must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
      "Domain can only contain letters, numbers, and hyphens"
    )
    .toLowerCase()
    .trim(),

  industry: z.enum(
    [
      "hotel",
      "motel",
      "resort",
      "hostel",
      "bnb",
      "guesthouse",
      "apartment",
      "vacation_rental",
      "boutique",
      "lodge",
      "inn",
      "other"
    ],
    {
      required_error: "Please select an industry type"
    }
  ),

  size: z.enum(
    [
      "small", // 1-10 properties
      "medium", // 11-50 properties
      "large", // 51-200 properties
      "enterprise" // 200+ properties
    ],
    {
      required_error: "Please select organization size"
    }
  ),

  contactInfo: z
    .object({
      phone: z
        .string()
        .optional()
        .refine((val) => !val || val.length >= 10, {
          message: "Phone number must be at least 10 digits"
        }),

      address: z
        .string()
        .max(500, "Address must be less than 500 characters")
        .optional()
    })
    .optional()
});

// Step 2: Admin User Details Schema
export const adminUserDetailsSchema = z.object({
  name: z
    .string()
    .min(2, "Admin name must be at least 2 characters")
    .max(100, "Admin name must be less than 100 characters")
    .trim(),

  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "Phone number must be at least 10 digits"
    })
});

// Step 3: Review & Confirmation Schema
export const reviewConfirmationSchema = z.object({
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions to proceed"
  }),

  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy to proceed"
  })
});

// Complete onboarding form schema
export const completeOnboardingSchema = z.object({
  organizationDetails: organizationDetailsSchema,
  adminUserDetails: adminUserDetailsSchema,
  reviewConfirmation: reviewConfirmationSchema
});

// Individual step validation schemas for progressive validation
export const stepSchemas = {
  1: organizationDetailsSchema,
  2: adminUserDetailsSchema,
  3: reviewConfirmationSchema
} as const;

// Type definitions
export type OrganizationDetailsData = z.infer<typeof organizationDetailsSchema>;
export type AdminUserDetailsData = z.infer<typeof adminUserDetailsSchema>;
export type ReviewConfirmationData = z.infer<typeof reviewConfirmationSchema>;
export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>;

// Form step type
export type OnboardingStep = 1 | 2 | 3;

// Combined form data type for state management
export interface OnboardingFormData {
  organizationDetails: Partial<OrganizationDetailsData>;
  adminUserDetails: Partial<AdminUserDetailsData>;
  reviewConfirmation: Partial<ReviewConfirmationData>;
  currentStep: OnboardingStep;
}

// Industry options for dropdown
export const INDUSTRY_OPTIONS = [
  { value: "hotel", label: "Hotel" },
  { value: "motel", label: "Motel" },
  { value: "resort", label: "Resort" },
  { value: "hostel", label: "Hostel" },
  { value: "bnb", label: "Bed & Breakfast" },
  { value: "guesthouse", label: "Guest House" },
  { value: "apartment", label: "Apartment/Serviced Apartment" },
  { value: "vacation_rental", label: "Vacation Rental" },
  { value: "boutique", label: "Boutique Hotel" },
  { value: "lodge", label: "Lodge" },
  { value: "inn", label: "Inn" },
  { value: "other", label: "Other" }
] as const;

// Organization size options for dropdown
export const SIZE_OPTIONS = [
  {
    value: "small",
    label: "Small (1-10 properties)",
    description: "Perfect for independent operators"
  },
  {
    value: "medium",
    label: "Medium (11-50 properties)",
    description: "Growing hospitality businesses"
  },
  {
    value: "large",
    label: "Large (51-200 properties)",
    description: "Established hospitality groups"
  },
  {
    value: "enterprise",
    label: "Enterprise (200+ properties)",
    description: "Large hospitality chains"
  }
] as const;

// Validation error messages
export const VALIDATION_MESSAGES = {
  ORGANIZATION_NAME_REQUIRED: "Organization name is required",
  ORGANIZATION_NAME_TOO_SHORT:
    "Organization name must be at least 2 characters",
  ORGANIZATION_NAME_TOO_LONG:
    "Organization name must be less than 100 characters",

  DOMAIN_REQUIRED: "Domain is required",
  DOMAIN_TOO_SHORT: "Domain must be at least 3 characters",
  DOMAIN_TOO_LONG: "Domain must be less than 50 characters",
  DOMAIN_INVALID_FORMAT:
    "Domain can only contain letters, numbers, and hyphens",
  DOMAIN_ALREADY_EXISTS: "This domain is already taken",

  INDUSTRY_REQUIRED: "Please select an industry type",
  SIZE_REQUIRED: "Please select organization size",

  ADMIN_NAME_REQUIRED: "Admin name is required",
  ADMIN_NAME_TOO_SHORT: "Admin name must be at least 2 characters",
  ADMIN_NAME_TOO_LONG: "Admin name must be less than 100 characters",

  ADMIN_EMAIL_REQUIRED: "Admin email is required",
  ADMIN_EMAIL_INVALID: "Please enter a valid email address",
  ADMIN_EMAIL_ALREADY_EXISTS: "This email is already registered",

  PHONE_INVALID: "Phone number must be at least 10 digits",
  ADDRESS_TOO_LONG: "Address must be less than 500 characters",

  TERMS_REQUIRED: "You must accept the terms and conditions",
  PRIVACY_REQUIRED: "You must accept the privacy policy"
} as const;

// Helper function to validate a specific step
export function validateStep(step: OnboardingStep, data: unknown) {
  const schema = stepSchemas[step];
  return schema.safeParse(data);
}

// Helper function to get validation errors for a step
export function getStepErrors(step: OnboardingStep, data: unknown) {
  const result = validateStep(step, data);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join(".");
    errors[path] = error.message;
  });

  return errors;
}

// Helper function to check if a step is valid
export function isStepValid(step: OnboardingStep, data: unknown): boolean {
  const result = validateStep(step, data);
  return result.success;
}

// Helper function to get the next step
export function getNextStep(
  currentStep: OnboardingStep
): OnboardingStep | null {
  if (currentStep < 3) {
    return (currentStep + 1) as OnboardingStep;
  }
  return null;
}

// Helper function to get the previous step
export function getPreviousStep(
  currentStep: OnboardingStep
): OnboardingStep | null {
  if (currentStep > 1) {
    return (currentStep - 1) as OnboardingStep;
  }
  return null;
}

// Step titles for UI
export const STEP_TITLES = {
  1: "Organization Details",
  2: "Admin User",
  3: "Review & Confirm"
} as const;

// Step descriptions for UI
export const STEP_DESCRIPTIONS = {
  1: "Tell us about your organization",
  2: "Create the admin user account",
  3: "Review and confirm all details"
} as const;
