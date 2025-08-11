// File: src/app/admin/settings/properties/page.tsx
import { PropertyManagement } from "@/components/admin/PropertyManagement";

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Property Management</h2>
        <p className="text-gray-600 mt-1">
          Manage your organization&apos;s properties, including creating new
          properties and editing existing ones.
        </p>
      </div>

      <PropertyManagement />
    </div>
  );
}
