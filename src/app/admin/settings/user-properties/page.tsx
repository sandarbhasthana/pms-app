// File: src/app/admin/settings/user-properties/page.tsx
import { UserPropertyManagement } from "@/components/admin/UserPropertyManagement";

export default function UserPropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">User Property Assignments</h2>
        <p className="text-gray-600 mt-1">
          Assign users to properties and manage their roles. Users can have different roles for different properties.
        </p>
      </div>
      
      <UserPropertyManagement />
    </div>
  );
}
