// File: src/components/PropertySwitcher.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Building2, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Use the PropertyInfo type from NextAuth types
interface PropertyInfo {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  role?: string;
}

interface PropertySwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export function PropertySwitcher({
  className = "",
  showLabel = true
}: PropertySwitcherProps) {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [currentProperty, setCurrentProperty] = useState<PropertyInfo | null>(
    null
  );

  // Load property context from session
  useEffect(() => {
    if (session?.user?.availableProperties) {
      setProperties(session.user.availableProperties);

      // Check existing cookie first to maintain user's selection
      const existingCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("propertyId="));

      let cookiePropertyId = null;
      if (existingCookie) {
        cookiePropertyId = existingCookie.split("=")[1];
      }

      // Debug: Log the property selection process
      console.log(`🏢 Available properties:`, session.user.availableProperties);
      console.log(`🍪 Cookie propertyId:`, cookiePropertyId);
      console.log(
        `📱 Session currentPropertyId:`,
        session.user.currentPropertyId
      );

      // Find current property - prioritize cookie, then session, then default
      let current = null;

      if (cookiePropertyId) {
        // First try to use property from cookie
        current = session.user.availableProperties.find(
          (p) => p.id === cookiePropertyId
        );
        console.log(`🍪 Found property from cookie:`, current?.name);
      }

      if (!current && session.user.currentPropertyId) {
        // Fallback to session property
        current = session.user.availableProperties.find(
          (p) => p.id === session.user.currentPropertyId
        );
        console.log(`📱 Found property from session:`, current?.name);
      }

      if (!current) {
        // Final fallback to default property or first available
        current =
          session.user.availableProperties.find((p) => p.isDefault) ||
          session.user.availableProperties[0];
        console.log(`🏠 Using fallback property:`, current?.name);
      }

      console.log(`✅ Final selected property:`, current?.name, current?.id);
      setCurrentProperty(current);

      // Set property ID cookie if we have a current property and no existing cookie
      if (current?.id && !existingCookie) {
        const maxAge = 60 * 60 * 24 * 30; // 30 days
        document.cookie = `propertyId=${current.id}; path=/; max-age=${maxAge}`;
      }
    }
  }, [session]);

  // Handle property switching
  const handlePropertySwitch = async (propertyId: string) => {
    if (propertyId === currentProperty?.id || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/switch-property", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ propertyId })
      });

      if (!response.ok) {
        throw new Error("Failed to switch property");
      }

      // Update local state immediately for instant UI feedback
      const newProperty = properties.find((p) => p.id === propertyId);
      if (newProperty) {
        setCurrentProperty(newProperty);
      }

      // Set property ID in cookie for API requests
      const maxAge = 60 * 60 * 24 * 30; // 30 days

      // Clear existing propertyId cookie first to avoid conflicts
      document.cookie = `propertyId=; path=/; max-age=0`;

      // Set the new cookie with explicit settings
      const isSecure = window.location.protocol === "https:";
      document.cookie = `propertyId=${propertyId}; path=/; max-age=${maxAge}; SameSite=Lax${
        isSecure ? "; Secure" : ""
      }`;

      // Debug: Log the cookie setting
      console.log(`🍪 Setting propertyId cookie to: ${propertyId}`);
      console.log(`🍪 Current cookies after setting:`, document.cookie);

      // Verify the cookie was set correctly before proceeding
      await new Promise((resolve) => setTimeout(resolve, 100));
      const verifyCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("propertyId="));
      console.log(`🍪 Cookie after setting:`, verifyCookie);

      // Update session to reflect the property change
      console.log(`📱 Updating session with propertyId: ${propertyId}`);
      await update({ currentPropertyId: propertyId });

      // Wait for session update to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Refresh the page to ensure all components get the new property context
      console.log(`🔄 Refreshing page to apply new property context`);
      window.location.reload();
    } catch (error) {
      console.error("Error switching property:", error);
      // TODO: Add toast notification for error
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user has no properties or only one property
  if (!properties.length || properties.length === 1) {
    return null;
  }

  // Don't render if session is loading
  if (!session) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">
          Property:
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 justify-between min-w-[160px] max-w-[200px]"
            disabled={isLoading}
          >
            <div className="flex items-center space-x-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {currentProperty?.name || "Select Property"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
            Available Properties
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {properties.map((property) => (
            <DropdownMenuItem
              key={property.id}
              onClick={() => handlePropertySwitch(property.id)}
              className="cursor-pointer"
              disabled={isLoading}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="font-medium">{property.name}</span>
                    <span className="text-xs text-gray-500 capitalize">
                      {property.role?.toLowerCase().replace("_", " ") ||
                        "Member"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {property.isDefault && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-purple-lightest text-purple-primary border-purple-primary/20 dark:bg-purple-darker/20 dark:text-purple-light dark:border-purple-light/30"
                    >
                      Default
                    </Badge>
                  )}
                  {property.id === currentProperty?.id && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
