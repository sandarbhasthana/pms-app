"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChannelManagerSettings } from "@/components/settings/channels/ChannelManagerSettings";

export default function ChannelManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    const userRole = session.user.role;

    // Check if user has permission to access channel manager settings
    // SUPER_ADMIN, ORG_ADMIN, and PROPERTY_MGR can access
    if (!["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole)) {
      router.push("/dashboard");
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
  if (
    !session?.user ||
    !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(session.user.role)
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Channel Manager</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Connect your property to OTAs like Booking.com, Expedia, and Airbnb
          through Channex integration.
        </p>
      </div>

      <ChannelManagerSettings />
    </div>
  );
}

