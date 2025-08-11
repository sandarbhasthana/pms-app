// File: src/components/settings/staff/DeleteStaffModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, User, Mail, Phone } from "lucide-react";

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

interface DeleteStaffModalProps {
  staff: StaffMember;
  isOpen: boolean;
  onClose: () => void;
  onStaffDeleted: () => void;
}

export function DeleteStaffModal({ staff, isOpen, onClose, onStaffDeleted }: DeleteStaffModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const roleLabels = {
    "SUPER_ADMIN": "Super Admin",
    "ORG_ADMIN": "Organization Admin",
    "PROPERTY_MGR": "Property Manager",
    "FRONT_DESK": "Front Desk",
    "HOUSEKEEPING": "Housekeeping",
    "MAINTENANCE": "Maintenance",
    "ACCOUNTANT": "Accountant",
    "OWNER": "Owner",
    "IT_SUPPORT": "IT Support"
  };

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${staff.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Staff Member Removed",
          description: `${staff.name || staff.email} has been removed from the organization`,
        });
        onStaffDeleted();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to remove staff member",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing staff:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Remove Staff Member</span>
          </DialogTitle>
          <DialogDescription>
            This action will remove the staff member from your organization. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff Member Info */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-medium">{staff.name || "Unnamed User"}</h4>
                  <p className="text-sm text-gray-600">
                    {roleLabels[staff.organizationRole as keyof typeof roleLabels] || staff.organizationRole}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span>{staff.email}</span>
                  </div>
                  {staff.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                </div>

                {staff.propertyAssignments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Property Assignments:</p>
                    <div className="space-y-1">
                      {staff.propertyAssignments.map((assignment, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          • {assignment.propertyName} ({assignment.role}
                          {assignment.shift && `, ${assignment.shift}`})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Warning:</strong> This action will:
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Remove the staff member from your organization</li>
                <li>Remove all their property assignments</li>
                <li>Revoke their access to the system</li>
                <li>This action cannot be undone</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Additional Info */}
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p>
              <strong>Note:</strong> The user account will not be deleted entirely. 
              If you need to re-add this person later, you can send them a new invitation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove Staff Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
