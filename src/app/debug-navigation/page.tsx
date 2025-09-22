"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function DebugNavigationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cookies, setCookies] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cookieObj: Record<string, string> = {};
      document.cookie.split("; ").forEach((cookie) => {
        const [key, value] = cookie.split("=");
        if (key && value) {
          cookieObj[key] = value;
        }
      });
      setCookies(cookieObj);
    }
  }, []);

  const testDashboardNavigation = () => {
    console.log("🧪 Testing dashboard navigation...");
    router.push("/dashboard");
  };

  const clearCookies = () => {
    document.cookie = "orgId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "propertyId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔧 Navigation Debug Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Info */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">📱 Session Info</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Status:</strong> {status}
            </div>
            <div>
              <strong>User Role:</strong> {session?.user?.role || "N/A"}
            </div>
            <div>
              <strong>Current Property ID:</strong>{" "}
              {session?.user?.currentPropertyId || "N/A"}
            </div>
            <div>
              <strong>Org ID:</strong> {session?.user?.orgId || "N/A"}
            </div>
            <div>
              <strong>Property Count:</strong>{" "}
              {session?.user?.propertyCount || 0}
            </div>
            <div>
              <strong>Available Properties:</strong>{" "}
              {session?.user?.availableProperties?.length || 0}
            </div>
          </div>

          {session?.user?.availableProperties && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Available Properties:</h3>
              <div className="space-y-1">
                {session.user.availableProperties.map((prop) => (
                  <div
                    key={prop.id}
                    className="text-xs bg-white dark:bg-gray-700 p-2 rounded"
                  >
                    <div>
                      <strong>{prop.name}</strong>
                    </div>
                    <div>ID: {prop.id}</div>
                    <div>Default: {prop.isDefault ? "Yes" : "No"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cookie Info */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">🍪 Cookie Info</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>orgId:</strong> {cookies.orgId || "Not set"}
            </div>
            <div>
              <strong>propertyId:</strong> {cookies.propertyId || "Not set"}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">All Cookies:</h3>
            <div className="space-y-1">
              {Object.entries(cookies).map(([key, value]) => (
                <div
                  key={key}
                  className="text-xs bg-white dark:bg-gray-700 p-2 rounded"
                >
                  <strong>{key}:</strong> {value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-x-4">
        <button
          onClick={testDashboardNavigation}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🧪 Test Dashboard Navigation
        </button>

        <button
          onClick={clearCookies}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          🗑️ Clear Cookies & Reload
        </button>

        <button
          onClick={() => router.push("/onboarding/select-organization")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          🏠 Go to Property Selector
        </button>
      </div>

      {/* Middleware Logic Explanation */}
      <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🔄 Middleware Logic</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>Enhanced Flow:</strong>
          </p>
          <div className="space-y-3">
            <div>
              <p>
                <strong>Single Property Org:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-xs">
                <li>User logs in as ORG_ADMIN</li>
                <li>Middleware sees propertyCount === 1</li>
                <li>Auto-sets cookies and allows dashboard access</li>
                <li>No property selector shown!</li>
              </ol>
            </div>
            <div>
              <p>
                <strong>Multi-Property Org:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-xs">
                <li>User logs in as ORG_ADMIN</li>
                <li>Middleware sees propertyCount &gt; 1</li>
                <li>Redirects to property selector</li>
                <li>User selects property and clicks Continue</li>
                <li>Property selector sets cookies</li>
                <li>Middleware allows dashboard access</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
