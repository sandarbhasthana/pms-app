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
import { useRatesData } from "@/lib/hooks/useRatesData";
import { format } from "date-fns";

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

  // Fetch rates data for the selected date to get actual room pricing
  const { data: ratesData, isLoading: ratesLoading } = useRatesData(
    selectedSlot ? new Date(selectedSlot.date) : new Date(),
    7, // Fetch 7 days of data
    "base" // Using base rate plan
  );

  // Create room type mapping (same as in CalendarViewRowStyle)
  const roomTypeMapping = useMemo(() => {
    return {
      Standard: "Standard Room",
      Deluxe: "Deluxe Room",
      Suite: "Executive Suite",
      Presidential: "Presidential Suite"
    };
  }, []);

  // Get actual room price for the selected slot
  const actualRoomPrice = useMemo(() => {
    if (!selectedSlot || !ratesData || ratesData.length === 0) {
      return 0; // No fallback prices - return 0 if no data available
    }

    // Find the room type from the room name
    const roomName = selectedSlot.roomName;
    let calendarRoomType = "Standard"; // Default

    // Extract room type from room name (e.g., "Standard Room 101" -> "Standard")
    if (roomName.toLowerCase().includes("presidential"))
      calendarRoomType = "Presidential";
    else if (roomName.toLowerCase().includes("suite"))
      calendarRoomType = "Suite";
    else if (roomName.toLowerCase().includes("deluxe"))
      calendarRoomType = "Deluxe";
    else if (roomName.toLowerCase().includes("standard"))
      calendarRoomType = "Standard";

    // Find the corresponding database room type name
    const dbRoomTypeName =
      roomTypeMapping[calendarRoomType as keyof typeof roomTypeMapping];

    // Find the rates data for this room type
    const roomTypeRates = ratesData.find(
      (rates) => rates.roomTypeName === dbRoomTypeName
    );

    if (roomTypeRates) {
      const dateStr = format(new Date(selectedSlot.date), "yyyy-MM-dd");
      const rateData = roomTypeRates.dates[dateStr];
      if (rateData) {
        return rateData.finalPrice;
      }
    }

    // No rates data found - return 0 instead of fallback prices
    return 0;
  }, [selectedSlot, ratesData, roomTypeMapping]);

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
      paymentMethod: "card"
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

  // Handle customer selection from search
  const handleCustomerSelect = useCallback(
    (customer: {
      guestName: string;
      email: string;
      phone: string;
      idNumber?: string;
      idType?: string;
      issuingCountry?: string;
    }) => {
      // Update form data with customer information
      updateFormData({
        fullName: customer.guestName,
        email: customer.email,
        phone: customer.phone,
        idNumber: customer.idNumber || "",
        idType: customer.idType || "passport",
        issuingCountry: customer.issuingCountry || ""
      });

      // Also update the legacy state props for backward compatibility
      setFullName(customer.guestName);
      setEmail(customer.email);
      setPhone(customer.phone);
      if (customer.idNumber) setIdNumber(customer.idNumber);
      if (customer.idType) setIdType(customer.idType);
      if (customer.issuingCountry) setIssuingCountry(customer.issuingCountry);
    },
    [
      updateFormData,
      setFullName,
      setEmail,
      setPhone,
      setIdNumber,
      setIdType,
      setIssuingCountry
    ]
  );

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
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#7210a2] dark:bg-[#8b4aff] hover:bg-purple-600 dark:hover:bg-[#a876ff] text-[#f0f8ff] font-medium transition-colors"
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
              onCustomerSelect={handleCustomerSelect}
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
                actualRoomPrice={actualRoomPrice}
                ratesLoading={ratesLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NewBookingSheet;
