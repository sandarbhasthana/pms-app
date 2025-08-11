// File: src/app/debug-property/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Type for the debug room types data structure
interface RoomTypeDebugItem {
  id: string;
  name: string;
  organizationId: string;
  propertyId: string | null;
  createdAt: string;
  _count: {
    rooms: number;
  };
}

interface RoomTypesDebugData {
  propertyId: string;
  organizationId: string;
  propertyRoomTypes: RoomTypeDebugItem[];
  orgRoomTypes: RoomTypeDebugItem[];
  duplicates: Record<string, RoomTypeDebugItem[]>;
  summary: {
    totalPropertyRoomTypes: number;
    totalOrgRoomTypes: number;
    duplicateNames: string[];
  };
}

export default function DebugPropertyPage() {
  const { data: session, update } = useSession();
  const [cookiePropertyId, setCookiePropertyId] = useState<string | null>(null);
  const [apiPropertyId, setApiPropertyId] = useState<string | null>(null);
  const [lastSwitchTime, setLastSwitchTime] = useState<number | null>(null);
  const [roomTypesDebug, setRoomTypesDebug] =
    useState<RoomTypesDebugData | null>(null);

  // Check cookies on client side
  useEffect(() => {
    const checkCookie = () => {
      const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("propertyId="));

      const propertyId = cookie ? cookie.split("=")[1] : null;
      setCookiePropertyId(propertyId);
    };

    checkCookie();
    // Check every second to see real-time updates
    const interval = setInterval(checkCookie, 1000);
    return () => clearInterval(interval);
  }, []);

  // Test API property ID resolution
  const testApiPropertyId = async () => {
    try {
      const response = await fetch("/api/auth/switch-property");
      const data = await response.json();
      console.log("🔍 API Response:", data);
      setApiPropertyId(data.currentPropertyId);
    } catch (error) {
      console.error("Error testing API:", error);
    }
  };

  // Clear cookie for testing
  const clearCookie = () => {
    document.cookie = "propertyId=; path=/; max-age=0";
    setCookiePropertyId(null);
  };

  // Set specific property ID in cookie
  const setCookieProperty = (propertyId: string) => {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `propertyId=${propertyId}; path=/; max-age=${maxAge}; SameSite=Lax`;
    setLastSwitchTime(Date.now());
  };

  // Refresh session manually
  const refreshSession = async () => {
    await update();
    console.log("🔄 Session refreshed manually");
  };

  // Test room types for duplicates
  const testRoomTypes = async () => {
    try {
      const response = await fetch("/api/debug/room-types");
      const data = await response.json();
      console.log("🏠 Room Types Debug:", data);
      setRoomTypesDebug(data);
    } catch (error) {
      console.error("Error testing room types:", error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Property Context Debug</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">📱 Session Info</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Current Property ID:</strong>
              <code className="ml-2 bg-gray-200 px-2 py-1 rounded">
                {session?.user?.currentPropertyId || "null"}
              </code>
            </div>
            <div>
              <strong>Available Properties:</strong>
              <div className="mt-2 space-y-1">
                {session?.user?.availableProperties?.map((prop) => (
                  <div key={prop.id} className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                      {prop.id}
                    </code>
                    <span>{prop.name}</span>
                    {prop.isDefault && (
                      <span className="text-green-600">(Default)</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCookieProperty(prop.id)}
                    >
                      Set Cookie
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cookie Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">🍪 Cookie Info</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Cookie Property ID:</strong>
              <code className="ml-2 bg-blue-200 px-2 py-1 rounded">
                {cookiePropertyId || "null"}
              </code>
            </div>
            <div>
              <strong>All Cookies:</strong>
              <code className="block mt-2 bg-blue-200 p-2 rounded text-xs break-all">
                {typeof window !== "undefined" ? document.cookie : "Loading..."}
              </code>
            </div>
          </div>

          <div className="mt-4 space-x-2">
            <Button size="sm" onClick={testApiPropertyId}>
              Test API Property ID
            </Button>
            <Button size="sm" variant="outline" onClick={refreshSession}>
              Refresh Session
            </Button>
            <Button size="sm" variant="destructive" onClick={clearCookie}>
              Clear Cookie
            </Button>
          </div>

          {apiPropertyId && (
            <div className="mt-3">
              <strong>API Property ID:</strong>
              <code className="ml-2 bg-green-200 px-2 py-1 rounded">
                {apiPropertyId}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Property Comparison */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">
          ⚖️ Property ID Comparison
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Session:</strong>
            <code className="block bg-yellow-200 p-2 rounded mt-1">
              {session?.user?.currentPropertyId || "null"}
            </code>
          </div>
          <div>
            <strong>Cookie:</strong>
            <code className="block bg-yellow-200 p-2 rounded mt-1">
              {cookiePropertyId || "null"}
            </code>
          </div>
          <div>
            <strong>API:</strong>
            <code className="block bg-yellow-200 p-2 rounded mt-1">
              {apiPropertyId || "Click 'Test API' button"}
            </code>
          </div>
        </div>

        <div className="mt-4">
          <strong>Match Status:</strong>
          <span
            className={`ml-2 px-2 py-1 rounded ${
              session?.user?.currentPropertyId === cookiePropertyId
                ? "bg-green-200 text-green-800"
                : "bg-red-200 text-red-800"
            }`}
          >
            {session?.user?.currentPropertyId === cookiePropertyId
              ? "✅ Session & Cookie Match"
              : "❌ Session & Cookie Mismatch"}
          </span>

          {lastSwitchTime && (
            <div className="mt-2 text-xs text-gray-600">
              <strong>Note:</strong> After property switch, session updates
              after page refresh.
              <br />
              Last switch: {new Date(lastSwitchTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Room Types Debug Section */}
      <div className="mt-6 bg-purple-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🏠 Room Types Debug</h2>
        <div className="space-y-4">
          <Button onClick={testRoomTypes} size="sm">
            Check Room Types for Duplicates
          </Button>

          {roomTypesDebug && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Property Room Types:</strong>{" "}
                  {roomTypesDebug.summary?.totalPropertyRoomTypes}
                </div>
                <div>
                  <strong>Org Room Types (no property):</strong>{" "}
                  {roomTypesDebug.summary?.totalOrgRoomTypes}
                </div>
              </div>

              {roomTypesDebug.summary?.duplicateNames?.length > 0 && (
                <div className="bg-red-100 p-3 rounded">
                  <strong className="text-red-800">
                    🚨 Duplicate Room Type Names Found:
                  </strong>
                  <ul className="mt-2 space-y-1">
                    {roomTypesDebug.summary.duplicateNames.map(
                      (name: string) => (
                        <li key={name} className="text-red-700">
                          • {name} ({roomTypesDebug.duplicates[name]?.length}{" "}
                          entries)
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <details className="bg-purple-100 p-3 rounded">
                <summary className="cursor-pointer font-medium">
                  View All Room Types
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-60">
                  {JSON.stringify(roomTypesDebug, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
