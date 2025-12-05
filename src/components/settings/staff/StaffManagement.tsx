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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Clock } from "lucide-react";
import { StaffList } from "./StaffList";
import { InviteUserModal } from "./InviteUserModal";
import { CreateUserModal } from "./CreateUserModal";
import { InvitationsList } from "./InvitationsList";
import { EmailTestModal } from "./EmailTestModal";

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
}

interface Invitation {
  id: string;
  email: string;
  phone: string;
  organizationRole: string;
  propertyRole?: string;
  shift?: string;
  status: "pending" | "used" | "expired";
  organizationName: string;
  propertyName?: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

// Helper function to get organization ID from cookies
function getOrgIdFromCookie(): string | null {
  if (typeof window === "undefined") return null;

  const orgIdCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("orgId="));

  return orgIdCookie ? orgIdCookie.split("=")[1] : null;
}

export function StaffManagement() {
  const { data: session } = useSession();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEmailTestModal, setShowEmailTestModal] = useState(false);
  const [activeTab, setActiveTab] = useState("staff");

  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      const orgId = getOrgIdFromCookie();
      console.log("🔍 Fetching staff members for orgId:", orgId);

      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };

      if (orgId) {
        headers["x-organization-id"] = orgId;
      }

      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers,
        credentials: "include"
      });

      console.log("📡 Staff fetch response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Staff data received:", data);
        console.log("👥 Number of staff members:", data.users?.length || 0);
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

  // Fetch invitations
  const fetchInvitations = async () => {
    try {
      const orgId = getOrgIdFromCookie();
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };

      if (orgId) {
        headers["x-organization-id"] = orgId;
      }

      const response = await fetch("/api/admin/users/invite", {
        method: "GET",
        headers,
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch invitations:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStaffMembers(), fetchInvitations()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Handle successful invitation
  const handleInvitationSent = () => {
    setShowInviteModal(false);
    fetchInvitations(); // Refresh invitations list
  };

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

  // Handle invitation action (resend, cancel)
  const handleInvitationAction = () => {
    fetchInvitations(); // Refresh invitations list
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const userRole = session?.user?.role;
  const canInviteUsers =
    userRole && ["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole);

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
          {canInviteUsers && (
            <>
              {/* <Button
                onClick={() => setShowEmailTestModal(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Test Email
              </Button> */}
              <Button
                onClick={() => setShowCreateUserModal(true)}
                variant="outline"
                className="text-[#7210a2] hover:bg-[#7210a2]! hover:text-white cursor-pointer"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-[#7210a2] hover:bg-[#7210a2]/90 text-[#f0f8ff] dark:hover:bg-[#7210a2]/50 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover transition-all duration-200 hover:shadow-lg">
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
              Active team members
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Pending Invitations
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {invitations.filter((inv) => inv.status === "pending").length}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Recent Activity
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30! rounded-lg">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {
                invitations.filter((inv) => {
                  const createdAt = new Date(inv.createdAt);
                  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                  return createdAt > dayAgo;
                }).length
              }
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Invitations sent today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-gray-100 dark:bg-transparent! border border-purple-600 dark:border-purple-500 rounded-lg">
          <TabsTrigger
            value="staff"
            className="data-[state=active]:bg-[#7210a2] data-[state=active]:text-white! dark:data-[state=active]:bg-[#ab2aea] dark:data-[state=active]:text-white! text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
          >
            Staff Members
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="data-[state=active]:bg-[#7210a2] data-[state=active]:text-white! dark:data-[state=active]:bg-[#ab2aea] dark:data-[state=active]:text-white! text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
          >
            Invitations (
            {invitations.filter((inv) => inv.status === "pending").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your team members, their roles, and property assignments.
              </CardDescription>
            </CardHeader>
            <StaffList
              staffMembers={staffMembers}
              onStaffUpdate={handleStaffUpdate}
            />
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Manage sent invitations and track their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationsList
                invitations={invitations}
                onInvitationAction={handleInvitationAction}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvitationSent={handleInvitationSent}
        />
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}

      {/* Email Test Modal */}
      {showEmailTestModal && (
        <EmailTestModal
          isOpen={showEmailTestModal}
          onClose={() => setShowEmailTestModal(false)}
        />
      )}
    </div>
  );
}
