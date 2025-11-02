// File: src/components/settings/staff/InviteUserModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Clock
} from "lucide-react";

interface Property {
  id: string;
  name: string;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationSent: () => void;
}

export function InviteUserModal({
  isOpen,
  onClose,
  onInvitationSent
}: InviteUserModalProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    organizationRole: "",
    propertyId: "",
    propertyRole: "",
    shift: "",
    message: ""
  });

  const userRole = session?.user?.role;

  // Role options based on current user's role (can only invite equal or lower roles)
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

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch("/api/properties");
        if (response.ok) {
          const data = await response.json();
          // API returns array directly, not wrapped in { properties: [] }
          if (Array.isArray(data)) {
            setProperties(data);
          } else {
            setProperties(data.properties || []);
          }
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

    if (!formData.email || !formData.phone || !formData.organizationRole) {
      toast({
        title: "Validation Error",
        description: "Email, phone, and organization role are required.",
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
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ""))) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const invitationData = {
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organizationRole: formData.organizationRole,
        ...(formData.propertyId && { propertyId: formData.propertyId }),
        ...(formData.propertyRole && { propertyRole: formData.propertyRole }),
        ...(formData.shift && { shift: formData.shift }),
        ...(formData.message && { message: formData.message.trim() })
      };

      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(invitationData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation Sent",
          description: `Invitation sent successfully to ${formData.email}`
        });

        // Reset form
        setFormData({
          email: "",
          phone: "",
          organizationRole: "",
          propertyId: "",
          propertyRole: "",
          shift: "",
          message: ""
        });

        onInvitationSent();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send invitation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They will receive an email
            with a link to join your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Organization Role */}
          <div className="space-y-2">
            <Label htmlFor="organizationRole">Organization Role *</Label>
            <Select
              value={formData.organizationRole}
              onValueChange={(value) =>
                handleInputChange("organizationRole", value)
              }
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Select organization role" />
                </div>
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

          {/* Property Assignment (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="propertyId">Property Assignment (Optional)</Label>
            <Select
              value={formData.propertyId}
              onValueChange={(value) => handleInputChange("propertyId", value)}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Building className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Select property (optional)" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific property</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property Role (Only if property is selected) */}
          {formData.propertyId && formData.propertyId !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="propertyRole">Property Role</Label>
              <Select
                value={formData.propertyRole}
                onValueChange={(value) =>
                  handleInputChange("propertyRole", value)
                }
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Select property role" />
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
          )}

          {/* Shift (Only if property role is selected) */}
          {formData.propertyRole && formData.propertyRole !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="shift">Shift Assignment (Optional)</Label>
              <Select
                value={formData.shift}
                onValueChange={(value) => handleInputChange("shift", value)}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Select shift (optional)" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific shift</SelectItem>
                  {shiftOptions.map((shift) => (
                    <SelectItem key={shift.value} value={shift.value}>
                      {shift.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Personal Message (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              rows={3}
            />
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
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
