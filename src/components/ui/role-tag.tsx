// File: src/components/ui/role-tag.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Role and status type definitions
export type OrganizationRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "PROPERTY_MGR"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "ACCOUNTANT"
  | "OWNER"
  | "IT_SUPPORT";

export type PropertyStatus = "DEFAULT" | "ACTIVE" | "INACTIVE";

// Role display labels
const roleLabels: Record<OrganizationRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Org Admin",
  PROPERTY_MGR: "Property Manager",
  FRONT_DESK: "Front Desk",
  HOUSEKEEPING: "Housekeeping",
  MAINTENANCE: "Maintenance",
  ACCOUNTANT: "Accountant",
  OWNER: "Owner",
  IT_SUPPORT: "IT Support"
};

// Property status labels
const propertyStatusLabels: Record<PropertyStatus, string> = {
  DEFAULT: "Default",
  ACTIVE: "Active",
  INACTIVE: "Inactive"
};

// Role CSS class mapping
const roleClasses: Record<OrganizationRole, string> = {
  SUPER_ADMIN: "role-super-admin",
  ORG_ADMIN: "role-org-admin",
  PROPERTY_MGR: "role-property-mgr",
  FRONT_DESK: "role-front-desk",
  HOUSEKEEPING: "role-housekeeping",
  MAINTENANCE: "role-maintenance",
  ACCOUNTANT: "role-accountant",
  OWNER: "role-owner",
  IT_SUPPORT: "role-it-support"
};

// Property status CSS class mapping
const propertyStatusClasses: Record<PropertyStatus, string> = {
  DEFAULT: "property-default-tag",
  ACTIVE: "property-active-tag",
  INACTIVE: "property-inactive-tag"
};

interface RoleTagProps extends React.HTMLAttributes<HTMLDivElement> {
  role: OrganizationRole;
  variant?: "default" | "compact";
}

interface PropertyStatusTagProps extends React.HTMLAttributes<HTMLDivElement> {
  status: PropertyStatus;
  variant?: "default" | "compact";
}

// Role Tag Component
export function RoleTag({
  role,
  variant = "default",
  className,
  ...props
}: RoleTagProps) {
  const roleClass = roleClasses[role];
  const label = roleLabels[role];

  return (
    <Badge
      className={cn(
        "inline-flex items-center rounded-full py-0.5 text-xs transition-colors",
        variant === "compact" ? "px-2" : "px-2.5",
        roleClass,
        className
      )}
      {...props}
    >
      {label}
    </Badge>
  );
}

// Property Status Tag Component
export function PropertyStatusTag({
  status,
  variant = "default",
  className,
  ...props
}: PropertyStatusTagProps) {
  const statusClass = propertyStatusClasses[status];
  const label = propertyStatusLabels[status];

  return (
    <Badge
      className={cn(
        "inline-flex items-center rounded-full py-0.5 text-xs transition-colors",
        variant === "compact" ? "px-2" : "px-2.5",
        statusClass,
        className
      )}
      {...props}
    >
      {label}
    </Badge>
  );
}

// Utility function to get role class name
export function getRoleClassName(role: OrganizationRole): string {
  return roleClasses[role] || "";
}

// Utility function to get property status class name
export function getPropertyStatusClassName(status: PropertyStatus): string {
  return propertyStatusClasses[status] || "";
}

// Utility function to format role display name
export function formatRoleDisplayName(role: string): string {
  return (
    roleLabels[role as OrganizationRole] ||
    role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

// Utility function to format property status display name
export function formatPropertyStatusDisplayName(status: string): string {
  return (
    propertyStatusLabels[status as PropertyStatus] ||
    status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}
