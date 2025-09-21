"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Plus, Building2, Users, Activity } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { OnboardingSheet } from "@/components/admin/onboarding/OnboardingSheet";
import { OnboardingApiResponse } from "@/lib/types/organization-onboarding";

// Types for better type safety
interface Organization {
  id: string;
  name: string;
  domain: string;
  industry?: string;
  size?: string;
  contactPhone?: string;
  contactAddress?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalUsers: number;
    totalProperties: number;
    totalReservations: number;
  };
  adminUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  organizationName?: string;
  userName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function OrganizationsManagement() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Fetch organizations list
  const fetchOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch recent activities
  const fetchRecentActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true);
      const response = await fetch("/api/admin/activities?limit=5");
      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  // Load data on component mount only
  useEffect(() => {
    fetchOrganizations();
    fetchRecentActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we only want to fetch data once on mount

  const handleOnboardingSuccess = (data: OnboardingApiResponse["data"]) => {
    if (data) {
      toast.success(
        `Organization "${data.organizationName}" created successfully!`
      );
      toast.success(`Welcome email sent to ${data.adminEmail}`);

      // Refresh organizations list and activities
      fetchOrganizations();
      fetchRecentActivities();

      // Show success details with login credentials
      toast.success(`Admin user created: ${data.adminEmail}`, {
        duration: 8000
      });
      toast.success(`Organization ID: ${data.organizationId}`, {
        duration: 8000
      });

      // Show login credentials
      if (data.temporaryPassword) {
        // Copy credentials to clipboard
        const credentials = `Email: ${data.adminEmail}\nPassword: ${data.temporaryPassword}\nLogin URL: ${data.loginUrl}`;
        navigator.clipboard.writeText(credentials).catch(() => {
          console.log("Could not copy to clipboard");
        });

        toast.success(`🔑 Temporary Password: ${data.temporaryPassword}`, {
          duration: 15000, // Show for 15 seconds
          style: {
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            color: "#92400e"
          }
        });
        toast.success(`🌐 Login URL: ${data.loginUrl}`, {
          duration: 15000,
          style: {
            backgroundColor: "#dbeafe",
            border: "1px solid #3b82f6",
            color: "#1e40af"
          }
        });
        toast.success(`📋 Login credentials copied to clipboard!`, {
          duration: 10000,
          style: {
            backgroundColor: "#dcfce7",
            border: "1px solid #16a34a",
            color: "#15803d"
          }
        });
      }

      console.log("🔐 Login Credentials:", {
        email: data.adminEmail,
        temporaryPassword: data.temporaryPassword,
        loginUrl: data.loginUrl,
        organizationId: data.organizationId
      });
    }
  };

  const handleOpenOnboarding = useCallback(() => {
    setIsOnboardingOpen(true);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setIsOnboardingOpen(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Common administrative tasks
          </p>
        </div>

        <Button
          onClick={handleOpenOnboarding}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                organizations.length
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : "Active organizations"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-muted-foreground">+18 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Properties
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">+7 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Growth
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">
              Organizations growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest organization and user activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:!bg-gray-800 rounded-lg animate-pulse"
                >
                  <div className="w-2 h-2 bg-gray-300 dark:!bg-gray-800 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:!bg-gray-800 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:!bg-gray-800 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const activityColors = [
                  "bg-green-500",
                  "bg-blue-500",
                  "bg-purple-500",
                  "bg-orange-500",
                  "bg-red-500"
                ];
                const colorClass =
                  activityColors[index % activityColors.length];
                const timeAgo = new Date(activity.timestamp).toLocaleString();

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:!bg-gray-800 rounded-lg"
                  >
                    <div className={`w-2 h-2 ${colorClass} rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {timeAgo}
                        {activity.organizationName &&
                          ` • Organization: ${activity.organizationName}`}
                        {activity.userName && ` • User: ${activity.userName}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activities found</p>
              <p className="text-sm">
                Activities will appear here as they occur
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organizations List Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations Overview
          </CardTitle>
          <CardDescription>
            Quick overview of all organizations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Grand Palace Hotels
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    grandpalace • Hotel • 15 users • 3 properties
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                  Active
                </span>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Luxury Resorts Inc
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    luxuryresorts • Resort • 28 users • 7 properties
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                  Active
                </span>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Boutique Hotels Group
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    boutiquehotels • Hotel • 12 users • 5 properties
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                  Active
                </span>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" className="w-full">
              View All Organizations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Sheet */}
      <OnboardingSheet
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}
