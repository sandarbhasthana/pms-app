"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface Props {
  propertyId: string;
  isConnected: boolean;
}

export function SyncStatusTab({ propertyId, isConnected }: Props) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/channex/sync-logs?propertyId=${propertyId}&limit=10`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setLogs([]);
          return;
        }
        throw new Error("Failed to fetch sync logs");
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (isConnected) {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [isConnected, fetchLogs]);

  const handleManualSync = async (syncType: "full" | "ari") => {
    try {
      setSyncing(true);
      const response = await fetch("/api/channex/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, syncType })
      });

      if (!response.ok) {
        throw new Error("Failed to trigger sync");
      }

      toast.success(
        syncType === "full"
          ? "Full sync started"
          : "Availability & rates sync started"
      );
      // Refresh logs after a delay
      setTimeout(fetchLogs, 2000);
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to start sync");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <p>Connect to Channex first to view sync status.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Manual Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Sync</CardTitle>
          <CardDescription>
            Trigger a manual sync to update availability and rates on all
            connected channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => handleManualSync("ari")}
              disabled={syncing}
              variant="outline"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Availability & Rates
            </Button>
            <Button onClick={() => handleManualSync("full")} disabled={syncing}>
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Full Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>
            Recent sync operations and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sync history yet. Run a manual sync to see results here.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {log.syncType.replace("_", " ")}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(log.startedAt).toLocaleString()}
                      {log.completedAt && (
                        <span>
                          {" "}
                          · Duration:{" "}
                          {Math.round(
                            (new Date(log.completedAt).getTime() -
                              new Date(log.startedAt).getTime()) /
                              1000
                          )}
                          s
                        </span>
                      )}
                    </p>
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
