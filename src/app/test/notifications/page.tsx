// File: src/app/test/notifications/page.tsx

"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Send, Activity, Wifi, WifiOff } from "lucide-react";
import {
  NotificationStream,
  NotificationBell
} from "@/components/notifications/NotificationStream";
import { useNotificationStream } from "@/lib/hooks/useNotificationStream";
import { toast } from "sonner";

interface StreamStats {
  totalConnections: number;
  activeUsers: number;
  connectionsByOrg: Record<string, number>;
}

export default function NotificationTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  // Stable callback functions to prevent infinite loops
  const handleNotification = useCallback(
    (notification: { subject?: string }) => {
      console.log("Received notification:", notification);
      setLastTestResult(`Received: ${notification.subject}`);
    },
    []
  );

  const handleConnect = useCallback(() => {
    toast.success("Connected to notification stream!");
  }, []);

  const handleDisconnect = useCallback(() => {
    toast.error("Disconnected from notification stream");
  }, []);

  // Use the notification stream hook
  const {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    connectionCount,
    reconnect
  } = useNotificationStream({
    organizationId: "test-org",
    propertyId: "test-property",
    onNotification: handleNotification,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect
  });

  // Test real-time notification
  const testRealtimeNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/notifications/test?action=test-realtime",
        {
          method: "GET"
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Test notification sent!");
        setLastTestResult("Test notification sent successfully");
      } else {
        toast.error(`Failed: ${result.error}`);
        setLastTestResult(`Error: ${result.error}`);
      }
    } catch (error) {
      toast.error("Failed to send test notification");
      setLastTestResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get stream statistics
  const getStreamStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/notifications/test?action=stream-stats",
        {
          method: "GET"
        }
      );

      const result = await response.json();

      if (response.ok) {
        setStats(result.stats);
        toast.success("Stream stats retrieved!");
      } else {
        toast.error(`Failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Failed to get stream stats:\n${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test email notification
  const testEmailNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/notifications/test?action=test-email",
        {
          method: "GET"
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Test SendGrid email sent!");
        setLastTestResult(`SendGrid Email: ${result.message}`);
      } else {
        toast.error(`SendGrid Error: ${result.error}`);
        setLastTestResult(`SendGrid Error: ${result.error}`);
      }
    } catch (error) {
      toast.error("Failed to send email notification");
      setLastTestResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Setup notification system
  const setupNotificationSystem = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications/test?action=setup", {
        method: "GET"
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Notification system setup complete!");
        setLastTestResult("Setup completed successfully");
      } else {
        toast.error(`Setup failed: ${result.error}`);
        setLastTestResult(`Setup error: ${result.error}`);
      }
    } catch (error) {
      toast.error("Setup failed");
      setLastTestResult(
        `Setup error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notification System Test</h1>
            <p className="text-muted-foreground">
              Test real-time notifications, email delivery, and stream
              connections
            </p>
          </div>
        </div>
        <NotificationBell
          organizationId="test-org"
          propertyId="test-property"
        />
      </div>

      <Separator />

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Connection Status
          </CardTitle>
          <CardDescription>
            Real-time notification stream connection status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected
                ? "Connected"
                : isConnecting
                ? "Connecting..."
                : "Disconnected"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Connection #{connectionCount}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error: {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={reconnect}
                className="mt-2"
              >
                Reconnect
              </Button>
            </div>
          )}

          {lastMessage && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm font-medium">Last Message:</p>
              <p className="text-sm text-muted-foreground">
                {lastMessage.subject || lastMessage.type} -{" "}
                {new Date(lastMessage.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}

          <NotificationStream
            organizationId="test-org"
            propertyId="test-property"
            showConnectionStatus={true}
            enableToasts={true}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Actions
          </CardTitle>
          <CardDescription>
            Send test notifications and check system status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={setupNotificationSystem}
              disabled={isLoading}
              variant="outline"
            >
              Setup System
            </Button>

            <Button
              onClick={testRealtimeNotification}
              disabled={isLoading || !isConnected}
            >
              Send Test Notification
            </Button>

            <Button
              onClick={testEmailNotification}
              disabled={isLoading}
              variant="outline"
            >
              Send SendGrid Email
            </Button>

            <Button
              onClick={getStreamStats}
              disabled={isLoading}
              variant="outline"
            >
              Get Stream Stats
            </Button>
          </div>

          {lastTestResult && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-600 dark:text-green-400">
                {lastTestResult}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Stream Statistics
            </CardTitle>
            <CardDescription>Current SSE connection statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.totalConnections}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Connections
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <div className="text-sm text-muted-foreground">
                  Active Users
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Object.keys(stats.connectionsByOrg).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Organizations
                </div>
              </div>
            </div>

            {Object.keys(stats.connectionsByOrg).length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="font-medium mb-2">
                    Connections by Organization:
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(stats.connectionsByOrg).map(
                      ([orgId, count]) => (
                        <div
                          key={orgId}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm">{orgId}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              First, click &quot;Setup System&quot; to initialize notification
              rules
            </li>
            <li>Ensure the connection status shows &quot;Connected&quot;</li>
            <li>
              Click &quot;Send Test Notification&quot; to send a real-time
              notification
            </li>
            <li>You should see a toast notification appear immediately</li>
            <li>
              Check &quot;Stream Stats&quot; to see connection information
            </li>
            <li>Open multiple browser tabs to test multiple connections</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
