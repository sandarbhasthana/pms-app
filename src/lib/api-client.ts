// File: src/lib/api-client.ts
"use client";

/**
 * Get the current property ID from cookies
 */
export function getCurrentPropertyId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const propertyIdCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('propertyId='));
  
  return propertyIdCookie ? propertyIdCookie.split('=')[1] : null;
}

/**
 * Enhanced fetch function that automatically includes property context
 */
export async function fetchWithPropertyContext(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const propertyId = getCurrentPropertyId();
  
  // Add property context to headers
  const headers = new Headers(options.headers);
  if (propertyId) {
    headers.set('x-property-id', propertyId);
  }
  
  // Include credentials by default
  const enhancedOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers,
  };
  
  return fetch(url, enhancedOptions);
}

/**
 * Helper function to add property context to URL as query parameter
 */
export function addPropertyContextToUrl(url: string): string {
  const propertyId = getCurrentPropertyId();
  if (!propertyId) return url;
  
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.set('propertyId', propertyId);
  return urlObj.toString();
}
