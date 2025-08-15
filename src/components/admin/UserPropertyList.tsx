// File: src/components/admin/UserPropertyList.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";

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
  createdAt: string;
}

interface UserPropertyListProps {
  onEdit: (assignment: UserPropertyAssignment) => void;
  onDelete: (assignmentId: string) => void;
  onCreate: () => void;
}

export function UserPropertyList({
  onEdit,
  onDelete,
  onCreate
}: UserPropertyListProps) {
  const [assignments, setAssignments] = useState<UserPropertyAssignment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<UserPropertyAssignment | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>("all");

  // Load assignments and properties
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [assignmentsResponse, propertiesResponse] = await Promise.all([
        fetch("/api/user-properties"),
        fetch("/api/properties")
      ]);

      if (!assignmentsResponse.ok || !propertiesResponse.ok) {
        throw new Error("Failed to load data");
      }

      const [assignmentsData, propertiesData] = await Promise.all([
        assignmentsResponse.json(),
        propertiesResponse.json()
      ]);

      setAssignments(assignmentsData);
      setProperties(propertiesData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (assignment: UserPropertyAssignment) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return;

    try {
      await onDelete(assignmentToDelete.id);
      setAssignments(assignments.filter((a) => a.id !== assignmentToDelete.id));
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "PROPERTY_MGR":
        return "default";
      case "FRONT_DESK":
        return "secondary";
      case "HOUSEKEEPING":
        return "outline";
      case "MAINTENANCE":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatRole = (role: string) => {
    return role
      .toLowerCase()
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Filter assignments by property
  const filteredAssignments =
    filterProperty === "all"
      ? assignments
      : assignments.filter((a) => a.propertyId === filterProperty);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">User Property Assignments</h2>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Assign User
          </Button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">User Property Assignments</h2>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Assign User
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading assignments: {error}</p>
              <Button onClick={loadData} className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Property Assignments</h2>
          <p className="text-gray-600">Manage user access to properties</p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Assign User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="property-filter">Filter by Property:</Label>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-500">
          {filteredAssignments.length} assignment
          {filteredAssignments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assignments found
            </h3>
            <p className="text-gray-600 mb-4">
              {filterProperty === "all"
                ? "Get started by assigning users to properties."
                : "No users assigned to the selected property."}
            </p>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Assign User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="card-hover purple-accent-hover transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{assignment.user.name}</h3>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Mail className="h-3 w-3" />
                          <span>{assignment.user.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Property Info */}
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-px bg-gray-200"></div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {assignment.property.name}
                        </span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <Badge variant={getRoleBadgeVariant(assignment.role)}>
                      {formatRole(assignment.role)}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(assignment)}
                      className="text-purple-primary border-purple-primary hover:bg-purple-primary hover:text-white"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(assignment)}
                      className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {assignmentToDelete?.user.name}{" "}
              from {assignmentToDelete?.property.name}? This will revoke their
              access to this property.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Remove Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
