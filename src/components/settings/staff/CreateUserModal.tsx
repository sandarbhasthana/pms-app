// File: src/components/settings/staff/CreateUserModal.tsx
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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Phone,
  User,
  Building,
  MapPin,
  UserPlus
} from "lucide-react";

interface Property {
  id: string;
  name: string;
}

interface PropertyAssignment {
  propertyId: string;
  role: string;
  shift?: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated
}: CreateUserModalProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organizationRole: "",
    propertyAssignments: [] as PropertyAssignment[]
  });

  const userRole = session?.user?.role;

  // Fetch available properties
  useEffect(() => {
    if (isOpen) {
      fetch("/api/properties")
        .then((res) => res.json())
        .then((data) => {
          if (data.properties) {
            setProperties(data.properties);
          }
        })
        .catch((error) => {
          console.error("Error fetching properties:", error);
        });
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        organizationRole: "",
        propertyAssignments: []
      });
    }
  }, [isOpen]);

  // Role hierarchy validation
  const getAvailableOrganizationRoles = () => {
    const roles = [
      { value: "STAFF", label: "Staff" },
      { value: "PROPERTY_MGR", label: "Property Manager" },
      { value: "ORG_ADMIN", label: "Organization Admin" }
    ];

    // Filter based on current user's role
    if (userRole === "PROPERTY_MGR") {
      return roles.filter((role) => role.value === "STAFF");
    }
    if (userRole === "ORG_ADMIN") {
      return roles.filter((role) => role.value !== "SUPER_ADMIN");
    }
    return roles; // SUPER_ADMIN can assign any role
  };

  const getAvailablePropertyRoles = () => {
    return [
      { value: "STAFF", label: "Staff" },
      { value: "SUPERVISOR", label: "Supervisor" },
      { value: "MANAGER", label: "Manager" }
    ];
  };

  const getAvailableShifts = () => {
    return [
      { value: "MORNING", label: "Morning (6AM - 2PM)" },
      { value: "EVENING", label: "Evening (2PM - 10PM)" },
      { value: "NIGHT", label: "Night (10PM - 6AM)" }
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.organizationRole
    ) {
      toast({
        title: "Validation Error",
        description: "Name, email, phone, and organization role are required.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ""))) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organizationRole: formData.organizationRole,
        propertyAssignments: formData.propertyAssignments.filter(
          (assignment) => assignment.propertyId && assignment.role
        )
      };

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "User Created",
          description: `User ${formData.name} created successfully and added to the organization.`
        });

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          organizationRole: "",
          propertyAssignments: []
        });

        onUserCreated();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create user",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addPropertyAssignment = () => {
    setFormData((prev) => ({
      ...prev,
      propertyAssignments: [
        ...prev.propertyAssignments,
        { propertyId: "", role: "", shift: "" }
      ]
    }));
  };

  const updatePropertyAssignment = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      propertyAssignments: prev.propertyAssignments.map((assignment, i) =>
        i === index ? { ...assignment, [field]: value } : assignment
      )
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account and assign them to your organization
            directly. The user will be able to sign in immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Basic Information
            </h4>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
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
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Organization Role */}
          <div className="space-y-2">
            <Label htmlFor="organizationRole">Organization Role *</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
              <Select
                value={formData.organizationRole}
                onValueChange={(value) =>
                  handleInputChange("organizationRole", value)
                }
                required
              >
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Select organization role" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableOrganizationRoles().map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Assignments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                Property Assignments (Optional)
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPropertyAssignment}
                className="text-xs"
              >
                <MapPin className="h-3 w-3 mr-1" />
                Add Property
              </Button>
            </div>

            {formData.propertyAssignments.map((assignment, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Property Assignment {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePropertyAssignment(index)}
                    className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Property Selection */}
                  <div className="space-y-1">
                    <Label className="text-xs">Property</Label>
                    <Select
                      value={assignment.propertyId}
                      onValueChange={(value) =>
                        updatePropertyAssignment(index, "propertyId", value)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select property" />
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

                  {/* Property Role */}
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select
                      value={assignment.role}
                      onValueChange={(value) =>
                        updatePropertyAssignment(index, "role", value)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePropertyRoles().map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Shift */}
                  <div className="space-y-1">
                    <Label className="text-xs">Shift (Optional)</Label>
                    <Select
                      value={assignment.shift || ""}
                      onValueChange={(value) =>
                        updatePropertyAssignment(index, "shift", value)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific shift</SelectItem>
                        {getAvailableShifts().map((shift) => (
                          <SelectItem key={shift.value} value={shift.value}>
                            {shift.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-row justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 bg-purple-primary text-white hover:bg-purple-dark border-purple-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
