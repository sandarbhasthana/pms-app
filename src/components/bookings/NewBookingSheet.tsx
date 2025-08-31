"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { BookingTabNavigation } from "./booking-tabs/BookingTabNavigation";
import { BookingDetailsTab } from "./booking-tabs/BookingDetailsTab";
import { BookingAddonsTab } from "./booking-tabs/BookingAddonsTab";
import { BookingPaymentTab } from "./booking-tabs/BookingPaymentTab";
import {
  NewBookingSheetProps,
  BookingFormData,
  BookingTab
} from "./booking-tabs/types";

const NewBookingSheet: React.FC<NewBookingSheetProps> = ({
  selectedSlot,
  setSelectedSlot,
  handleCreate,
  fullName,
  setFullName,
  phone,
  setPhone,
  email,
  setEmail,
  idType,
  setIdType,
  idNumber,
  setIdNumber,
  issuingCountry,
  setIssuingCountry,
  adults,
  setAdults,
  childrenCount,
  setChildrenCount,
  showScanner,
  setShowScanner,
  setOcrEnabled,
  handleScanComplete,
  handleScanError,
  setLastScannedSlot
}) => {
  const [activeTab, setActiveTab] = useState<BookingTab>("details");
  const [completedTabs, setCompletedTabs] = useState<Set<BookingTab>>(
    new Set()
  );

  // Reset tab state when a new slot is selected
  React.useEffect(() => {
    if (selectedSlot) {
      setActiveTab("details");
      setCompletedTabs(new Set());
    }
  }, [selectedSlot]);

  // Memoized date calculations
  const { checkInDate, checkOutDate } = useMemo(() => {
    if (!selectedSlot) return { checkInDate: "", checkOutDate: "" };

    const checkIn = new Date(selectedSlot.date);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);

    return {
      checkInDate: checkIn.toISOString().split("T")[0],
      checkOutDate: checkOut.toISOString().split("T")[0]
    };
  }, [selectedSlot]);

  // Initialize form data from props
  const [formData, setFormData] = useState<BookingFormData>({
    fullName,
    email,
    phone,
    idType,
    idNumber,
    issuingCountry,
    adults,
    childrenCount,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    addons: {
      extraBed: false,
      breakfast: false,
      customAddons: []
    },
    payment: {
      totalAmount: 0,
      suggestedDeposit: 0,
      selectedDeposit: 0,
      paymentMethod: "deposit"
    }
  });

  // Sync form data with props
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName,
      email,
      phone,
      idType,
      idNumber,
      issuingCountry,
      adults,
      childrenCount,
      checkIn: checkInDate,
      checkOut: checkOutDate
    }));
  }, [
    fullName,
    email,
    phone,
    idType,
    idNumber,
    issuingCountry,
    adults,
    childrenCount,
    checkInDate,
    checkOutDate
  ]);

  const updateFormData = useCallback(
    (updates: Partial<BookingFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));

      // Sync back to props for backward compatibility - using setTimeout to avoid setState during render
      setTimeout(() => {
        if (updates.fullName !== undefined) setFullName(updates.fullName);
        if (updates.email !== undefined) setEmail(updates.email);
        if (updates.phone !== undefined) setPhone(updates.phone);
        if (updates.idType !== undefined) setIdType(updates.idType);
        if (updates.idNumber !== undefined) setIdNumber(updates.idNumber);
        if (updates.issuingCountry !== undefined)
          setIssuingCountry(updates.issuingCountry);
        if (updates.adults !== undefined) setAdults(updates.adults);
        if (updates.childrenCount !== undefined)
          setChildrenCount(updates.childrenCount);
      }, 0);
    },
    [
      setFullName,
      setEmail,
      setPhone,
      setIdType,
      setIdNumber,
      setIssuingCountry,
      setAdults,
      setChildrenCount
    ]
  );

  const handleClose = useCallback(() => {
    setSelectedSlot(null);
    setActiveTab("details");
    setCompletedTabs(new Set());
  }, [setSelectedSlot]);

  const markTabCompleted = useCallback((tab: BookingTab) => {
    setCompletedTabs((prev) => new Set([...prev, tab]));
  }, []);

  const handleNext = useCallback(
    (currentTab: BookingTab) => {
      markTabCompleted(currentTab);

      if (currentTab === "details") {
        setActiveTab("addons");
      } else if (currentTab === "addons") {
        setActiveTab("payment");
      }
    },
    [markTabCompleted]
  );

  const handlePrevious = useCallback((currentTab: BookingTab) => {
    if (currentTab === "addons") {
      setActiveTab("details");
    } else if (currentTab === "payment") {
      setActiveTab("addons");
    }
  }, []);

  if (!selectedSlot) return null;

  return (
    <Sheet open={!!selectedSlot} onOpenChange={() => {}}>
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

          <SheetTitle className="text-3xl">New Reservation</SheetTitle>
          <SheetDescription className="text-md">
            Create a new booking for {selectedSlot.roomName} on {checkInDate}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 pb-8">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as BookingTab)}
          >
            <BookingTabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              completedTabs={completedTabs}
              formData={formData}
            />

            <TabsContent value="details" className="mt-0">
              <BookingDetailsTab
                formData={formData}
                updateFormData={updateFormData}
                selectedSlot={selectedSlot}
                onNext={() => handleNext("details")}
                // Pass through existing props for compatibility
                showScanner={showScanner}
                setShowScanner={setShowScanner}
                setOcrEnabled={setOcrEnabled}
                handleScanComplete={handleScanComplete}
                handleScanError={handleScanError}
                setLastScannedSlot={setLastScannedSlot}
              />
            </TabsContent>

            <TabsContent value="addons" className="mt-0">
              <BookingAddonsTab
                formData={formData}
                updateFormData={updateFormData}
                selectedSlot={selectedSlot}
                onNext={() => handleNext("addons")}
                onPrevious={() => handlePrevious("addons")}
              />
            </TabsContent>

            <TabsContent value="payment" className="mt-0">
              <BookingPaymentTab
                formData={formData}
                updateFormData={updateFormData}
                selectedSlot={selectedSlot}
                onPrevious={() => handlePrevious("payment")}
                handleCreate={handleCreate}
                checkInDate={checkInDate}
                checkOutDate={checkOutDate}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NewBookingSheet;
