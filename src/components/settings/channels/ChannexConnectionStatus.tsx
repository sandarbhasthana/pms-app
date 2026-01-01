"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Unlink,
  ExternalLink
} from "lucide-react";

interface ChannexConfig {
  isConnected: boolean;
  channexPropertyId: string | null;
  syncStatus: string | null;
  lastSyncAt: string | null;
  channelConnections: Array<{
    id: string;
    channelCode: string;
    channelName: string;
    status: string;
  }>;
}

interface Props {
  config: ChannexConfig | null;
  propertyId: string;
  onConfigChange: () => void;
}

export function ChannexConnectionStatus({
  config,
  propertyId,
  onConfigChange
}: Props) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [channexPropertyId, setChannexPropertyId] = useState("");

  const handleConnect = async () => {
    if (!channexPropertyId.trim()) {
      toast.error("Please enter your Channex Property ID");
      return;
    }

    try {
      setConnecting(true);
      const response = await fetch("/api/channex/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          channexPropertyId: channexPropertyId.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Failed to connect");
      }

      toast.success("Successfully connected to Channex!");
      setChannexPropertyId("");
      onConfigChange();
    } catch (error) {
      console.error("Connection error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to connect to Channex"
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from Channex?")) {
      return;
    }

    try {
      setDisconnecting(true);
      const response = await fetch("/api/channex/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId })
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      toast.success("Disconnected from Channex");
      onConfigChange();
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect from Channex");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = config?.isConnected ?? false;

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            Connection Status
          </CardTitle>
          <CardDescription>
            {isConnected
              ? "Your property is connected to Channex channel manager"
              : "Connect your property to Channex to sync with OTAs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Connected to Channex
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Property ID: {config?.channexPropertyId}
                    </p>
                    {config?.lastSyncAt && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Last sync:{" "}
                        {new Date(config.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Unlink className="w-4 h-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Connected Channels */}
              {config?.channelConnections &&
                config.channelConnections.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Connected Channels</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {config.channelConnections.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{channel.channelName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channexPropertyId">Channex Property ID</Label>
                <Input
                  id="channexPropertyId"
                  placeholder="Enter your Channex Property ID"
                  value={channexPropertyId}
                  onChange={(e) => setChannexPropertyId(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Find this in your Channex dashboard under Property Settings
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Connect to Channex
                </Button>

                <a
                  href="https://app.channex.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:underline flex items-center gap-1"
                >
                  Open Channex Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What is Channex Card */}
      <Card>
        <CardHeader>
          <CardTitle>What is Channex?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Channex is a channel manager that connects your property to major
            OTAs (Online Travel Agencies) like Booking.com, Expedia, Airbnb, and
            more.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Automatic availability sync across all channels</li>
            <li>Receive bookings directly in your calendar</li>
            <li>Update rates from one central location</li>
            <li>Prevent overbookings with real-time inventory updates</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
