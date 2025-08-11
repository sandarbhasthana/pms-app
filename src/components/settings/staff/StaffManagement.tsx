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
import { Plus, Users, UserPlus, Clock, Settings } from "lucide-react";
import { StaffList } from "./StaffList";
import { InviteUserModal } from "./InviteUserModal";
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
  const [showEmailTestModal, setShowEmailTestModal] = useState(false);
  const [activeTab, setActiveTab] = useState("staff");

  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      const orgId = getOrgIdFromCookie();
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

      if (response.ok) {
        const data = await response.json();
        setStaffMembers(data.users || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch staff members:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error fetching staff members:", error);
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
              <Button
                onClick={() => setShowEmailTestModal(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Test Email
              </Button>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Staff Member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffMembers.length}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Invitations
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations.filter((inv) => inv.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                invitations.filter((inv) => {
                  const createdAt = new Date(inv.createdAt);
                  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                  return createdAt > dayAgo;
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Invitations sent today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="invitations">
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
            <CardContent>
              <StaffList
                staffMembers={staffMembers}
                onStaffUpdate={handleStaffUpdate}
              />
            </CardContent>
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
