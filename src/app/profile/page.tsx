"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/spinner";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = session.user.role;

      // Redirect admin users to admin settings
      if (userRole === "ORG_ADMIN" || userRole === "SUPER_ADMIN") {
        router.replace("/admin/settings/profile");
      } else {
        // For non-admin users, show a simple profile view or redirect to dashboard
        router.replace("/dashboard");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <LoadingSpinner text="Loading profile..." fullScreen />;
  }

  if (status !== "authenticated") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You must be logged in to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <LoadingSpinner text="Redirecting..." fullScreen />;
}
