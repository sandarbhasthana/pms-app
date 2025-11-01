"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info } from "lucide-react";
import { useSession } from "next-auth/react";
import { TimePicker } from "@/components/ui/time-picker";

type FeesAndChargesFormValues = {
  checkInTime: string;
  checkOutTime: string;
  noShowGraceHours: number;
  noShowLookbackDays: number;
  lateCheckoutGraceHours: number;
  lateCheckoutLookbackDays: number;
  lateCheckoutFee: number;
  lateCheckoutFeeType:
    | "FLAT_RATE"
    | "HOURLY"
    | "PERCENTAGE_OF_ROOM_RATE"
    | "PERCENTAGE_OF_TOTAL_BILL";
  confirmationPendingTimeoutHours: number;
  auditLogRetentionDays: number;
};

interface FeesAndChargesTabProps {
  propertyId?: string;
  isPropertyMode?: boolean;
}

export default function FeesAndChargesTab({
  propertyId,
  isPropertyMode = false
}: FeesAndChargesTabProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Get property ID from session or cookie
  const getSelectedPropertyId = () => {
    if (typeof window === "undefined") return null;

    // First try session
    if (session?.user?.currentPropertyId) {
      return session.user.currentPropertyId;
    }

    // Fallback to cookie
    const propertyIdCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("propertyId="));

    return propertyIdCookie ? propertyIdCookie.split("=")[1] : null;
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FeesAndChargesFormValues>({
    defaultValues: {
      checkInTime: "15:00",
      checkOutTime: "11:00",
      noShowGraceHours: 6,
      noShowLookbackDays: 3,
      lateCheckoutGraceHours: 1,
      lateCheckoutLookbackDays: 2,
      lateCheckoutFee: 0,
      lateCheckoutFeeType: "FLAT_RATE",
      confirmationPendingTimeoutHours: 6,
      auditLogRetentionDays: 90
    }
  });

  const lateCheckoutFeeType = watch("lateCheckoutFeeType");

  // Determine which ID to use for fetching settings
  const effectivePropertyId = isPropertyMode
    ? propertyId
    : getSelectedPropertyId();

  // Fetch existing settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!effectivePropertyId) {
        setIsFetching(false);
        return;
      }

      try {
        setIsFetching(true);
        const response = await fetch(
          `/api/settings/general?propertyId=${effectivePropertyId}`
        );

        if (response.ok) {
          const data = await response.json();

          // Populate form with existing values
          if (data.checkInTime) setValue("checkInTime", data.checkInTime);
          if (data.checkOutTime) setValue("checkOutTime", data.checkOutTime);
          if (data.noShowGraceHours !== undefined)
            setValue("noShowGraceHours", data.noShowGraceHours);
          if (data.noShowLookbackDays !== undefined)
            setValue("noShowLookbackDays", data.noShowLookbackDays);
          if (data.lateCheckoutGraceHours !== undefined)
            setValue("lateCheckoutGraceHours", data.lateCheckoutGraceHours);
          if (data.lateCheckoutLookbackDays !== undefined)
            setValue("lateCheckoutLookbackDays", data.lateCheckoutLookbackDays);
          if (data.lateCheckoutFee !== undefined)
            setValue("lateCheckoutFee", Number(data.lateCheckoutFee));
          if (data.lateCheckoutFeeType)
            setValue("lateCheckoutFeeType", data.lateCheckoutFeeType);
          if (data.confirmationPendingTimeoutHours !== undefined)
            setValue(
              "confirmationPendingTimeoutHours",
              data.confirmationPendingTimeoutHours
            );
          if (data.auditLogRetentionDays !== undefined)
            setValue("auditLogRetentionDays", data.auditLogRetentionDays);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [effectivePropertyId, setValue]);

  const onSubmit = async (data: FeesAndChargesFormValues) => {
    if (!effectivePropertyId) {
      toast({
        title: "Error",
        description: "No property selected",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Ensure all numeric fields are numbers, not strings
      const payload = {
        propertyId: effectivePropertyId,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        noShowGraceHours: Number(data.noShowGraceHours),
        noShowLookbackDays: Number(data.noShowLookbackDays),
        lateCheckoutGraceHours: Number(data.lateCheckoutGraceHours),
        lateCheckoutLookbackDays: Number(data.lateCheckoutLookbackDays),
        lateCheckoutFee: Number(data.lateCheckoutFee),
        lateCheckoutFeeType: data.lateCheckoutFeeType,
        confirmationPendingTimeoutHours: Number(
          data.confirmationPendingTimeoutHours
        ),
        auditLogRetentionDays: Number(data.auditLogRetentionDays)
      };

      console.log("Submitting payload:", payload);

      const response = await fetch("/api/settings/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.error?.message || "Failed to save settings");
      }

      toast({
        title: "Success",
        description: "Automation settings saved successfully"
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
      {/* Check-in/Check-out Times */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Check-in & Check-out Times</h2>
        <p className="text-sm text-muted-foreground">
          Configure the standard check-in and check-out times for your property.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label
              htmlFor="checkInTime"
              className="text-sm font-medium mb-2 block"
            >
              Check-in Time
            </Label>
            <TimePicker
              id="checkInTime"
              value={watch("checkInTime")}
              onChange={(value) => setValue("checkInTime", value)}
              error={errors.checkInTime?.message}
            />
          </div>

          <div>
            <Label
              htmlFor="checkOutTime"
              className="text-sm font-medium mb-2 block"
            >
              Check-out Time
            </Label>
            <TimePicker
              id="checkOutTime"
              value={watch("checkOutTime")}
              onChange={(value) => setValue("checkOutTime", value)}
              error={errors.checkOutTime?.message}
            />
          </div>
        </div>
      </section>

      {/* No-Show Detection Settings */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">No-Show Detection</h2>
        <p className="text-sm text-muted-foreground">
          Configure how the system detects and handles no-show reservations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="noShowGraceHours">Grace Period (Hours)</Label>
            <input
              id="noShowGraceHours"
              type="number"
              min="0"
              step="1"
              {...register("noShowGraceHours", {
                required: "Grace period is required",
                min: { value: 0, message: "Must be 0 or greater" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hours after check-in time before marking as no-show
            </p>
            {errors.noShowGraceHours && (
              <p className="text-sm text-red-500 mt-1">
                {errors.noShowGraceHours.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="noShowLookbackDays">Lookback Period (Days)</Label>
            <input
              id="noShowLookbackDays"
              type="number"
              min="1"
              step="1"
              {...register("noShowLookbackDays", {
                required: "Lookback period is required",
                min: { value: 1, message: "Must be at least 1 day" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many days back to check for missed check-ins
            </p>
            {errors.noShowLookbackDays && (
              <p className="text-sm text-red-500 mt-1">
                {errors.noShowLookbackDays.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Late Checkout Settings */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Late Checkout Detection & Fees
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure late checkout detection and automatic fee calculation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="lateCheckoutGraceHours">Grace Period (Hours)</Label>
            <input
              id="lateCheckoutGraceHours"
              type="number"
              min="0"
              step="0.5"
              {...register("lateCheckoutGraceHours", {
                required: "Grace period is required",
                min: { value: 0, message: "Must be 0 or greater" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hours after checkout time before applying late fee
            </p>
            {errors.lateCheckoutGraceHours && (
              <p className="text-sm text-red-500 mt-1">
                {errors.lateCheckoutGraceHours.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="lateCheckoutLookbackDays">
              Lookback Period (Days)
            </Label>
            <input
              id="lateCheckoutLookbackDays"
              type="number"
              min="1"
              step="1"
              {...register("lateCheckoutLookbackDays", {
                required: "Lookback period is required",
                min: { value: 1, message: "Must be at least 1 day" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many days back to check for late checkouts
            </p>
            {errors.lateCheckoutLookbackDays && (
              <p className="text-sm text-red-500 mt-1">
                {errors.lateCheckoutLookbackDays.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="lateCheckoutFeeType">Fee Type</Label>
            <select
              id="lateCheckoutFeeType"
              {...register("lateCheckoutFeeType", {
                required: "Fee type is required"
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            >
              <option value="FLAT_RATE">Flat Rate</option>
              <option value="HOURLY">Hourly</option>
              <option value="PERCENTAGE_OF_ROOM_RATE">
                % of Room Rate (Coming Soon)
              </option>
              <option value="PERCENTAGE_OF_TOTAL_BILL">
                % of Total Bill (Coming Soon)
              </option>
            </select>
            {errors.lateCheckoutFeeType && (
              <p className="text-sm text-red-500 mt-1">
                {errors.lateCheckoutFeeType.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="lateCheckoutFee">
              {lateCheckoutFeeType === "FLAT_RATE" && "Fee Amount ($)"}
              {lateCheckoutFeeType === "HOURLY" && "Fee Per Hour ($)"}
              {lateCheckoutFeeType === "PERCENTAGE_OF_ROOM_RATE" &&
                "Percentage (%)"}
              {lateCheckoutFeeType === "PERCENTAGE_OF_TOTAL_BILL" &&
                "Percentage (%)"}
            </Label>
            <input
              id="lateCheckoutFee"
              type="number"
              min="0"
              step="0.01"
              {...register("lateCheckoutFee", {
                required: "Fee amount is required",
                min: { value: 0, message: "Must be 0 or greater" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            {(lateCheckoutFeeType === "PERCENTAGE_OF_ROOM_RATE" ||
              lateCheckoutFeeType === "PERCENTAGE_OF_TOTAL_BILL") && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Percentage-based fees are not yet fully implemented. The
                  system will use flat rate as fallback.
                </p>
              </div>
            )}
            {errors.lateCheckoutFee && (
              <p className="text-sm text-red-500 mt-1">
                {errors.lateCheckoutFee.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Other Automation Settings */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Other Automation Settings</h2>
        <p className="text-sm text-muted-foreground">
          Additional automation and cleanup settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="confirmationPendingTimeoutHours">
              Confirmation Timeout (Hours)
            </Label>
            <input
              id="confirmationPendingTimeoutHours"
              type="number"
              min="1"
              step="1"
              {...register("confirmationPendingTimeoutHours", {
                required: "Timeout is required",
                min: { value: 1, message: "Must be at least 1 hour" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-cancel pending confirmations after this many hours
            </p>
            {errors.confirmationPendingTimeoutHours && (
              <p className="text-sm text-red-500 mt-1">
                {errors.confirmationPendingTimeoutHours.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="auditLogRetentionDays">
              Audit Log Retention (Days)
            </Label>
            <input
              id="auditLogRetentionDays"
              type="number"
              min="30"
              step="1"
              {...register("auditLogRetentionDays", {
                required: "Retention period is required",
                min: { value: 30, message: "Must be at least 30 days" }
              })}
              className="flex h-9 w-full rounded-md border border-gray-500 dark:border-gray-400 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-purple-400/20 focus-visible:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Archive audit logs older than this many days
            </p>
            {errors.auditLogRetentionDays && (
              <p className="text-sm text-red-500 mt-1">
                {errors.auditLogRetentionDays.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-purple-primary hover:bg-purple-primary/90 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
