// SUPER_ADMIN organizations management page

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

import { OrganizationsManagement } from "@/components/admin/OrganizationsManagement";

export const metadata: Metadata = {
  title: "Organizations Management | Admin",
  description: "Manage organizations and onboard new clients"
};

export default async function AdminOrganizationsPage() {
  // Check authentication and authorization
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:!bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Organizations Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage organizations and onboard new clients to the platform
          </p>
        </div>

        {/* Main Content */}
        <OrganizationsManagement />
      </div>
    </div>
  );
}
