"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditBookingSheet from "@/components/bookings/EditBookingSheet";
import PerformanceTestWrapper from "@/components/debug/PerformanceTestWrapper";
import {
  EditReservationData,
  EditBookingFormData
} from "@/components/bookings/edit-tabs/types";

const TestPerformancePage = () => {
  const [editingReservation, setEditingReservation] =
    useState<EditReservationData | null>(null);
  const [forceRerenderCount, setForceRerenderCount] = useState(0);
  const [testScenario, setTestScenario] = useState<string>("none");

  // Mock reservation data
  const mockReservation: EditReservationData = {
    id: "test-reservation-123",
    guestName: "John Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    idType: "passport",
    idNumber: "AB123456",
    issuingCountry: "US",
    roomId: "room-101",
    roomName: "Deluxe Room",
    roomNumber: "101",
    checkIn: "2024-01-15",
    checkOut: "2024-01-18",
    adults: 2,
    children: 1,
    status: "CONFIRMED",
    paymentStatus: "PARTIALLY_PAID",
    ratePlan: "Standard Rate",
    notes: "Guest requested late checkout",
    totalAmount: 450.0,
    paidAmount: 200.0,
    remainingBalance: 250.0,
    addons: [],
    payments: []
  };

  // Create a new object reference (simulates parent re-render with new object)
  const createNewObjectReference = useCallback(() => {
    if (editingReservation) {
      setEditingReservation({ ...editingReservation });
      console.log("🔄 Created new object reference (same data)");
    }
  }, [editingReservation]);

  // Force parent component re-render
  const forceParentRerender = useCallback(() => {
    setForceRerenderCount((prev) => prev + 1);
    console.log("🔄 Forced parent re-render");
  }, []);

  // Simulate rapid object reference changes
  const simulateRapidChanges = useCallback(() => {
    setTestScenario("rapid-changes");
    let count = 0;
    const interval = setInterval(() => {
      if (count < 10) {
        createNewObjectReference();
        count++;
      } else {
        clearInterval(interval);
        setTestScenario("none");
        console.log("✅ Rapid changes test completed");
      }
    }, 100);
  }, [createNewObjectReference]);

  const handleUpdate = async (
    id: string,
    data: Partial<EditBookingFormData>
  ) => {
    console.log("📝 Update called:", { id, data });
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const handleDelete = async (id: string) => {
    console.log("🗑️ Delete called:", id);
    setEditingReservation(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          EditBookingSheet Performance Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the optimizations to ensure no unnecessary re-renders occur
        </p>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => setEditingReservation(mockReservation)}
              variant="default"
            >
              Open Sheet
            </Button>

            <Button
              onClick={() => setEditingReservation(null)}
              variant="outline"
            >
              Close Sheet
            </Button>

            <Button
              onClick={createNewObjectReference}
              variant="secondary"
              disabled={!editingReservation}
            >
              New Object Ref
            </Button>

            <Button onClick={forceParentRerender} variant="secondary">
              Force Re-render
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={simulateRapidChanges}
              variant="destructive"
              disabled={!editingReservation || testScenario === "rapid-changes"}
            >
              {testScenario === "rapid-changes"
                ? "Running Rapid Test..."
                : "Simulate Rapid Changes"}
            </Button>

            <Button
              onClick={() => {
                console.clear();
                console.log("🧹 Console cleared - Start fresh testing");
              }}
              variant="outline"
            >
              Clear Console
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Parent Renders:
              </span>
              <div className="font-mono text-lg font-bold">
                {forceRerenderCount}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Sheet Open:
              </span>
              <div className="font-mono text-lg font-bold">
                {editingReservation ? "✅ Yes" : "❌ No"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Test Scenario:
              </span>
              <div className="font-mono text-lg font-bold capitalize">
                {testScenario.replace("-", " ")}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Reservation ID:
              </span>
              <div className="font-mono text-sm">
                {editingReservation?.id || "None"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">
            📋 Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Test Form Reset Prevention:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              <li>Open the sheet and make some changes to the form</li>
              <li>
                Click &quot;New Object Ref&quot; or &quot;Force Re-render&quot;
                multiple times
              </li>
              <li>
                ✅ <strong>Expected:</strong> Form data should NOT reset,
                changes preserved
              </li>
              <li>
                ❌ <strong>Bad:</strong> Form resets to original values
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">2. Test Re-render Performance:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              <li>Open the sheet and watch the render count</li>
              <li>
                Click &quot;Simulate Rapid Changes&quot; to test rapid object
                reference changes
              </li>
              <li>
                ✅ <strong>Expected:</strong> Minimal renders, no infinite loops
              </li>
              <li>
                ❌ <strong>Bad:</strong> Render count increases rapidly
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">3. Check Browser Console:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              <li>Open DevTools Console (F12)</li>
              <li>Look for render logs and performance warnings</li>
              <li>
                ✅ <strong>Expected:</strong> Clean logs, no excessive renders
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Wrapped EditBookingSheet for performance monitoring */}
      {editingReservation && (
        <PerformanceTestWrapper testName="EditBookingSheet">
          <EditBookingSheet
            editingReservation={editingReservation}
            setEditingReservation={setEditingReservation}
            availableRooms={[]}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </PerformanceTestWrapper>
      )}
    </div>
  );
};

export default TestPerformancePage;
