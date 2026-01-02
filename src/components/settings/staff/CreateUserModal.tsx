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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Mail,
  Phone,
  User,
  Building,
  MapPin,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  RefreshCw
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    organizationRole: "",
    sendWelcomeEmail: true,
    propertyAssignments: [] as PropertyAssignment[]
  });

  const userRole = session?.user?.role;

  // Fetch available properties
  useEffect(() => {
    if (isOpen) {
      fetch("/api/properties")
        .then((res) => res.json())
        .then((data) => {
          // API returns array directly, not wrapped in { properties: [] }
          if (Array.isArray(data)) {
            setProperties(data);
          } else if (data.properties) {
            // Fallback for wrapped response
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
        password: "",
        confirmPassword: "",
        organizationRole: "",
        sendWelcomeEmail: true,
        propertyAssignments: []
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  // Generate random password
  const generateRandomPassword = () => {
    const length = 12;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    const allChars = uppercase + lowercase + numbers + special;

    let password = "";
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setFormData((prev) => ({
      ...prev,
      password,
      confirmPassword: password
    }));
    setShowPassword(true);
  };

  // Role hierarchy validation
  const getAvailableOrganizationRoles = () => {
    const allRoles = [
      { value: "SUPER_ADMIN", label: "Super Admin" },
      { value: "ORG_ADMIN", label: "Organization Admin" },
      { value: "PROPERTY_MGR", label: "Property Manager" },
      { value: "FRONT_DESK", label: "Front Desk" },
      { value: "HOUSEKEEPING", label: "Housekeeping" },
      { value: "MAINTENANCE", label: "Maintenance" },
      { value: "ACCOUNTANT", label: "Accountant" },
      { value: "OWNER", label: "Owner" },
      { value: "IT_SUPPORT", label: "IT Support" },
      { value: "SECURITY", label: "Security" }
    ];

    // Filter based on current user's role
    if (userRole === "PROPERTY_MGR") {
      // Property managers can only create staff-level roles
      return allRoles.filter((role) =>
        ["FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "SECURITY"].includes(
          role.value
        )
      );
    }
    if (userRole === "ORG_ADMIN") {
      // Org admins cannot create super admins
      return allRoles.filter((role) => role.value !== "SUPER_ADMIN");
    }
    return allRoles; // SUPER_ADMIN can assign any role
  };

  const getAvailablePropertyRoles = () => {
    return [
      { value: "PROPERTY_MGR", label: "Property Manager" },
      { value: "FRONT_DESK", label: "Front Desk" },
      { value: "HOUSEKEEPING", label: "Housekeeping" },
      { value: "MAINTENANCE", label: "Maintenance" },
      { value: "SECURITY", label: "Security" },
      { value: "GUEST_SERVICES", label: "Guest Services" },
      { value: "ACCOUNTANT", label: "Accountant" },
      { value: "IT_SUPPORT", label: "IT Support" }
    ];
  };

  const getAvailableShifts = () => {
    return [
      { value: "MORNING", label: "Morning (6AM - 2PM)" },
      { value: "EVENING", label: "Evening (2PM - 10PM)" },
      { value: "NIGHT", label: "Night (10PM - 6AM)" },
      { value: "FLEXIBLE", label: "Flexible" }
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.organizationRole
    ) {
      toast({
        title: "Validation Error",
        description:
          "Name, email, phone, password, and organization role are required.",
        variant: "destructive"
      });
      return;
    }

    // Validate password
    if (formData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
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
        password: formData.password,
        sendWelcomeEmail: formData.sendWelcomeEmail,
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

      // Try to parse JSON response, fallback to text if it fails
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        const text = await response.text();
        data = {
          error: text || `Failed to parse server response: ${parseError}`
        };
      }

      if (response.ok) {
        const emailMsg = data.emailSent
          ? " Welcome email sent."
          : " (Email not sent - share credentials manually)";
        toast({
          title: "User Created",
          description: `User ${formData.name} created successfully.${emailMsg}`
        });

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          organizationRole: "",
          sendWelcomeEmail: true,
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
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
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

          {/* Password Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                Password
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomPassword}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate Random
              </Button>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.password &&
                formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
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
                        {properties.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            No properties available
                          </div>
                        ) : (
                          properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))
                        )}
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
                      value={assignment.shift || "NONE"}
                      onValueChange={(value) =>
                        updatePropertyAssignment(
                          index,
                          "shift",
                          value === "NONE" ? "" : value
                        )
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No specific shift</SelectItem>
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

          {/* Email Notification Option */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="sendWelcomeEmail"
              checked={formData.sendWelcomeEmail}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  sendWelcomeEmail: checked === true
                }))
              }
            />
            <Label
              htmlFor="sendWelcomeEmail"
              className="text-sm font-normal cursor-pointer"
            >
              Send welcome email with login credentials
            </Label>
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
