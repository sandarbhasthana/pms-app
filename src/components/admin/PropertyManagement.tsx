// File: src/components/admin/PropertyManagement.tsx
"use client";

import { useState, useRef } from "react";
import { PropertyList, PropertyListRef } from "./PropertyList";
import GeneralSettingsFormFixedS3 from "@/components/settings/general/GeneralSettingsFormFixedS3";

interface Property {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "list" | "create" | "edit";

export function PropertyManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const propertyListRef = useRef<PropertyListRef>(null);

  const handleCreate = () => {
    setSelectedProperty(null);
    setViewMode("create");
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setViewMode("edit");
  };

  const handleCancel = async () => {
    setSelectedProperty(null);
    setViewMode("list");
    // Refresh the property list in case changes were made
    await propertyListRef.current?.refreshProperties();
  };

  const handleDelete = async (propertyId: string) => {
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      let errorMessage = "Failed to delete property";
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // If response is not JSON, use status text or default message
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Success - refresh property list
    await propertyListRef.current?.refreshProperties();
  };

  // Render based on current view mode
  switch (viewMode) {
    case "create":
      return (
        <GeneralSettingsFormFixedS3
          onCancel={handleCancel}
          isPropertyMode={true}
        />
      );

    case "edit":
      return (
        <GeneralSettingsFormFixedS3
          propertyId={selectedProperty!.id}
          onCancel={handleCancel}
          isPropertyMode={true}
        />
      );

    case "list":
    default:
      return (
        <PropertyList
          ref={propertyListRef}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      );
  }
}
