// Secure password generation utilities

import { PasswordGenerationOptions } from "@/lib/types/organization-onboarding";

/**
 * Generate a secure random password
 * @param options - Password generation options
 * @returns Generated password string
 */
export function generateSecurePassword(options?: Partial<PasswordGenerationOptions>): string {
  const defaultOptions: PasswordGenerationOptions = {
    length: 12,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true,
  };

  const config = { ...defaultOptions, ...options };

  // Character sets
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Similar characters to exclude (0, O, l, 1, I)
  const similarChars = config.excludeSimilar ? '0Ol1I' : '';

  // Build character pool
  let charPool = '';
  if (config.includeLowercase) charPool += lowercase;
  if (config.includeUppercase) charPool += uppercase;
  if (config.includeNumbers) charPool += numbers;
  if (config.includeSymbols) charPool += symbols;

  // Remove similar characters if requested
  if (config.excludeSimilar) {
    charPool = charPool.split('').filter(char => !similarChars.includes(char)).join('');
  }

  if (charPool.length === 0) {
    throw new Error('No character types selected for password generation');
  }

  // Generate password
  let password = '';
  
  // Ensure at least one character from each selected type
  const requiredChars: string[] = [];
  if (config.includeLowercase) {
    const filteredLowercase = config.excludeSimilar 
      ? lowercase.split('').filter(char => !similarChars.includes(char)).join('')
      : lowercase;
    requiredChars.push(getRandomChar(filteredLowercase));
  }
  if (config.includeUppercase) {
    const filteredUppercase = config.excludeSimilar 
      ? uppercase.split('').filter(char => !similarChars.includes(char)).join('')
      : uppercase;
    requiredChars.push(getRandomChar(filteredUppercase));
  }
  if (config.includeNumbers) {
    const filteredNumbers = config.excludeSimilar 
      ? numbers.split('').filter(char => !similarChars.includes(char)).join('')
      : numbers;
    requiredChars.push(getRandomChar(filteredNumbers));
  }
  if (config.includeSymbols) {
    requiredChars.push(getRandomChar(symbols));
  }

  // Add required characters
  password += requiredChars.join('');

  // Fill remaining length with random characters
  const remainingLength = config.length - requiredChars.length;
  for (let i = 0; i < remainingLength; i++) {
    password += getRandomChar(charPool);
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
}

/**
 * Get a random character from a string
 */
function getRandomChar(str: string): string {
  return str.charAt(Math.floor(Math.random() * str.length));
}

/**
 * Shuffle a string randomly
 */
function shuffleString(str: string): string {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
}

/**
 * Generate a memorable password (easier to type but still secure)
 * Uses word-like patterns with numbers and symbols
 */
export function generateMemorablePassword(length: number = 12): string {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';
  const numbers = '23456789'; // Exclude 0 and 1 for clarity
  const symbols = '!@#$%&*';

  let password = '';
  let useConsonant = Math.random() > 0.5;

  // Generate word-like pattern
  while (password.length < length - 2) {
    if (useConsonant) {
      password += getRandomChar(consonants);
      if (Math.random() > 0.7) { // Sometimes add uppercase
        password = password.slice(0, -1) + password.slice(-1).toUpperCase();
      }
    } else {
      password += getRandomChar(vowels);
    }
    useConsonant = !useConsonant;
  }

  // Add number and symbol at the end
  password += getRandomChar(numbers);
  password += getRandomChar(symbols);

  return password;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Strength score (0-100) and feedback
 */
export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
    feedback.push('Consider using at least 12 characters for better security');
  } else {
    feedback.push('Password should be at least 8 characters long');
  }

  // Character type checks
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  else feedback.push('Add special characters');

  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters
  else feedback.push('Avoid repeating characters');

  if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def/.test(password.toLowerCase())) {
    score += 5; // No sequential patterns
  } else {
    feedback.push('Avoid sequential patterns');
  }

  const isStrong = score >= 80;

  return {
    score,
    feedback,
    isStrong,
  };
}

/**
 * Generate multiple password options for user to choose from
 */
export function generatePasswordOptions(count: number = 3): string[] {
  const options: string[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      // First option: standard secure password
      options.push(generateSecurePassword());
    } else if (i === 1) {
      // Second option: memorable password
      options.push(generateMemorablePassword());
    } else {
      // Additional options: variations
      options.push(generateSecurePassword({
        length: 14,
        includeSymbols: Math.random() > 0.5,
      }));
    }
  }

  return options;
}

/**
 * Check if password contains common weak patterns
 */
export function hasWeakPatterns(password: string): boolean {
  const weakPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /welcome/i,
    /login/i,
    /(.)\1{3,}/, // 4+ repeated characters
    /^[a-zA-Z]+$/, // Only letters
    /^[0-9]+$/, // Only numbers
  ];

  return weakPatterns.some(pattern => pattern.test(password));
}
