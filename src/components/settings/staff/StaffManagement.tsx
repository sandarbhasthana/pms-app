// File: src/components/settings/staff/StaffManagement.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Users, UserPlus, UserCheck, Clock } from "lucide-react";
import { StaffList } from "./StaffList";
import { CreateUserModal } from "./CreateUserModal";

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
    role: string;
    shift?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

// Helper function to get organization ID from cookies
function getOrgIdFromCookie(): string | null {
  if (typeof window === "undefined") return null;

  const orgIdCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("orgId="));

  return orgIdCookie ? orgIdCookie.split("=")[1] : null;
}

type FilterType = "all" | "active" | "pending";

export function StaffManagement() {
  const { data: session } = useSession();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Get orgId from cookie or session as fallback
  const getOrgId = () => {
    const cookieOrgId = getOrgIdFromCookie();
    const sessionOrgId = session?.user?.orgId;
    return cookieOrgId || sessionOrgId || null;
  };

  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      const orgId = getOrgId();
      console.log("🔍 Fetching staff members for orgId:", orgId);

      if (!orgId) {
        console.error("❌ No orgId available from cookie or session");
        return;
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-organization-id": orgId
      };

      const response = await fetch("/api/admin/staff-overview", {
        method: "GET",
        headers,
        credentials: "include"
      });

      console.log("📡 Staff overview response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Staff members received:", data.users?.length || 0);
        setStaffMembers(data.users || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Failed to fetch staff members:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || "Unknown error"
        });
      }
    } catch (error) {
      console.error("💥 Error fetching staff members:", error);
    }
  };

  // Initial data fetch - wait for session to be available
  useEffect(() => {
    // Only fetch when session is loaded
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      await fetchStaffMembers();
      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Handle successful user creation
  const handleUserCreated = () => {
    console.log("🎉 User created successfully, refreshing staff list...");
    setShowCreateUserModal(false);
    fetchStaffMembers(); // Refresh staff list
  };

  // Handle staff member update
  const handleStaffUpdate = () => {
    fetchStaffMembers(); // Refresh staff list
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const userRole = session?.user?.role;
  const canCreateUsers =
    userRole && ["ORG_ADMIN", "PROPERTY_MGR"].includes(userRole);

  // Calculate login status counts
  const pendingLoginCount = staffMembers.filter(
    (m) => m.lastLoginAt === null
  ).length;
  const activeLoginCount = staffMembers.filter(
    (m) => m.lastLoginAt !== null
  ).length;

  // Filter staff members based on active filter
  const filteredStaffMembers = staffMembers.filter((member) => {
    if (activeFilter === "pending") return member.lastLoginAt === null;
    if (activeFilter === "active") return member.lastLoginAt !== null;
    return true; // "all"
  });

  // Handle card click for filtering
  const handleCardClick = (filter: FilterType) => {
    setActiveFilter((current) => (current === filter ? "all" : filter));
  };

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-600" />
            <span className="text-lg font-medium">Team Overview</span>
          </div>
        </div>

        <div className="flex space-x-2">
          {canCreateUsers && (
            <Button
              onClick={() => setShowCreateUserModal(true)}
              className="bg-[#7210a2] hover:bg-[#7210a2]/90 text-[#f0f8ff] dark:hover:bg-[#7210a2]/50 cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Staff */}
        <Card
          className={`card-hover transition-all duration-200 hover:shadow-lg cursor-pointer ${
            activeFilter === "all"
              ? "ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-900"
              : ""
          }`}
          onClick={() => handleCardClick("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Total Staff
            </CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {staffMembers.length}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Registered team members
            </p>
          </CardContent>
        </Card>

        {/* Active Users (have logged in) */}
        <Card
          className={`card-hover transition-all duration-200 hover:shadow-lg cursor-pointer ${
            activeFilter === "active"
              ? "ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900"
              : ""
          }`}
          onClick={() => handleCardClick("active")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Active Users
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {activeLoginCount}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Have logged in
            </p>
          </CardContent>
        </Card>

        {/* Pending Login */}
        <Card
          className={`card-hover transition-all duration-200 hover:shadow-lg cursor-pointer ${
            activeFilter === "pending"
              ? "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-gray-900"
              : ""
          }`}
          onClick={() => handleCardClick("pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Pending Login
            </CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {pendingLoginCount}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Awaiting first login
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Team Members
            {activeFilter !== "all" && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                (Showing {activeFilter === "pending" ? "pending" : "active"}{" "}
                users)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Manage your team members, their roles, and property assignments.
            {activeFilter !== "all" && (
              <Button
                variant="link"
                className="p-0 h-auto text-purple-600 dark:text-purple-400 ml-2"
                onClick={() => setActiveFilter("all")}
              >
                Clear filter
              </Button>
            )}
          </CardDescription>
        </CardHeader>
        <StaffList
          staffMembers={filteredStaffMembers}
          onStaffUpdate={handleStaffUpdate}
        />
      </Card>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
}
