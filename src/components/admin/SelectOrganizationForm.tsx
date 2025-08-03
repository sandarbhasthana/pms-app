"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  domain: string;
}

interface Membership {
  organizationId: string;
  organizationName: string;
}

export default function SelectOrganizationForm() {
  const { data: session, status } = useSession();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string>("");

  useEffect(() => {
    if (status === "authenticated") {
      // Fetch both organization list and memberships
      Promise.all([
        fetch("/api/orgs").then(res => res.json()),
        fetch("/api/onboarding/memberships").then(res => res.json())
      ])
        .then(([orgsData, membershipsData]) => {
          setOrgs(orgsData);
          setMemberships(membershipsData.memberships || []);
        })
        .catch((error) => {
          console.error("Error fetching organizations:", error);
          toast.error("Failed to load organizations");
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  const handleSelectByDomain = (domain: string) => {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    
    // Determine root domain (e.g. "pms-app.com")
    const rawHost = typeof window !== "undefined" ? window.location.hostname : "";
    const hostParts = rawHost.split(".");
    const rootDomain = hostParts.slice(-2).join(".");
    
    window.location.href = `${protocol}//${domain}.${rootDomain}${port}`;
  };

  const handleSelectById = () => {
    if (!selectedOrg) {
      toast.error("Please select an organization");
      return;
    }
    
    document.cookie = `orgId=${selectedOrg}; path=/`;
    window.location.href = "/dashboard";
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="text-center text-red-600">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Domain-based Organization Selection */}
      {orgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Switch Organization (Domain-based)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select an organization to switch to its subdomain. This will redirect you to the organization's specific URL.
            </p>
            <div className="space-y-3">
              {orgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{org.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Domain: {org.domain}</p>
                  </div>
                  <Button 
                    onClick={() => handleSelectByDomain(org.domain)} 
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Switch
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership-based Organization Selection */}
      {memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Organization (Session-based)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select an organization to work with. This will set your current organization context.
            </p>
            <div className="space-y-4">
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                title="Select your organization"
              >
                <option value="" disabled>
                  -- Choose your organization --
                </option>
                {memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organizationName}
                  </option>
                ))}
              </select>
              <Button
                disabled={!selectedOrg}
                onClick={handleSelectById}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orgs.length === 0 && memberships.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No organizations found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
