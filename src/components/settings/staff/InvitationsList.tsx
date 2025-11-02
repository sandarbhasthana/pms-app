// File: src/components/settings/staff/InvitationsList.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate as formatDateUtil } from "@/lib/utils/dateFormatter";

interface Invitation {
  id: string;
  email: string;
  phone: string;
  organizationRole: string;
  propertyRole?: string;
  shift?: string;
  status: "pending" | "used" | "expired";
  organizationName: string;
  propertyName?: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

interface InvitationsListProps {
  invitations: Invitation[];
  onInvitationAction: () => void;
}

export function InvitationsList({
  invitations,
  onInvitationAction
}: InvitationsListProps) {
  const { toast } = useToast();
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>(
    {}
  );

  const roleLabels = {
    SUPER_ADMIN: "Super Admin",
    ORG_ADMIN: "Organization Admin",
    PROPERTY_MGR: "Property Manager",
    FRONT_DESK: "Front Desk",
    HOUSEKEEPING: "Housekeeping",
    MAINTENANCE: "Maintenance",
    ACCOUNTANT: "Accountant",
    OWNER: "Owner",
    IT_SUPPORT: "IT Support"
  };

  const propertyRoleLabels = {
    PROPERTY_MGR: "Property Manager",
    FRONT_DESK: "Front Desk",
    HOUSEKEEPING: "Housekeeping",
    MAINTENANCE: "Maintenance",
    SECURITY: "Security",
    GUEST_SERVICES: "Guest Services"
  };

  const shiftLabels = {
    MORNING: "Morning",
    EVENING: "Evening",
    NIGHT: "Night",
    FLEXIBLE: "Flexible"
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "used":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Accepted
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleResendInvitation = async (invitationId: string) => {
    setLoadingActions((prev) => ({ ...prev, [invitationId]: true }));

    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "resend" })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation Resent",
          description: `Invitation has been resent to ${data.invitation.email}`
        });
        onInvitationAction();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to resend invitation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [invitationId]: false }));
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setLoadingActions((prev) => ({ ...prev, [invitationId]: true }));

    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation Cancelled",
          description: "Invitation has been cancelled successfully"
        });
        onInvitationAction();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to cancel invitation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [invitationId]: false }));
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No invitations sent
        </h3>
        <p className="text-gray-500">Invitations you send will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invitee</TableHead>
            <TableHead>Role & Assignment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent By</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{invitation.email}</span>
                  </div>
                  {invitation.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span>{invitation.phone}</span>
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-2">
                  <Badge variant="outline">
                    {roleLabels[
                      invitation.organizationRole as keyof typeof roleLabels
                    ] || invitation.organizationRole}
                  </Badge>
                  {invitation.propertyName && (
                    <div className="text-sm">
                      <div className="font-medium">
                        {invitation.propertyName}
                      </div>
                      <div className="text-gray-500">
                        {propertyRoleLabels[
                          invitation.propertyRole as keyof typeof propertyRoleLabels
                        ] || invitation.propertyRole}
                        {invitation.shift && (
                          <span className="ml-2">
                            •{" "}
                            {shiftLabels[
                              invitation.shift as keyof typeof shiftLabels
                            ] || invitation.shift}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>{getStatusBadge(invitation.status)}</TableCell>

              <TableCell>
                <span className="text-sm text-gray-500">
                  {invitation.createdBy}
                </span>
              </TableCell>

              <TableCell>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">Sent:</span>{" "}
                    {formatDate(invitation.createdAt)}
                  </div>
                  <div>
                    <span className="text-gray-500">Expires:</span>{" "}
                    {formatDate(invitation.expiresAt)}
                  </div>
                  {invitation.usedAt && (
                    <div>
                      <span className="text-gray-500">Accepted:</span>{" "}
                      {formatDateTime(invitation.usedAt)}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                {invitation.status === "pending" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={loadingActions[invitation.id]}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleResendInvitation(invitation.id)}
                        disabled={loadingActions[invitation.id]}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-red-600"
                        disabled={loadingActions[invitation.id]}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancel Invitation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
