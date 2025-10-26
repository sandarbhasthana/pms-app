"use client";

import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeftIcon,
  XMarkIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";
import ViewTabNavigation from "./view-tabs/ViewTabNavigation";
import { shortenId } from "@/lib/utils/cuid-formatter";
import { toast } from "sonner";
import { ViewDetailsTab } from "./view-tabs/ViewDetailsTab";
import { ViewAddonsTab } from "./view-tabs/ViewAddonsTab";
import { ViewPaymentTab } from "./view-tabs/ViewPaymentTab";
import { ViewBookingSheetProps, ViewBookingTab } from "./view-tabs/types";
import StatusBadge from "@/components/reservation-status/StatusBadge";
import { ReservationStatus } from "@prisma/client";

const ViewBookingSheet: React.FC<ViewBookingSheetProps> = ({
  viewReservation,
  setViewReservation
}) => {
  const [activeTab, setActiveTab] = useState<ViewBookingTab>("details");

  // Reset tab state when a new reservation is selected
  React.useEffect(() => {
    if (viewReservation) {
      setActiveTab("details");
    }
  }, [viewReservation]);

  const handleClose = () => {
    setViewReservation(null);
  };

  const calculateNights = () => {
    if (!viewReservation) return 0;
    const checkIn = new Date(viewReservation.checkIn);
    const checkOut = new Date(viewReservation.checkOut);
    return Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  };

  const formatDateRange = () => {
    if (!viewReservation) return "";
    const checkIn = new Date(viewReservation.checkIn).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric"
      }
    );
    const checkOut = new Date(viewReservation.checkOut).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
    return `${checkIn} - ${checkOut}`;
  };

  // Calculate payment status based on paymentStatus field
  const calculatedPaymentStatus = useMemo(() => {
    if (!viewReservation) return "UNPAID";
    return viewReservation.paymentStatus || "UNPAID";
  }, [viewReservation]);

  // Calculate total amount
  const calculateTotal = () => {
    const nights = calculateNights();
    const basePrice = 2500 * nights; // Placeholder - will be dynamic
    const addonsTotal =
      viewReservation?.addons?.reduce(
        (sum, addon) => sum + addon.totalAmount,
        0
      ) || 0;
    return basePrice + addonsTotal;
  };

  if (!viewReservation) return null;

  return (
    <Sheet open={!!viewReservation} onOpenChange={() => {}}>
      <SheetClose asChild>
        <div />
      </SheetClose>
      <SheetContent className="fixed top-16 text-lg bottom-0 left-0 right-0 w-full h-[calc(100vh-4rem)] overflow-y-auto !bg-gray-100 dark:!bg-[#121212] !text-gray-900 dark:!text-[#f0f8ff] [&_label]:text-base [&_input]:text-base [&_textarea]:text-base [&_[data-slot=select-trigger]]:text-base [&_[data-slot=select-item]]:text-base z-[9999]">
        <SheetHeader className="relative">
          {/* Close button in top right corner */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-0 right-0 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Back button */}
          <button
            type="button"
            onClick={handleClose}
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-medium transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>

          {/* Guest Information - Aligned with form content */}
          <div className="pl-4 flex justify-between items-start">
            <div>
              <SheetTitle className="text-3xl flex items-center gap-3">
                {viewReservation.guestName}
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={viewReservation.status as ReservationStatus}
                    size="sm"
                  />
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      calculatedPaymentStatus === "PAID"
                        ? "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200"
                        : calculatedPaymentStatus === "PARTIALLY_PAID"
                        ? "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {calculatedPaymentStatus || "UNPAID"}
                  </span>
                </div>
              </SheetTitle>
              <div className="text-md space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="text-lg text-gray-600 dark:text-gray-400 font-bold font-mono uppercase">
                    {shortenId(viewReservation.id, 8)}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(viewReservation.id);
                        toast.success("Reservation ID copied to clipboard");
                      } catch {
                        toast.error("Failed to copy ID");
                      }
                    }}
                    title="Copy complete reservation ID"
                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center justify-center"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground font-bold">
                  {formatDateRange()} | {calculateNights()} Night(s)
                  {calculateNights() > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Total Amount on Right Side */}
            <div className="text-right pr-4">
              <span>Total Amount</span>
              <p
                className={`text-3xl font-bold font-mono ${
                  calculatedPaymentStatus === "PAID"
                    ? "text-green-600 dark:text-green-400"
                    : calculatedPaymentStatus === "PARTIALLY_PAID"
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                ₹{calculateTotal().toLocaleString()}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4 pb-8">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ViewBookingTab)}
          >
            <ViewTabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              reservationData={viewReservation}
            />

            <TabsContent value="details" className="mt-0">
              <ViewDetailsTab reservationData={viewReservation} />
            </TabsContent>

            <TabsContent value="addons" className="mt-0">
              <ViewAddonsTab reservationData={viewReservation} />
            </TabsContent>

            <TabsContent value="payment" className="mt-0">
              <ViewPaymentTab reservationData={viewReservation} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ViewBookingSheet;
