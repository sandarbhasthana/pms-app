// File: src/components/PropertyCookieManager.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Component that manages the propertyId cookie based on the user's session
 * This ensures API requests have the correct property context
 */
export function PropertyCookieManager() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.currentPropertyId) {
      // Check if propertyId cookie already exists
      const currentPropertyCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('propertyId='));
      
      const currentCookieValue = currentPropertyCookie?.split('=')[1];
      
      // Set or update the propertyId cookie if it doesn't match the session
      if (currentCookieValue !== session.user.currentPropertyId) {
        document.cookie = `propertyId=${session.user.currentPropertyId}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
      }
    }
  }, [session?.user?.currentPropertyId]);

  // This component doesn't render anything
  return null;
}
