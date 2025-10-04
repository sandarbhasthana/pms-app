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
      console.log("🔍 Property Selector: Fetching user properties...");

      fetch("/api/onboarding/memberships")
        .then((res) => {
          console.log("📡 API Response status:", res.status);
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
          console.log("📋 Received properties data:", data);

          if (data.properties && data.properties.length === 1) {
            // Auto-select if only one property
            const property = data.properties[0];
            console.log(
              "🎯 Auto-selecting single property:",
              property.propertyName
            );
            document.cookie = `orgId=${property.organizationId}; path=/`;
            document.cookie = `propertyId=${property.propertyId}; path=/`;
            console.log("🔄 Auto-navigating to dashboard...");
            router.replace("/dashboard");
          } else if (data.properties && data.properties.length > 0) {
            console.log(
              `📝 Setting ${data.properties.length} properties for selection`
            );
            setProperties(data.properties);
          } else {
            console.error("❌ No properties found for user");
            setProperties([]);
          }
        })
        .catch((error) => {
          console.error("💥 Error fetching properties:", error);
          setProperties([]);
        });
    }
  }, [status, router]);

  const handleSelect = async () => {
    console.log("🎯 Handle Select clicked", { selectedProperty, properties });

    const selectedProp = properties.find(
      (p) => p.propertyId === selectedProperty
    );

    console.log("🏠 Selected property:", selectedProp);

    if (selectedProp) {
      console.log("🍪 Setting cookies:", {
        orgId: selectedProp.organizationId,
        propertyId: selectedProp.propertyId
      });

      // Set cookies with proper expiration
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      document.cookie = `orgId=${selectedProp.organizationId}; path=/; max-age=${maxAge}`;
      document.cookie = `propertyId=${selectedProp.propertyId}; path=/; max-age=${maxAge}`;

      // Small delay to ensure cookies are set before navigation
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("🔄 Navigating to dashboard...");
      // Use window.location.href for a full page reload to ensure middleware sees the cookies
      window.location.href = "/dashboard";
    } else {
      console.error("❌ No property found for selection:", selectedProperty);
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
