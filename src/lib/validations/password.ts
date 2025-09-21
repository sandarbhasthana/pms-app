// Password validation schemas and utilities

import { z } from "zod";

/**
 * Password validation schema
 * Requirements: 8-15 chars, uppercase, lowercase, number, special char
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(15, "Password must be no more than 15 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

/**
 * Password confirmation schema
 */
export const passwordConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Set password schema (for users without passwords)
 */
export const setPasswordSchema = passwordConfirmSchema;

/**
 * Change password schema (for users with existing passwords)
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

/**
 * Login with password schema
 */
export const loginWithPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Dev login schema (email only)
 */
export const devLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

/**
 * Password strength checker
 */
export function checkPasswordStrength(password: string): {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
    feedback.push("Consider using 12+ characters for better security");
  } else {
    feedback.push("Password is too short");
  }

  // Character type checks
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add lowercase letters");
  }

  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add uppercase letters");
  }

  if (/[0-9]/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add numbers");
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push("Add special characters");
  }

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong';
  if (score >= 80) {
    level = 'strong';
  } else if (score >= 60) {
    level = 'good';
  } else if (score >= 40) {
    level = 'fair';
  } else {
    level = 'weak';
  }

  return { score, level, feedback };
}

/**
 * Password requirements for UI display
 */
export const PASSWORD_REQUIREMENTS = [
  "8-15 characters long",
  "At least one lowercase letter (a-z)",
  "At least one uppercase letter (A-Z)", 
  "At least one number (0-9)",
  "At least one special character (!@#$%^&*)",
] as const;

/**
 * Password validation messages
 */
export const PASSWORD_MESSAGES = {
  TOO_SHORT: "Password must be at least 8 characters",
  TOO_LONG: "Password must be no more than 15 characters",
  NO_LOWERCASE: "Password must contain at least one lowercase letter",
  NO_UPPERCASE: "Password must contain at least one uppercase letter",
  NO_NUMBER: "Password must contain at least one number",
  NO_SPECIAL: "Password must contain at least one special character",
  NO_MATCH: "Passwords don't match",
  SAME_AS_CURRENT: "New password must be different from current password",
  REQUIRED: "Password is required",
  CURRENT_REQUIRED: "Current password is required",
} as const;

/**
 * Validate password in real-time (for UI feedback)
 */
export function validatePasswordRealtime(password: string): {
  isValid: boolean;
  errors: string[];
  requirements: Array<{
    text: string;
    met: boolean;
  }>;
} {
  const errors: string[] = [];
  const requirements = [
    {
      text: "8-15 characters",
      met: password.length >= 8 && password.length <= 15,
    },
    {
      text: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      text: "One uppercase letter", 
      met: /[A-Z]/.test(password),
    },
    {
      text: "One number",
      met: /[0-9]/.test(password),
    },
    {
      text: "One special character",
      met: /[^a-zA-Z0-9]/.test(password),
    },
  ];

  // Collect errors
  requirements.forEach(req => {
    if (!req.met) {
      errors.push(req.text);
    }
  });

  const isValid = requirements.every(req => req.met);

  return {
    isValid,
    errors,
    requirements,
  };
}

/**
 * Generate password strength color
 */
export function getPasswordStrengthColor(level: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (level) {
    case 'weak':
      return 'text-red-600 dark:text-red-400';
    case 'fair':
      return 'text-orange-600 dark:text-orange-400';
    case 'good':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'strong':
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Generate password strength background color for progress bar
 */
export function getPasswordStrengthBgColor(level: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (level) {
    case 'weak':
      return 'bg-red-500';
    case 'fair':
      return 'bg-orange-500';
    case 'good':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
}
