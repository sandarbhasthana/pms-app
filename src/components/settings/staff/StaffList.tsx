// File: src/components/settings/staff/StaffList.tsx
"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Phone, Mail, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { EditStaffModal } from "./EditStaffModal";
import { DeleteStaffModal } from "./DeleteStaffModal";

// Property type to emoji mapping
const propertyTypeIcons: Record<string, string> = {
  Hotel: "🏨",
  Resort: "🏖️",
  Motel: "🏩",
  Inn: "🛏️",
  Lodge: "🏕️",
  Hostel: "🛌",
  Apartment: "🏢",
  Villa: "🏡",
  Other: "🏠"
};

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
    propertyShortName?: string | null;
    propertyType?: string | null;
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

  // Sorting state - allow "shift" as a special sortable field
  const [sortField, setSortField] = useState<
    keyof StaffMember | "shift" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const userRole = session?.user?.role;
  const canEditStaff =
    userRole && ["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole);
  const canDeleteStaff =
    userRole && ["SUPER_ADMIN", "ORG_ADMIN"].includes(userRole);

  // Unified role colors - same color for each role across org and property contexts
  // Same pastel colors for both light and dark modes
  const roleColors = {
    SUPER_ADMIN: "bg-red-300",
    ORG_ADMIN: "bg-purple-300",
    OWNER: "bg-pink-300",
    PROPERTY_MGR: "bg-blue-300",
    FRONT_DESK: "bg-orange-300",
    HOUSEKEEPING: "bg-sky-300",
    MAINTENANCE: "bg-amber-300",
    ACCOUNTANT: "bg-indigo-300",
    IT_SUPPORT: "bg-cyan-300",
    SECURITY: "bg-slate-300",
    GUEST_SERVICES: "bg-emerald-300"
  };

  // Role hierarchy for display
  const roleHierarchy = {
    SUPER_ADMIN: {
      level: 5,
      color: roleColors.SUPER_ADMIN
    },
    ORG_ADMIN: {
      level: 4,
      color: roleColors.ORG_ADMIN
    },
    PROPERTY_MGR: {
      level: 3,
      color: roleColors.PROPERTY_MGR
    },
    FRONT_DESK: {
      level: 2,
      color: roleColors.FRONT_DESK
    },
    HOUSEKEEPING: {
      level: 1,
      color: roleColors.HOUSEKEEPING
    },
    MAINTENANCE: {
      level: 1,
      color: roleColors.MAINTENANCE
    },
    ACCOUNTANT: {
      level: 2,
      color: roleColors.ACCOUNTANT
    },
    OWNER: {
      level: 4,
      color: roleColors.OWNER
    },
    IT_SUPPORT: {
      level: 2,
      color: roleColors.IT_SUPPORT
    },
    SECURITY: {
      level: 1,
      color: roleColors.SECURITY
    }
  };

  const shiftLabels = {
    MORNING: "Morning",
    EVENING: "Evening",
    NIGHT: "Night",
    FLEXIBLE: "Flexible"
  };

  // Shift colors for badges (colors represent time of day)
  // Same colors for both light and dark modes
  const shiftColors = {
    MORNING: "bg-yellow-300", // bright morning sunshine (yellow)
    EVENING: "bg-orange-400", // dusky sunset orange
    NIGHT: "bg-indigo-500", // deep night blue/indigo
    FLEXIBLE: "bg-emerald-300" // vibrant adaptable green
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
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Sorting handler
  const handleSort = (field: keyof StaffMember | "shift") => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null); // Reset to no sorting
        setSortDirection("asc");
      }
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sorted staff members
  const sortedStaffMembers = useMemo(() => {
    if (!sortField) return staffMembers;

    return [...staffMembers].sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      // Handle special "shift" field (get first shift from propertyAssignments)
      if (sortField === "shift") {
        aVal = a.propertyAssignments[0]?.shift || "";
        bVal = b.propertyAssignments[0]?.shift || "";
      } else {
        aVal = a[sortField] as string | number | undefined;
        bVal = b[sortField] as string | number | undefined;
      }

      // Handle string fields
      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? -1 : 1;
      if (bVal == null) return sortDirection === "asc" ? 1 : -1;

      // Compare values
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [staffMembers, sortField, sortDirection]);

  // Sortable header component
  const SortableHeader = ({
    field,
    children,
    className = ""
  }: {
    field: keyof StaffMember | "shift";
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    const isAsc = sortDirection === "asc";

    return (
      <TableHead
        className={`cursor-pointer select-none text-center ${className} ${
          isActive
            ? "bg-linear-to-b from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30"
            : ""
        }`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center justify-center gap-1.5 relative">
          <span>{children}</span>
          <div className="flex flex-col items-center gap-0.5">
            {/* Up Triangle */}
            <div
              className={`w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent transition-colors duration-300 ${
                isActive && isAsc
                  ? "border-b-[#7210a2] dark:border-b-[#a855f7]"
                  : "border-b-gray-400 dark:border-b-gray-500"
              }`}
            />
            {/* Down Triangle */}
            <div
              className={`w-0 h-0 border-l-4 border-r-4 border-t-[6px] border-l-transparent border-r-transparent transition-colors duration-300 ${
                isActive && !isAsc
                  ? "border-t-[#7210a2] dark:border-t-[#a855f7]"
                  : "border-t-gray-400 dark:border-t-gray-500"
              }`}
            />
          </div>
          {/* Vertical divider */}
          <div className="absolute right-0 top-0.5 bottom-0.5 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
        </div>
      </TableHead>
    );
  };

  if (staffMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800! rounded-full flex items-center justify-center mb-4">
          <Phone className="h-8 w-8 text-purple-400 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No staff members yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Start building your team by inviting staff members.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-linear-to-b from-white to-gray-50 dark:from-[#1e2939] dark:to-[#1a2332] text-gray-700 dark:text-[#f0f8ff] h-14 uppercase border-b border-gray-200 dark:border-gray-700 shadow-sm text-xs font-medium tracking-wider">
              <SortableHeader field="name" className="w-[200px] px-3 py-4">
                STAFF MEMBER
              </SortableHeader>
              <SortableHeader
                field="organizationRole"
                className="w-[140px] px-3 py-4"
              >
                ORG ROLE
              </SortableHeader>
              <TableHead className="w-[140px] px-3 py-4 text-center">
                <div className="flex items-center justify-center relative">
                  <span>PROP ROLES</span>
                  <div className="absolute right-0 top-0.5 bottom-0.5 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                </div>
              </TableHead>
              <TableHead className="w-[280px] px-3 py-4 text-center">
                <div className="flex items-center justify-center relative">
                  <span>PROP ASSIGNMENTS</span>
                  <div className="absolute right-0 top-0.5 bottom-0.5 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                </div>
              </TableHead>
              <SortableHeader field="shift" className="w-[140px] px-3 py-4">
                SHIFTS
              </SortableHeader>
              <SortableHeader field="email" className="w-[220px] px-3 py-4">
                CONTACT
              </SortableHeader>
              <SortableHeader field="createdAt" className="w-[120px] px-3 py-4">
                JOINED
              </SortableHeader>
              <TableHead className="w-[50px] px-3 py-4 text-center">
                <div className="flex items-center justify-center">
                  <span>ACTIONS</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStaffMembers.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="w-[200px]">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      email={staff.email}
                      name={staff.name}
                      src={staff.image}
                      size="md"
                      className="h-9 w-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm">
                        {staff.name || "Unnamed User"}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="w-[140px]">
                  <Badge
                    data-badge="true"
                    style={
                      { color: "#374151 !important" } as React.CSSProperties
                    }
                    className={`text-xs whitespace-nowrap border-0 pointer-events-none ${
                      roleColors[
                        staff.organizationRole as keyof typeof roleColors
                      ] || "bg-gray-300"
                    }`}
                  >
                    <span data-badge="true">{staff.organizationRole}</span>
                  </Badge>
                </TableCell>

                <TableCell className="w-[140px]">
                  <div className="flex flex-wrap gap-1">
                    {staff.propertyAssignments.length === 0 ? (
                      <span className="text-xs text-gray-600! dark:text-gray-400 italic">
                        No roles
                      </span>
                    ) : (
                      Array.from(
                        new Set(staff.propertyAssignments.map((a) => a.role))
                      ).map((role) => (
                        <Badge
                          key={role}
                          data-badge="true"
                          style={
                            {
                              color: "#374151 !important"
                            } as React.CSSProperties
                          }
                          className={`text-xs whitespace-nowrap border-0 pointer-events-none ${
                            roleColors[role as keyof typeof roleColors] ||
                            "bg-gray-300"
                          }`}
                        >
                          <span data-badge="true">{role}</span>
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>

                <TableCell className="w-[280px]">
                  <TooltipProvider>
                    <div className="space-y-2">
                      {staff.propertyAssignments.length === 0 ? (
                        <span className="text-xs text-gray-600! dark:text-gray-400 italic">
                          No assignments
                        </span>
                      ) : (
                        staff.propertyAssignments.map((assignment, index) => {
                          const icon =
                            propertyTypeIcons[assignment.propertyType || ""] ||
                            propertyTypeIcons.Other;
                          const displayName =
                            assignment.propertyShortName ||
                            assignment.propertyName;

                          return (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center space-x-2 cursor-default">
                                  <span className="text-base shrink-0">
                                    {icon}
                                  </span>
                                  <span className="text-sm font-medium dark:text-gray-200 leading-tight truncate max-w-[200px]">
                                    {displayName}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-sm">
                                  {assignment.propertyName}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })
                      )}
                    </div>
                  </TooltipProvider>
                </TableCell>

                <TableCell className="w-[140px]">
                  <div className="space-y-2">
                    {staff.propertyAssignments.length === 0 ? (
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs text-gray-600! dark:text-gray-400 italic">
                          No shift
                        </span>
                      </div>
                    ) : (
                      staff.propertyAssignments.map((assignment, index) => (
                        <div key={index}>
                          {assignment.shift ? (
                            <Badge
                              data-badge="true"
                              style={
                                {
                                  color: "#374151 !important"
                                } as React.CSSProperties
                              }
                              className={`text-xs inline-flex items-center space-x-1 whitespace-nowrap border-0 pointer-events-none ${
                                shiftColors[
                                  assignment.shift as keyof typeof shiftColors
                                ] || "bg-gray-300"
                              }`}
                            >
                              <Clock className="h-3 w-3" data-badge="true" />
                              <span data-badge="true" className="uppercase">
                                {shiftLabels[
                                  assignment.shift as keyof typeof shiftLabels
                                ] || assignment.shift}
                              </span>
                            </Badge>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <Clock className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs text-gray-600! dark:text-gray-400 italic">
                                No shift
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>

                <TableCell className="w-[220px]">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3 text-purple-300 shrink-0" />
                      <span className="text-xs dark:text-gray-300 truncate">
                        {staff.email}
                      </span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" />
                        <span className="text-xs dark:text-gray-300">
                          {staff.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="w-[120px]">
                  <span className="text-xs dark:text-gray-300 whitespace-nowrap">
                    {formatDate(staff.createdAt)}
                  </span>
                </TableCell>

                <TableCell className="w-[50px]">
                  {(canEditThisStaff(staff) || canDeleteThisStaff(staff)) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditThisStaff(staff) && (
                          <DropdownMenuItem
                            onClick={() => setEditingStaff(staff)}
                            className="hover:bg-[#7210a2]! hover:text-[#f0f8ff]! transition-colors cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Staff
                          </DropdownMenuItem>
                        )}
                        {canDeleteThisStaff(staff) && (
                          <DropdownMenuItem
                            onClick={() => setDeletingStaff(staff)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-600! dark:hover:bg-red-600! hover:text-white! dark:hover:text-white! transition-colors cursor-pointer [&:hover_svg]:text-white!"
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
