// lib/utils/__tests__/nameFormatter.test.ts

import { formatGuestNameForCalendar } from '../nameFormatter';

describe('formatGuestNameForCalendar', () => {
  test('handles empty or invalid input', () => {
    expect(formatGuestNameForCalendar('')).toBe('');
    expect(formatGuestNameForCalendar('   ')).toBe('');
  });

  test('handles single names', () => {
    expect(formatGuestNameForCalendar('John')).toBe('John');
    expect(formatGuestNameForCalendar('Johnathan')).toBe('Johnat...');
  });

  test('handles two names with first initial format', () => {
    expect(formatGuestNameForCalendar('John Doe')).toBe('J. Doe');
    expect(formatGuestNameForCalendar('Mark Waugh')).toBe('M. Waugh');
    expect(formatGuestNameForCalendar('Sumit Bhatia')).toBe('S. Bhatia');
  });

  test('handles multiple names using first and last', () => {
    expect(formatGuestNameForCalendar('John Michael Doe')).toBe('J. Doe');
    expect(formatGuestNameForCalendar('Mary Jane Watson Smith')).toBe('M. Smith');
  });

  test('truncates very long last names', () => {
    expect(formatGuestNameForCalendar('John Waltershaman')).toBe('J. Walte...');
    expect(formatGuestNameForCalendar('Marsh Waltershaman')).toBe('M. Walte...');
  });

  test('handles names with extra whitespace', () => {
    expect(formatGuestNameForCalendar('  John   Doe  ')).toBe('J. Doe');
    expect(formatGuestNameForCalendar('John\t\tDoe')).toBe('J. Doe');
  });

  test('handles edge cases for length limits', () => {
    // Exactly 12 characters should not be truncated
    expect(formatGuestNameForCalendar('A Bcdefghijk')).toBe('A. Bcdefghijk');
    
    // 13 characters should be truncated
    expect(formatGuestNameForCalendar('A Bcdefghijkl')).toBe('A. Bcdefg...');
  });
});
