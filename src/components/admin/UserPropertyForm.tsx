// File: src/components/admin/UserPropertyForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Users, Building2, UserCheck, ArrowLeft } from "lucide-react";

const userPropertySchema = z.object({
  userId: z.string().min(1, "User is required"),
  propertyId: z.string().min(1, "Property is required"),
  role: z.enum(["PROPERTY_MGR", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE"], {
    required_error: "Role is required"
  })
});

type UserPropertyFormData = z.infer<typeof userPropertySchema>;
type PropertyRole = UserPropertyFormData["role"];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Property {
  id: string;
  name: string;
}

interface UserPropertyAssignment {
  id: string;
  userId: string;
  propertyId: string;
  role: string;
  user: User;
  property: Property;
}

interface UserPropertyFormProps {
  assignment?: UserPropertyAssignment;
  onSubmit: (data: UserPropertyFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserPropertyForm({
  assignment,
  onSubmit,
  onCancel,
  isLoading = false
}: UserPropertyFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<UserPropertyFormData>({
    resolver: zodResolver(userPropertySchema),
    defaultValues: assignment
      ? {
          userId: assignment.userId,
          propertyId: assignment.propertyId,
          role: assignment.role as PropertyRole
        }
      : {
          userId: "",
          propertyId: "",
          role: undefined
        }
  });

  const selectedUserId = watch("userId");
  const selectedPropertyId = watch("propertyId");
  const selectedRole = watch("role");

  // Load users and properties
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);

      const [usersResponse, propertiesResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/properties")
      ]);

      if (!usersResponse.ok || !propertiesResponse.ok) {
        throw new Error("Failed to load data");
      }

      const [usersData, propertiesData] = await Promise.all([
        usersResponse.json(),
        propertiesResponse.json()
      ]);

      // Extract users array from the response object
      setUsers(usersData.users || []);
      setProperties(propertiesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFormSubmit = async (data: UserPropertyFormData) => {
    try {
      setSubmitError(null);
      await onSubmit(data);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  };

  const roleOptions = [
    {
      value: "PROPERTY_MGR",
      label: "Property Manager",
      description: "Full property management access"
    },
    {
      value: "FRONT_DESK",
      label: "Front Desk",
      description: "Reservations and guest management"
    },
    {
      value: "HOUSEKEEPING",
      label: "Housekeeping",
      description: "Room status and cleaning management"
    },
    {
      value: "MAINTENANCE",
      label: "Maintenance",
      description: "Property maintenance and repairs"
    }
  ];

  if (loadingData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Loading...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>
              {assignment ? "Edit User Assignment" : "Assign User to Property"}
            </span>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex items-center space-x-1 border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* User Selection */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>User *</span>
            </Label>
            <Select
              value={selectedUserId}
              onValueChange={(value) => setValue("userId", value)}
              disabled={!!assignment} // Disable editing user in edit mode
            >
              <SelectTrigger className={errors.userId ? "border-red-500" : ""}>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-gray-500">
                        {user.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && (
              <p className="text-sm text-red-500">{errors.userId.message}</p>
            )}
          </div>

          {/* Property Selection */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Property *</span>
            </Label>
            <Select
              value={selectedPropertyId}
              onValueChange={(value) => setValue("propertyId", value)}
              disabled={!!assignment} // Disable editing property in edit mode
            >
              <SelectTrigger
                className={errors.propertyId ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.propertyId && (
              <p className="text-sm text-red-500">
                {errors.propertyId.message}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue("role", value as PropertyRole)}
            >
              <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-gray-500">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
              className="flex items-center space-x-1 border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to List</span>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-purple-primary text-white hover:bg-purple-dark border-purple-primary"
            >
              {isSubmitting || isLoading
                ? "Saving..."
                : assignment
                ? "Update Assignment"
                : "Assign User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
