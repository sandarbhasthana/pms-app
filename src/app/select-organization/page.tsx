// File: src/app/select-organization/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Org {
  id: string;
  name: string;
  domain: string;
}

export default function SelectOrganizationPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orgs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch organizations");
        return res.json();
      })
      .then((data: Org[]) => setOrgs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center mt-20">Loading organizations...</p>;
  }

  if (orgs.length === 0) {
    return <p className="text-center mt-20">No organizations found.</p>;
  }

  // Determine root domain (e.g. "pms-app.com")
  const rawHost = typeof window !== "undefined" ? window.location.hostname : "";
  const hostParts = rawHost.split(".");
  const rootDomain = hostParts.slice(-2).join(".");

  const handleSelect = (domain: string) => {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    window.location.href = `${protocol}//${domain}.${rootDomain}${port}`;
  };

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-semibold text-center">
        Choose Your Organization
      </h1>
      {orgs.map((org) => (
        <Card key={org.id} className="hover:shadow-lg">
          <CardContent className="flex justify-between items-center">
            <span>{org.name}</span>
            <Button onClick={() => handleSelect(org.domain)} size="sm">
              Enter
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
