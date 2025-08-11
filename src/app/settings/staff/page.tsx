// File: src/app/settings/staff/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StaffManagement } from "@/components/settings/staff/StaffManagement";

export default function StaffManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    const userRole = session.user.role;
    
    // Check if user has permission to access staff management
    if (!["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole)) {
      router.push("/dashboard"); // Redirect to dashboard if no access
      return;
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Don't render anything if user doesn't have access (will be redirected)
  if (!session?.user || !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(session.user.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Staff Management</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your team members, invite new staff, and assign roles and properties.
        </p>
      </div>
      
      <StaffManagement />
    </div>
  );
}
