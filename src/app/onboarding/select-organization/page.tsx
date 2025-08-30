// File: src/app/onboarding/select-organization/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Property {
  propertyId: string;
  propertyName: string;
  organizationId: string;
  organizationName: string;
  isDefault: boolean;
}

export default function SelectOrganizationPage() {
  const { status } = useSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/onboarding/memberships")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Response is not JSON");
          }
          return res.json();
        })
        .then((data) => {
          if (data.properties && data.properties.length === 1) {
            // Auto-select if only one property
            document.cookie = `orgId=${data.properties[0].organizationId}; path=/`;
            document.cookie = `propertyId=${data.properties[0].propertyId}; path=/`;
            router.replace("/dashboard");
          } else if (data.properties && data.properties.length > 0) {
            setProperties(data.properties);
          } else {
            console.error("No properties found for user");
            setProperties([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching properties:", error);
          setProperties([]);
        });
    }
  }, [status, router]);

  const handleSelect = () => {
    const selectedProp = properties.find(
      (p) => p.propertyId === selectedProperty
    );
    if (selectedProp) {
      document.cookie = `orgId=${selectedProp.organizationId}; path=/`;
      document.cookie = `propertyId=${selectedProp.propertyId}; path=/`;
      router.replace("/dashboard");
    }
  };

  if (status !== "authenticated") return <p>Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl mb-4">Select Your Property</h1>
      <select
        value={selectedProperty}
        onChange={(e) => setSelectedProperty(e.target.value)}
        className="border p-2 mb-4 min-w-80"
        title="Select your property"
      >
        <option value="" disabled>
          -- Choose your property --
        </option>
        {properties.map((property) => (
          <option key={property.propertyId} value={property.propertyId}>
            {property.propertyName} {property.isDefault && "(Default)"} -{" "}
            {property.organizationName}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selectedProperty}
        onClick={handleSelect}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
