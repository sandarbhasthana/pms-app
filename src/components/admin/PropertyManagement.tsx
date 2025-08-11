// File: src/components/admin/PropertyManagement.tsx
"use client";

import { useState } from "react";
import { PropertyList } from "./PropertyList";
import { PropertyForm } from "./PropertyForm";

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

type PropertyFormData = {
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
};

type ViewMode = "list" | "create" | "edit";

export function PropertyManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = () => {
    setSelectedProperty(null);
    setViewMode("create");
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setViewMode("edit");
  };

  const handleCancel = () => {
    setSelectedProperty(null);
    setViewMode("list");
  };

  const handleSubmit = async (data: PropertyFormData) => {
    setIsLoading(true);
    try {
      const url =
        viewMode === "create"
          ? "/api/properties"
          : `/api/properties/${selectedProperty?.id}`;
      const method = viewMode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save property");
      }

      // Success - return to list view
      setViewMode("list");
      setSelectedProperty(null);
    } catch (error) {
      // Re-throw error to be handled by the form
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (propertyId: string) => {
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete property");
    }
  };

  // Render based on current view mode
  switch (viewMode) {
    case "create":
      return (
        <PropertyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );

    case "edit":
      return (
        <PropertyForm
          property={selectedProperty!}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );

    case "list":
    default:
      return (
        <PropertyList
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      );
  }
}
