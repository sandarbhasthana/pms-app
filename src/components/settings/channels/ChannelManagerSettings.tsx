"use client";

import { useState, useEffect, useCallback } from "react";
import { getCookie } from "cookies-next";
import { toast } from "sonner";
import { Loader2, Link2, Settings2, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannexConnectionStatus } from "./ChannexConnectionStatus";
import { PropertyMappingTab } from "./PropertyMappingTab";
import { SyncStatusTab } from "./SyncStatusTab";

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

export function ChannelManagerSettings() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ChannexConfig | null>(null);
  const [activeTab, setActiveTab] = useState("connection");

  const propertyId = getCookie("propertyId") as string;

  const fetchConfig = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/channex/config?propertyId=${propertyId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No Channex config yet - that's fine
          setConfig({
            isConnected: false,
            channexPropertyId: null,
            syncStatus: null,
            lastSyncAt: null,
            channelConnections: []
          });
          return;
        }
        throw new Error("Failed to fetch Channex config");
      }

      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Error fetching Channex config:", error);
      toast.error("Failed to load channel manager settings");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (!propertyId) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          Please select a property to configure channel manager settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Connection</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Room Mapping</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Sync Status</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-6">
          <ChannexConnectionStatus
            config={config}
            propertyId={propertyId}
            onConfigChange={fetchConfig}
          />
        </TabsContent>

        <TabsContent value="mapping" className="mt-6">
          <PropertyMappingTab
            propertyId={propertyId}
            isConnected={config?.isConnected ?? false}
            onMappingChange={fetchConfig}
          />
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <SyncStatusTab
            propertyId={propertyId}
            isConnected={config?.isConnected ?? false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
