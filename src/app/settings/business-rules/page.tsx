"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { getCookie } from "cookies-next";

interface BusinessRulesSettings {
  businessRulesEnabled: boolean;
}

export default function BusinessRulesSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BusinessRulesSettings>({
    businessRulesEnabled: false
  });

  const propertyId = getCookie("propertyId") as string;

  // Memoize fetchSettings to prevent unnecessary re-renders
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/properties/${propertyId}?includeSettings=true`
      );

      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      setSettings({
        businessRulesEnabled: data.businessRulesEnabled || false
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load business rules settings");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!session?.user?.id) {
      router.push("/signin");
      return;
    }

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, propertyId, fetchSettings]);

  const handleToggle = async (enabled: boolean) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessRulesEnabled: enabled })
      });

      if (!response.ok) throw new Error("Failed to update settings");

      setSettings({ businessRulesEnabled: enabled });
      toast.success(
        enabled ? "Business rules enabled" : "Business rules disabled"
      );
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update business rules settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Business Rules</h1>
        <p className="text-muted-foreground mt-2">
          Configure dynamic pricing rules for your property
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg font-semibold">
              Enable Business Rules
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Apply dynamic pricing rules to your rates
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(!settings.businessRulesEnabled)}
            disabled={saving}
            title={
              settings.businessRulesEnabled
                ? "Disable business rules"
                : "Enable business rules"
            }
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              settings.businessRulesEnabled
                ? "bg-purple-600"
                : "bg-gray-300 dark:bg-gray-600"
            } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                settings.businessRulesEnabled
                  ? "translate-x-7"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info Box */}
      {settings.businessRulesEnabled && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Business Rules Active
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Dynamic pricing rules are now applied to your rates. Manage rules
              in the Rules Management section below.
            </p>
          </div>
        </div>
      )}

      {/* Rules Management Section */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rules Management</h2>
          <Button
            onClick={() => router.push("/settings/business-rules/manage")}
            disabled={!settings.businessRulesEnabled}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Manage Rules
          </Button>
        </div>

        {!settings.businessRulesEnabled ? (
          <p className="text-muted-foreground">
            Enable business rules above to manage pricing rules
          </p>
        ) : (
          <p className="text-muted-foreground">
            Click &quot;Manage Rules&quot; to create and configure your pricing
            rules
          </p>
        )}
      </div>

      {/* TODO: Future Features */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
          📋 Upcoming Features
        </h3>
        <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
          <li>✓ Weekend Pricing Rules</li>
          <li>✓ Occupancy-Based Pricing</li>
          <li>✓ Seasonal Pricing</li>
          <li>⏳ Early Bird Discounts</li>
          <li>⏳ Last-Minute Deals</li>
          <li>⏳ Extended Stay Discounts</li>
          <li>⏳ Corporate Rate Discounts</li>
          <li>⏳ AI-Powered Price Optimization</li>
        </ul>
      </div>
    </div>
  );
}
