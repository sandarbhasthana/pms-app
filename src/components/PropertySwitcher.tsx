// File: src/components/PropertySwitcher.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  PropertyStatusTag,
  RoleTag,
  OrganizationRole
} from "@/components/ui/role-tag";

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

  // Memoize available properties to prevent unnecessary re-renders
  const availableProperties = useMemo(() => {
    return session?.user?.availableProperties || [];
  }, [session?.user?.availableProperties]);

  // Load property context from session
  useEffect(() => {
    if (availableProperties.length > 0) {
      setProperties(availableProperties);

      // Check existing cookie first to maintain user's selection
      const existingCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("propertyId="));

      let cookiePropertyId = null;
      if (existingCookie) {
        cookiePropertyId = existingCookie.split("=")[1];
      }

      // Find current property - prioritize cookie, then session, then default
      let current = null;

      if (cookiePropertyId) {
        // First try to use property from cookie
        current = availableProperties.find((p) => p.id === cookiePropertyId);
      }

      if (!current && session?.user?.currentPropertyId) {
        // Fallback to session property
        current = availableProperties.find(
          (p) => p.id === session.user.currentPropertyId
        );
        if (process.env.NODE_ENV === "development") {
          console.log(`📱 Found property from session:`, current?.name);
        }
      }

      if (!current) {
        // Final fallback to default property or first available
        current =
          availableProperties.find((p) => p.isDefault) ||
          availableProperties[0];
      }
      setCurrentProperty(current);

      // Set property ID cookie if we have a current property and no existing cookie
      if (current?.id && !existingCookie) {
        const maxAge = 60 * 60 * 24 * 30; // 30 days
        document.cookie = `propertyId=${current.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (process.env.NODE_ENV === "development") {
          console.log(`🍪 Auto-setting property cookie on load: ${current.id}`);
        }
      }

      // Also set cookie if existing cookie doesn't match current property
      if (current?.id && existingCookie && cookiePropertyId !== current.id) {
        const maxAge = 60 * 60 * 24 * 30; // 30 days
        document.cookie = `propertyId=${current.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🍪 Updating property cookie to match current: ${current.id}`
          );
        }
      }
    }
  }, [availableProperties, session?.user?.currentPropertyId]);

  // Handle property switching
  const handlePropertySwitch = useCallback(
    async (propertyId: string) => {
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
        await update({ currentPropertyId: propertyId });

        // Wait for session update to complete
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Refresh the page to ensure all components get the new property context
        window.location.reload();
      } catch (error) {
        console.error("Error switching property:", error);
        // TODO: Add toast notification for error
      } finally {
        setIsLoading(false);
      }
    },
    [currentProperty?.id, isLoading, properties, update]
  );

  // Don't render if session is loading
  if (!session) {
    return null;
  }

  // Show "Add First Property" button if no properties exist
  if (!properties.length) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">
            Property:
          </span>
        )}

        <Link href="/admin/settings/properties" className="cursor-pointer">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 justify-between min-w-40 max-w-[200px] border-dashed border-2 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
          >
            <div className="flex items-center space-x-2 truncate">
              <Plus className="h-4 w-4 shrink-0 text-purple-600" />
              <span className="truncate text-purple-600 font-medium">
                Add First Property
              </span>
            </div>
          </Button>
        </Link>
      </div>
    );
  }

  // For single property, show a non-interactive display instead of hiding
  if (properties.length === 1) {
    const singleProperty = properties[0];

    // Ensure the single property is set in cookies and current state
    if (
      singleProperty &&
      (!currentProperty || currentProperty.id !== singleProperty.id)
    ) {
      setCurrentProperty(singleProperty);

      // Set property ID cookie if not already set
      const existingCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("propertyId="));

      if (
        !existingCookie ||
        existingCookie.split("=")[1] !== singleProperty.id
      ) {
        const maxAge = 60 * 60 * 24 * 30; // 30 days
        document.cookie = `propertyId=${singleProperty.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🍪 Auto-setting single property cookie: ${singleProperty.id}`
          );
        }
      }
    }

    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">
            Property:
          </span>
        )}

        <div className="h-9 px-3 flex items-center space-x-2 min-w-40 max-w-[200px] bg-gray-50 dark:bg-gray-800 rounded-md border">
          <Building2 className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate text-sm font-medium">
            {singleProperty?.name || "Loading..."}
          </span>
          {singleProperty?.isDefault && (
            <PropertyStatusTag
              status="DEFAULT"
              variant="compact"
              className="text-xs whitespace-nowrap ml-2"
            />
          )}
        </div>
      </div>
    );
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
            className="h-9 px-3 justify-between min-w-40 max-w-[200px]"
            disabled={isLoading}
          >
            <div className="flex items-center space-x-2 truncate">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {currentProperty?.name || "Select Property"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-96 max-w-[400px]">
          <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
            Available Properties
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {properties.map((property) => (
            <DropdownMenuItem
              key={property.id}
              onClick={() => handlePropertySwitch(property.id)}
              className="cursor-pointer p-3 min-h-[60px] group"
              disabled={isLoading}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Building2 className="h-4 w-4 text-[#c3a2ff] group-hover:text-[#7210a2] shrink-0 transition-colors" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">
                      {property.name}
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      {property.role && (
                        <RoleTag
                          role={property.role as OrganizationRole}
                          variant="compact"
                          className="text-xs shrink-0"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-3">
                  {property.isDefault && (
                    <PropertyStatusTag
                      status="DEFAULT"
                      variant="compact"
                      className="text-xs whitespace-nowrap"
                    />
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
