// TypeScript types for organization onboarding flow

// Import and re-export validation types
import type {
  OrganizationDetailsData,
  AdminUserDetailsData,
  ReviewConfirmationData,
  CompleteOnboardingData,
  OnboardingFormData,
  OnboardingStep
} from "@/lib/validations/organization-onboarding";

export type {
  OrganizationDetailsData,
  AdminUserDetailsData,
  ReviewConfirmationData,
  CompleteOnboardingData,
  OnboardingFormData,
  OnboardingStep
};

// API request/response types
export interface OnboardingApiRequest {
  organizationDetails: {
    name: string;
    domain: string;
    industry: string;
    size: string;
    contactInfo?: {
      phone?: string;
      address?: string;
    };
  };
  adminUserDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  reviewConfirmation: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
  };
}

export interface OnboardingApiResponse {
  success: boolean;
  data?: {
    organizationId: string;
    adminUserId: string;
    organizationName: string;
    adminEmail: string;
    temporaryPassword: string;
    loginUrl: string;
  };
  error?: string;
  details?: string;
}

// Domain validation API types
export interface DomainCheckRequest {
  domain: string;
}

export interface DomainCheckResponse {
  available: boolean;
  domain: string;
  suggestions?: string[];
}

// Email validation API types
export interface EmailCheckRequest {
  email: string;
}

export interface EmailCheckResponse {
  available: boolean;
  email: string;
}

// Form state management types
export interface OnboardingFormState {
  data: OnboardingFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValidating: boolean;
  currentStep: OnboardingStep;
}

export interface OnboardingFormActions {
  updateData: (
    step: OnboardingStep,
    data: Partial<CompleteOnboardingData>
  ) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: OnboardingStep) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setValidating: (isValidating: boolean) => void;
  reset: () => void;
}

// Step component props
export interface StepComponentProps {
  data: Partial<CompleteOnboardingData>;
  errors: Record<string, string>;
  isValidating: boolean;
  onDataChange: (data: Partial<CompleteOnboardingData>) => void;
  onNext: () => void;
  onPrevious?: () => void;
}

// Organization step specific types
export interface OrganizationStepProps {
  data: Partial<OrganizationDetailsData>;
  errors: Record<string, string>;
  isValidating: boolean;
  onDataChange: (data: Partial<OrganizationDetailsData>) => void;
  onDomainCheck: (domain: string) => Promise<boolean>;
  onNext: () => void;
  onPrevious?: () => void;
}

// Admin user step specific types
export interface AdminUserStepProps {
  data: Partial<AdminUserDetailsData>;
  errors: Record<string, string>;
  isValidating: boolean;
  onDataChange: (data: Partial<AdminUserDetailsData>) => void;
  onEmailCheck: (email: string) => Promise<boolean>;
  onNext: () => void;
  onPrevious?: () => void;
}

// Review step specific types
export interface ReviewStepProps {
  organizationData: Partial<OrganizationDetailsData>;
  adminUserData: Partial<AdminUserDetailsData>;
  data: Partial<ReviewConfirmationData>;
  errors: Record<string, string>;
  isValidating: boolean;
  onDataChange: (data: Partial<ReviewConfirmationData>) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onSubmit: () => void;
}

// Step indicator types
export interface StepIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  onStepClick?: (step: OnboardingStep) => void;
}

// Onboarding sheet types
export interface OnboardingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: OnboardingApiResponse["data"]) => void;
}

// Success state types
export interface OnboardingSuccessData {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
  loginUrl: string;
  nextSteps: string[];
}

// Error state types
export interface OnboardingError {
  type: "validation" | "network" | "server" | "unknown";
  message: string;
  details?: string;
  field?: string;
  step?: OnboardingStep;
}

// Validation hook types
export interface UseOnboardingValidationReturn {
  validateStep: (
    step: OnboardingStep,
    data: Record<string, unknown>
  ) => Promise<boolean>;
  validateDomain: (domain: string) => Promise<boolean>;
  validateEmail: (email: string) => Promise<boolean>;
  errors: Record<string, string>;
  isValidating: boolean;
}

// Form hook types
export interface UseOnboardingFormReturn {
  formState: OnboardingFormState;
  actions: OnboardingFormActions;
  validation: UseOnboardingValidationReturn;
  canProceed: boolean;
  canGoBack: boolean;
  isLastStep: boolean;
  isFirstStep: boolean;
}

// Analytics tracking types
export interface OnboardingAnalyticsEvent {
  type:
    | "step_started"
    | "step_completed"
    | "step_abandoned"
    | "form_submitted"
    | "form_completed";
  step?: OnboardingStep;
  organizationId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// Email template types
export interface WelcomeEmailData {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  organizationId: string;
}

// Password generation types
export interface PasswordGenerationOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}

// Database creation types
export interface OrganizationCreationData {
  name: string;
  domain: string;
  industry: string;
  size: string;
  contactPhone?: string;
  contactAddress?: string;
}

export interface AdminUserCreationData {
  name: string;
  email: string;
  phone?: string;
  organizationId: string;
  temporaryPassword: string;
}

// Utility types
export type StepValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export type AsyncValidationResult = Promise<{
  isValid: boolean;
  error?: string;
}>;

// Constants types
export type IndustryType =
  | "hotel"
  | "hostel"
  | "resort"
  | "apartment"
  | "guesthouse"
  | "bnb"
  | "motel"
  | "other";
export type OrganizationSize = "small" | "medium" | "large" | "enterprise";

// Form field types for better type safety
export interface FormField<T = string> {
  value: T;
  error?: string;
  isValidating?: boolean;
  isValid?: boolean;
}

export interface OnboardingFormFields {
  // Organization Details
  organizationName: FormField;
  domain: FormField;
  industry: FormField<IndustryType>;
  size: FormField<OrganizationSize>;
  contactPhone: FormField;
  contactAddress: FormField;

  // Admin User Details
  adminName: FormField;
  adminEmail: FormField;
  adminPhone: FormField;

  // Review & Confirmation
  termsAccepted: FormField<boolean>;
  privacyAccepted: FormField<boolean>;
}

// Navigation types
export interface StepNavigation {
  canGoNext: boolean;
  canGoPrevious: boolean;
  nextLabel: string;
  previousLabel: string;
  isLastStep: boolean;
  isFirstStep: boolean;
}

// Loading states
export interface OnboardingLoadingStates {
  isSubmitting: boolean;
  isDomainValidating: boolean;
  isEmailValidating: boolean;
  isSendingEmail: boolean;
  isCreatingOrganization: boolean;
}

// Success callback types
export type OnboardingSuccessCallback = (data: OnboardingSuccessData) => void;
export type OnboardingErrorCallback = (error: OnboardingError) => void;
export type OnboardingStepChangeCallback = (step: OnboardingStep) => void;
