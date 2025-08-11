// File: src/components/admin/UserPropertyManagement.tsx
"use client";

import { useState } from "react";
import { UserPropertyList } from "./UserPropertyList";
import { UserPropertyForm } from "./UserPropertyForm";

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

type UserPropertyFormData = {
  userId: string;
  propertyId: string;
  role: string;
};

type ViewMode = 'list' | 'create' | 'edit';

export function UserPropertyManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAssignment, setSelectedAssignment] = useState<UserPropertyAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = () => {
    setSelectedAssignment(null);
    setViewMode('create');
  };

  const handleEdit = (assignment: UserPropertyAssignment) => {
    setSelectedAssignment(assignment);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setSelectedAssignment(null);
    setViewMode('list');
  };

  const handleSubmit = async (data: UserPropertyFormData) => {
    setIsLoading(true);
    try {
      const url = viewMode === 'create' ? '/api/user-properties' : `/api/user-properties/${selectedAssignment?.id}`;
      const method = viewMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save assignment');
      }

      // Success - return to list view
      setViewMode('list');
      setSelectedAssignment(null);
    } catch (error) {
      // Re-throw error to be handled by the form
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    const response = await fetch(`/api/user-properties/${assignmentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete assignment');
    }
  };

  // Render based on current view mode
  switch (viewMode) {
    case 'create':
      return (
        <UserPropertyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );

    case 'edit':
      return (
        <UserPropertyForm
          assignment={selectedAssignment!}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );

    case 'list':
    default:
      return (
        <UserPropertyList
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      );
  }
}
