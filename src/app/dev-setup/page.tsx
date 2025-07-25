"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DevSetupPage() {
  const [orgId, setOrgId] = useState("");
  const [currentOrgId, setCurrentOrgId] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check current orgId cookie
    const cookies = document.cookie.split(';');
    const orgIdCookie = cookies.find(cookie => cookie.trim().startsWith('orgId='));
    if (orgIdCookie) {
      setCurrentOrgId(orgIdCookie.split('=')[1]);
    }
  }, []);

  const handleSetOrgId = () => {
    if (orgId.trim()) {
      document.cookie = `orgId=${orgId.trim()}; path=/`;
      setCurrentOrgId(orgId.trim());
      alert(`Organization ID set to: ${orgId.trim()}`);
    }
  };

  const handleClearOrgId = () => {
    document.cookie = `orgId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setCurrentOrgId("");
    alert("Organization ID cleared");
  };

  const goToBookings = () => {
    router.push("/dashboard/bookings-row-style");
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Development Setup</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Current Organization ID:
          </label>
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
            {currentOrgId || "Not set"}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Set Organization ID:
          </label>
          <input
            type="text"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="Enter organization ID"
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSetOrgId}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Set Organization ID
          </button>
          
          <button
            onClick={handleClearOrgId}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Organization ID
          </button>
        </div>

        <hr className="my-4" />

        <div className="space-y-2">
          <h3 className="font-medium">Quick Actions:</h3>
          <button
            onClick={goToBookings}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Bookings Calendar
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Development Notes:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use any organization ID from your database</li>
            <li>• Check the seed data for default organization IDs</li>
            <li>• This sets the orgId cookie required by the API routes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
