// File: src/app/onboarding/select-organization/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Membership {
  organizationId: string;
  organizationName: string;
}

export default function SelectOrganizationPage() {
  const { status } = useSession();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/onboarding/memberships")
        .then((res) => res.json())
        .then((data) => {
          if (data.memberships.length === 1) {
            document.cookie = `orgId=${data.memberships[0].organizationId}; path=/`;
            router.replace("/dashboard");
          } else {
            setMemberships(data.memberships);
          }
        });
    }
  }, [status, router]);

  const handleSelect = () => {
    document.cookie = `orgId=${selectedOrg}; path=/`;
    router.replace("/dashboard");
  };

  if (status !== "authenticated") return <p>Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl mb-4">Select Your Property</h1>
      <select
        value={selectedOrg}
        onChange={(e) => setSelectedOrg(e.target.value)}
        className="border p-2 mb-4"
        title="Select your property"
      >
        <option value="" disabled>
          -- Choose your property --
        </option>
        {memberships.map((m) => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.organizationName}
          </option>
        ))}
      </select>
      <button
        disabled={!selectedOrg}
        onClick={handleSelect}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
