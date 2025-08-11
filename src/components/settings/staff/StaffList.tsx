// File: src/components/settings/staff/StaffList.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Clock
} from "lucide-react";
import { EditStaffModal } from "./EditStaffModal";
import { DeleteStaffModal } from "./DeleteStaffModal";

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

interface StaffListProps {
  staffMembers: StaffMember[];
  onStaffUpdate: () => void;
}

export function StaffList({ staffMembers, onStaffUpdate }: StaffListProps) {
  const { data: session } = useSession();
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  const userRole = session?.user?.role;
  const canEditStaff =
    userRole && ["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole);
  const canDeleteStaff =
    userRole && ["SUPER_ADMIN", "ORG_ADMIN"].includes(userRole);

  // Role hierarchy for display
  const roleHierarchy = {
    SUPER_ADMIN: {
      level: 5,
      label: "Super Admin",
      color: "bg-red-100 text-red-800"
    },
    ORG_ADMIN: {
      level: 4,
      label: "Org Admin",
      color: "bg-purple-100 text-purple-800"
    },
    PROPERTY_MGR: {
      level: 3,
      label: "Property Mgr",
      color: "bg-blue-100 text-blue-800"
    },
    FRONT_DESK: {
      level: 2,
      label: "Front Desk",
      color: "bg-green-100 text-green-800"
    },
    HOUSEKEEPING: {
      level: 1,
      label: "Housekeeping",
      color: "bg-yellow-100 text-yellow-800"
    },
    MAINTENANCE: {
      level: 1,
      label: "Maintenance",
      color: "bg-orange-100 text-orange-800"
    },
    ACCOUNTANT: {
      level: 2,
      label: "Accountant",
      color: "bg-indigo-100 text-indigo-800"
    },
    OWNER: { level: 4, label: "Owner", color: "bg-pink-100 text-pink-800" },
    IT_SUPPORT: {
      level: 2,
      label: "IT Support",
      color: "bg-cyan-100 text-cyan-800"
    },
    SECURITY: {
      level: 1,
      label: "Security",
      color: "bg-slate-100 text-slate-800"
    }
  };

  const propertyRoleLabels = {
    PROPERTY_MGR: "Property Mgr",
    FRONT_DESK: "Front Desk",
    HOUSEKEEPING: "Housekeeping",
    MAINTENANCE: "Maintenance",
    SECURITY: "Security",
    GUEST_SERVICES: "Guest Services",
    ACCOUNTANT: "Accountant",
    IT_SUPPORT: "IT Support"
  };

  // Property role colors for tags
  const propertyRoleColors = {
    PROPERTY_MGR: "bg-blue-100 text-blue-800",
    FRONT_DESK: "bg-green-100 text-green-800",
    HOUSEKEEPING: "bg-yellow-100 text-yellow-800",
    MAINTENANCE: "bg-orange-100 text-orange-800",
    SECURITY: "bg-red-100 text-red-800",
    GUEST_SERVICES: "bg-purple-100 text-purple-800",
    ACCOUNTANT: "bg-indigo-100 text-indigo-800",
    IT_SUPPORT: "bg-cyan-100 text-cyan-800"
  };

  const shiftLabels = {
    MORNING: "Morning",
    EVENING: "Evening",
    NIGHT: "Night",
    FLEXIBLE: "Flexible"
  };

  // Shift colors for badges (time-based - brighter)
  const shiftColors = {
    MORNING: "bg-amber-200 text-amber-900", // bright morning sunshine
    EVENING: "bg-orange-200 text-orange-900", // dusky sunset orange
    NIGHT: "bg-blue-200 text-blue-900", // deep night blue
    FLEXIBLE: "bg-emerald-200 text-emerald-900" // vibrant adaptable green
  };

  // Check if current user can edit a specific staff member
  const canEditThisStaff = (staffMember: StaffMember) => {
    if (!canEditStaff) return false;

    const currentUserLevel =
      roleHierarchy[userRole as keyof typeof roleHierarchy]?.level || 0;
    const staffMemberLevel =
      roleHierarchy[staffMember.organizationRole as keyof typeof roleHierarchy]
        ?.level || 0;

    // Can edit if current user has higher or equal level (except can't edit themselves if same level)
    return (
      currentUserLevel >= staffMemberLevel &&
      staffMember.id !== session?.user?.id
    );
  };

  // Check if current user can delete a specific staff member
  const canDeleteThisStaff = (staffMember: StaffMember) => {
    if (!canDeleteStaff) return false;
    if (staffMember.id === session?.user?.id) return false; // Can't delete self

    const currentUserLevel =
      roleHierarchy[userRole as keyof typeof roleHierarchy]?.level || 0;
    const staffMemberLevel =
      roleHierarchy[staffMember.organizationRole as keyof typeof roleHierarchy]
        ?.level || 0;

    // Can delete if current user has higher level
    return currentUserLevel > staffMemberLevel;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (staffMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Phone className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No staff members yet
        </h3>
        <p className="text-gray-500 mb-4">
          Start building your team by inviting staff members.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>STAFF MEMBER</TableHead>
              <TableHead>ORG ROLE</TableHead>
              <TableHead>PROP ROLES</TableHead>
              <TableHead>PROP ASSIGNMENTS</TableHead>
              <TableHead>SHIFTS</TableHead>
              <TableHead>CONTACT</TableHead>
              <TableHead>JOINED</TableHead>
              {/* <TableHead className="w-[70px]">ACTIONS</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={staff.image} alt={staff.name} />
                      <AvatarFallback>
                        {getInitials(staff.name || staff.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {staff.name || "Unnamed User"}
                      </div>
                      <div className="text-sm text-gray-500">{staff.email}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      roleHierarchy[
                        staff.organizationRole as keyof typeof roleHierarchy
                      ]?.color || "bg-gray-100 text-gray-800"
                    }
                  >
                    {roleHierarchy[
                      staff.organizationRole as keyof typeof roleHierarchy
                    ]?.label || staff.organizationRole}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {staff.propertyAssignments.length === 0 ? (
                      <span className="text-sm text-gray-500">No roles</span>
                    ) : (
                      Array.from(
                        new Set(staff.propertyAssignments.map((a) => a.role))
                      ).map((role) => (
                        <Badge
                          key={role}
                          variant="secondary"
                          className={`text-xs ${
                            propertyRoleColors[
                              role as keyof typeof propertyRoleColors
                            ] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {propertyRoleLabels[
                            role as keyof typeof propertyRoleLabels
                          ] || role}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    {staff.propertyAssignments.length === 0 ? (
                      <span className="text-sm text-gray-500">
                        No assignments
                      </span>
                    ) : (
                      staff.propertyAssignments.map((assignment, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">
                            {assignment.propertyName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    {staff.propertyAssignments.length === 0 ? (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-400">No shift</span>
                      </div>
                    ) : (
                      staff.propertyAssignments.map((assignment, index) => (
                        <div key={index}>
                          {assignment.shift ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs flex items-center space-x-1 ${
                                shiftColors[
                                  assignment.shift as keyof typeof shiftColors
                                ] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {shiftLabels[
                                  assignment.shift as keyof typeof shiftLabels
                                ] || assignment.shift}
                              </span>
                            </Badge>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                No shift
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span>{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm text-gray-500">
                    {formatDate(staff.createdAt)}
                  </span>
                </TableCell>

                <TableCell>
                  {(canEditThisStaff(staff) || canDeleteThisStaff(staff)) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* <DropdownMenuLabel>Actions</DropdownMenuLabel> */}
                        <DropdownMenuSeparator />
                        {canEditThisStaff(staff) && (
                          <DropdownMenuItem
                            onClick={() => setEditingStaff(staff)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Staff
                          </DropdownMenuItem>
                        )}
                        {canDeleteThisStaff(staff) && (
                          <DropdownMenuItem
                            onClick={() => setDeletingStaff(staff)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Staff
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          onStaffUpdated={() => {
            setEditingStaff(null);
            onStaffUpdate();
          }}
        />
      )}

      {/* Delete Staff Modal */}
      {deletingStaff && (
        <DeleteStaffModal
          staff={deletingStaff}
          isOpen={!!deletingStaff}
          onClose={() => setDeletingStaff(null)}
          onStaffDeleted={() => {
            setDeletingStaff(null);
            onStaffUpdate();
          }}
        />
      )}
    </>
  );
}
