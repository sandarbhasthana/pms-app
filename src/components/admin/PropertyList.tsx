// File: src/components/admin/PropertyList.tsx
"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Building2,
  Edit,
  Trash2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyStatusTag } from "@/components/ui/role-tag";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface Property {
  id: string;
  name: string;
  description?: string;
  suite?: string | null;
  street?: string | null;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PropertyListProps {
  onEdit: (property: Property) => void;
  onDelete: (propertyId: string) => void;
  onCreate: () => void;
}

export interface PropertyListRef {
  refreshProperties: () => Promise<void>;
}

export const PropertyList = forwardRef<PropertyListRef, PropertyListProps>(
  ({ onEdit, onDelete, onCreate }, ref) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(
      null
    );

    // Load properties
    useEffect(() => {
      loadProperties();
    }, []);

    const loadProperties = async () => {
      try {
        console.log("Loading properties...");
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/properties", {
          // Add cache-busting to the request
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache"
          }
        });
        if (!response.ok) {
          throw new Error("Failed to load properties");
        }

        const data = await response.json();
        console.log("Properties loaded:", data);
        setProperties(data);
      } catch (error) {
        console.error("Error loading properties:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    // Expose refresh function to parent component
    useImperativeHandle(ref, () => ({
      refreshProperties: loadProperties
    }));

    const handleDeleteClick = (property: Property) => {
      setPropertyToDelete(property);
      setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
      if (!propertyToDelete) return;

      try {
        onDelete(propertyToDelete.id);
        setProperties(properties.filter((p) => p.id !== propertyToDelete.id));
        setDeleteDialogOpen(false);
        setPropertyToDelete(null);
      } catch (error) {
        console.error("Error deleting property:", error);
      }
    };

    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Properties</h2>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Properties</h2>
            <Button
              onClick={onCreate}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground dark:border-[#ab2aea] dark:text-[#ab2aea] dark:hover:bg-[#ab2aea] dark:hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <p>Error loading properties: {error}</p>
                <Button onClick={loadProperties} className="mt-2">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Properties</h2>
            <p className="text-gray-600">
              Manage your organization&apos;s properties
            </p>
          </div>
          <Button
            onClick={onCreate}
            variant="outline"
            className="!border-[#ab2aea] !text-[#ab2aea] hover:!bg-[#ab2aea] hover:!text-white !transition-all !duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>

        {/* Properties Grid */}
        {properties.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No properties found
              </h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first property.
              </p>
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties
              .sort((a, b) => {
                // Default property always comes first
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                // Then sort by name alphabetically
                return a.name.localeCompare(b.name);
              })
              .map((property) => (
                <Card
                  key={property.id}
                  className="card-hover purple-accent-hover transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">
                          {property.name}
                        </CardTitle>
                      </div>
                      {property.isDefault && (
                        <PropertyStatusTag
                          status="DEFAULT"
                          className="flex items-center space-x-1 whitespace-nowrap"
                        >
                          <Star className="h-3 w-3 fill-current mr-1" />
                          Default
                        </PropertyStatusTag>
                      )}
                    </div>
                    {property.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {property.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>
                          {[
                            property.suite,
                            property.street,
                            property.city,
                            property.state,
                            property.zipCode,
                            property.country
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1">
                      {property.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{property.phone}</span>
                        </div>
                      )}
                      {property.email && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{property.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(property)}
                        className="text-purple-primary border-purple-primary hover:bg-purple-primary hover:text-white"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(property)}
                        className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Property</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{propertyToDelete?.name}
                &quot;? This action cannot be undone. All rooms, reservations,
                and other data associated with this property will also be
                deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Property
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

PropertyList.displayName = "PropertyList";
