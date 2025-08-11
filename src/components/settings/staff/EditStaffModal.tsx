// File: src/components/settings/staff/EditStaffModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  User,
  Phone,
  Building,
  MapPin,
  Clock,
  Plus,
  Trash2
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string;
  organizationRole: string;
  propertyAssignments: Array<{
    propertyId: string;
    propertyName: string;
    role: string;
    shift?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Property {
  id: string;
  name: string;
}

interface PropertyAssignment {
  propertyId: string;
  role: string;
  shift?: string;
}

interface EditStaffModalProps {
  staff: StaffMember;
  isOpen: boolean;
  onClose: () => void;
  onStaffUpdated: () => void;
}

export function EditStaffModal({
  staff,
  isOpen,
  onClose,
  onStaffUpdated
}: EditStaffModalProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState({
    name: staff.name || "",
    phone: staff.phone || "",
    organizationRole: staff.organizationRole,
    propertyAssignments: staff.propertyAssignments.map((assignment) => ({
      propertyId: assignment.propertyId,
      role: assignment.role,
      shift: assignment.shift || ""
    })) as PropertyAssignment[]
  });

  const userRole = session?.user?.role;

  // Role options based on current user's role
  const getRoleOptions = () => {
    const allRoles = [
      { value: "SUPER_ADMIN", label: "Super Admin", level: 5 },
      { value: "ORG_ADMIN", label: "Organization Admin", level: 4 },
      { value: "PROPERTY_MGR", label: "Property Manager", level: 3 },
      { value: "FRONT_DESK", label: "Front Desk", level: 2 },
      { value: "HOUSEKEEPING", label: "Housekeeping", level: 1 },
      { value: "MAINTENANCE", label: "Maintenance", level: 1 },
      { value: "ACCOUNTANT", label: "Accountant", level: 2 },
      { value: "OWNER", label: "Owner", level: 4 },
      { value: "IT_SUPPORT", label: "IT Support", level: 2 },
      { value: "SECURITY", label: "Security", level: 1 }
    ];

    const roleHierarchy = {
      SUPER_ADMIN: 5,
      ORG_ADMIN: 4,
      PROPERTY_MGR: 3,
      FRONT_DESK: 2,
      HOUSEKEEPING: 1,
      MAINTENANCE: 1,
      ACCOUNTANT: 2,
      OWNER: 4,
      IT_SUPPORT: 2,
      SECURITY: 1
    };

    const currentUserLevel =
      roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;

    return allRoles.filter((role) => role.level <= currentUserLevel);
  };

  const propertyRoleOptions = [
    { value: "PROPERTY_MGR", label: "Property Manager" },
    { value: "FRONT_DESK", label: "Front Desk" },
    { value: "HOUSEKEEPING", label: "Housekeeping" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "SECURITY", label: "Security" },
    { value: "GUEST_SERVICES", label: "Guest Services" },
    { value: "ACCOUNTANT", label: "Accountant" },
    { value: "IT_SUPPORT", label: "IT Support" }
  ];

  const shiftOptions = [
    { value: "MORNING", label: "Morning (6AM - 2PM)" },
    { value: "EVENING", label: "Evening (2PM - 10PM)" },
    { value: "NIGHT", label: "Night (10PM - 6AM)" },
    { value: "FLEXIBLE", label: "Flexible" }
  ];

  // Debug staff data
  useEffect(() => {
    if (isOpen) {
      console.log("Staff data in EditStaffModal:", staff);
    }
  }, [isOpen, staff]);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const orgId = document.cookie
          .split("; ")
          .find((row) => row.startsWith("orgId="))
          ?.split("=")[1];

        const headers: HeadersInit = {
          "Content-Type": "application/json"
        };

        if (orgId) {
          headers["x-organization-id"] = orgId;
        }

        const response = await fetch("/api/properties", {
          method: "GET",
          headers,
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Properties fetched:", data);
          setProperties(data || []);
        } else {
          console.error(
            "Failed to fetch properties:",
            response.status,
            response.statusText
          );
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };

    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Name and phone are required.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        organizationRole: formData.organizationRole,
        propertyAssignments: formData.propertyAssignments.filter(
          (assignment) => assignment.propertyId && assignment.role
        )
      };

      const response = await fetch(`/api/admin/users/${staff.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Staff Updated",
          description: "Staff member has been updated successfully"
        });
        onStaffUpdated();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update staff member",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating staff:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPropertyAssignment = () => {
    setFormData((prev) => ({
      ...prev,
      propertyAssignments: [
        ...prev.propertyAssignments,
        { propertyId: undefined, role: undefined, shift: undefined }
      ]
    }));
  };

  const removePropertyAssignment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      propertyAssignments: prev.propertyAssignments.filter(
        (_, i) => i !== index
      )
    }));
  };

  const updatePropertyAssignment = (
    index: number,
    field: keyof PropertyAssignment,
    value: string
  ) => {
    // Handle special case for shift "NONE" value
    const processedValue =
      field === "shift" && value === "NONE" ? undefined : value;

    setFormData((prev) => ({
      ...prev,
      propertyAssignments: prev.propertyAssignments.map((assignment, i) =>
        i === index ? { ...assignment, [field]: processedValue } : assignment
      )
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update staff member information, role, and property assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={staff.email || ""}
                  readOnly
                  className="cursor-not-allowed focus:ring-0 focus:ring-offset-0 text-gray-500"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value
                      }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Organization Role */}
              <div className="space-y-2">
                <Label>Organization Role *</Label>
                <Select
                  value={formData.organizationRole}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      organizationRole: value
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoleOptions().map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Property Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Property Assignments</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPropertyAssignment}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.propertyAssignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No property assignments. Click "Add Assignment" to assign this
                  staff member to a property.
                </p>
              ) : (
                formData.propertyAssignments.map((assignment, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Assignment {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePropertyAssignment(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Property */}
                      <div className="space-y-2">
                        <Label>Property</Label>
                        <Select
                          value={assignment.propertyId || ""}
                          onValueChange={(value) =>
                            updatePropertyAssignment(index, "propertyId", value)
                          }
                        >
                          <SelectTrigger className="w-full overflow-hidden">
                            <div className="flex items-center min-w-0 w-full">
                              <Building className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <div className="truncate flex-1 text-left">
                                <SelectValue placeholder="Select property" />
                              </div>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {properties.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Role */}
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={assignment.role || ""}
                          onValueChange={(value) =>
                            updatePropertyAssignment(index, "role", value)
                          }
                        >
                          <SelectTrigger className="w-full overflow-hidden">
                            <div className="flex items-center min-w-0 w-full">
                              <MapPin className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <div className="truncate flex-1 text-left">
                                <SelectValue placeholder="Select role" />
                              </div>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {propertyRoleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Shift */}
                      <div className="space-y-2">
                        <Label>Shift</Label>
                        <Select
                          value={assignment.shift || "NONE"}
                          onValueChange={(value) =>
                            updatePropertyAssignment(index, "shift", value)
                          }
                        >
                          <SelectTrigger className="w-full overflow-hidden">
                            <div className="flex items-center min-w-0 w-full">
                              <Clock className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                              <div className="truncate flex-1 text-left">
                                <SelectValue placeholder="Select shift" />
                              </div>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">
                              No specific shift
                            </SelectItem>
                            {shiftOptions.map((shift) => (
                              <SelectItem key={shift.value} value={shift.value}>
                                {shift.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Staff Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
