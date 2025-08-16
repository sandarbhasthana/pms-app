"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import EditTabNavigation from "./edit-tabs/EditTabNavigation";
import { EditDetailsTab } from "./edit-tabs/EditDetailsTab";
import { EditAddonsTab } from "./edit-tabs/EditAddonsTab";
import { EditPaymentTab } from "./edit-tabs/EditPaymentTab";
import {
  EditBookingSheetProps,
  EditBookingTab,
  EditBookingFormData
} from "./edit-tabs/types";

const EditBookingSheet: React.FC<EditBookingSheetProps> = ({
  editingReservation,
  setEditingReservation,
  availableRooms,
  onUpdate,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<EditBookingTab>("details");
  const [formData, setFormData] = useState<EditBookingFormData>({
    guestName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
    issuingCountry: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    notes: "",
    addons: {
      extraBed: false,
      extraBedQuantity: 1,
      breakfast: false,
      breakfastQuantity: 1,
      customAddons: []
    },
    payment: {
      totalAmount: 0,
      paidAmount: 0,
      paymentMethod: "cash",
      paymentStatus: "UNPAID"
    }
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize form data when reservation changes
  useEffect(() => {
    if (editingReservation) {
      setFormData({
        guestName: editingReservation.guestName || "",
        email: editingReservation.email || "",
        phone: editingReservation.phone || "",
        idType: editingReservation.idType || "passport",
        idNumber: editingReservation.idNumber || "",
        issuingCountry: editingReservation.issuingCountry || "",
        roomId: editingReservation.roomId || "",
        checkIn: editingReservation.checkIn || "",
        checkOut: editingReservation.checkOut || "",
        adults: editingReservation.adults || 1,
        children: editingReservation.children || 0,
        notes: editingReservation.notes || "",
        addons: {
          extraBed: false, // Will be populated from backend when available
          extraBedQuantity: 1,
          breakfast: false,
          breakfastQuantity: 1,
          customAddons: (editingReservation.addons || []).map((addon) => ({
            id: addon.id,
            name: addon.name,
            description: addon.description,
            price: addon.price,
            quantity: addon.quantity,
            perNight: addon.nights ? addon.nights > 1 : false // Convert nights to perNight boolean
          }))
        },
        payment: {
          totalAmount: editingReservation.totalAmount || 0,
          paidAmount: editingReservation.paidAmount || 0,
          paymentMethod: "cash", // Default method
          paymentStatus: editingReservation.paymentStatus || "UNPAID"
        }
      });
      setActiveTab("details");
      setHasUnsavedChanges(false);
    }
  }, [editingReservation]);

  // Track changes to form data
  useEffect(() => {
    if (editingReservation) {
      const hasChanges =
        formData.guestName !== (editingReservation.guestName || "") ||
        formData.email !== (editingReservation.email || "") ||
        formData.phone !== (editingReservation.phone || "") ||
        formData.roomId !== (editingReservation.roomId || "") ||
        formData.checkIn !== (editingReservation.checkIn || "") ||
        formData.checkOut !== (editingReservation.checkOut || "") ||
        formData.adults !== (editingReservation.adults || 1) ||
        formData.children !== (editingReservation.children || 0) ||
        formData.notes !== (editingReservation.notes || "");

      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, editingReservation]);

  const updateFormData = useCallback(
    (updates: Partial<EditBookingFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmClose) return;
    }
    setEditingReservation(null);
  };

  const handleSave = async () => {
    if (!editingReservation) return;

    try {
      await onUpdate(editingReservation.id, formData);
      setHasUnsavedChanges(false);
      setEditingReservation(null);
    } catch (error) {
      console.error("Failed to update reservation:", error);
      // Handle error (show toast, etc.)
    }
  };

  const handleDelete = async () => {
    if (!editingReservation) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this booking? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await onDelete(editingReservation.id);
      setEditingReservation(null);
    } catch (error) {
      console.error("Failed to delete reservation:", error);
      // Handle error (show toast, etc.)
    }
  };

  const handleNext = () => {
    if (activeTab === "details") setActiveTab("addons");
    else if (activeTab === "addons") setActiveTab("payment");
  };

  const handlePrevious = () => {
    if (activeTab === "payment") setActiveTab("addons");
    else if (activeTab === "addons") setActiveTab("details");
  };

  const calculateNights = () => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    return Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  };

  const formatDateRange = () => {
    if (!formData.checkIn || !formData.checkOut) return "";
    const checkIn = new Date(formData.checkIn).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    const checkOut = new Date(formData.checkOut).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return `${checkIn} - ${checkOut}`;
  };

  if (!editingReservation) {
    return null;
  }

  return (
    <Sheet open={!!editingReservation} onOpenChange={() => {}}>
      <SheetClose asChild>
        <div />
      </SheetClose>
      <SheetContent className="fixed top-16 text-lg bottom-0 left-0 right-0 w-full h-[calc(100vh-4rem)] overflow-y-auto dark:bg-gray-900 dark:text-gray-200 bg-gray-100 text-gray-900 [&_label]:text-base [&_input]:text-base [&_textarea]:text-base [&_[data-slot=select-trigger]]:text-base [&_[data-slot=select-item]]:text-base z-[9999]">
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

          <SheetTitle className="text-3xl">Edit Reservation</SheetTitle>
          <SheetDescription className="text-md">
            Modify booking details for{" "}
            {formData.guestName || editingReservation.guestName} •{" "}
            {formatDateRange()} • {calculateNights()} night
            {calculateNights() > 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 pb-8">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as EditBookingTab)}
          >
            <EditTabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              reservationData={editingReservation}
              formData={formData}
              hasUnsavedChanges={hasUnsavedChanges}
            />

            <TabsContent value="details" className="mt-0">
              <EditDetailsTab
                reservationData={editingReservation}
                formData={formData}
                updateFormData={updateFormData}
                availableRooms={availableRooms}
                onNext={handleNext}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="addons" className="mt-0">
              <EditAddonsTab
                reservationData={editingReservation}
                formData={formData}
                updateFormData={updateFormData}
                availableRooms={availableRooms}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="payment" className="mt-0">
              <EditPaymentTab
                reservationData={editingReservation}
                formData={formData}
                updateFormData={updateFormData}
                availableRooms={availableRooms}
                onPrevious={handlePrevious}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditBookingSheet;
