"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ViewTabNavigation from "./view-tabs/ViewTabNavigation";
import { ViewDetailsTab } from "./view-tabs/ViewDetailsTab";
import { ViewAddonsTab } from "./view-tabs/ViewAddonsTab";
import { ViewPaymentTab } from "./view-tabs/ViewPaymentTab";
import { ViewBookingSheetProps, ViewBookingTab } from "./view-tabs/types";

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

          <SheetTitle className="text-3xl">
            {viewReservation.guestName}
          </SheetTitle>
          <div className="text-md text-muted-foreground">
            <div className="space-y-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Reservation ID: {viewReservation.id}
              </div>
              <div>
                View booking information for {viewReservation.guestName} •{" "}
                {formatDateRange()} • {calculateNights()} night
                {calculateNights() > 1 ? "s" : ""}
              </div>
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
