"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeftIcon,
  XMarkIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import EditTabNavigation from "./edit-tabs/EditTabNavigation";
import { toast } from "sonner";
import { ReservationStatus } from "@prisma/client";
import {
  getStatusConfig,
  validateStatusTransition,
  getAllowedNextStatuses
} from "@/lib/reservation-status/utils";
import StatusBadge from "@/components/reservation-status/StatusBadge";
import { useRenderLogger } from "@/lib/debug/render-logger";

import { EditDetailsTab } from "./edit-tabs/EditDetailsTab";
import { EditAddonsTab } from "./edit-tabs/EditAddonsTab";
import { EditPaymentTab } from "./edit-tabs/EditPaymentTab";
import EditFolioTab from "./edit-tabs/EditFolioTab";
import EditCardsTab from "./edit-tabs/EditCardsTab";
import EditDocumentsTab from "./edit-tabs/EditDocumentsTab";
import EditNotesTab from "./edit-tabs/EditNotesTab";
import EditAuditTab from "./edit-tabs/EditAuditTab";
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Track the last reservation ID to prevent unnecessary form resets
  const lastReservationIdRef = useRef<string | null>(null);

  // Debug: Log renders for performance testing
  useRenderLogger("EditBookingSheet", {
    reservationId: editingReservation?.id,
    hasUnsavedChanges
  });

  // Initialize form data when reservation ID actually changes (prevents unnecessary resets)
  useEffect(() => {
    const currentReservationId = editingReservation?.id || null;

    // Only initialize if the reservation ID has actually changed
    if (currentReservationId !== lastReservationIdRef.current) {
      lastReservationIdRef.current = currentReservationId;

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
    }
  }, [editingReservation]); // Safe to depend on entire object now since we check ID internally

  // Helper function to check for changes (moved outside to avoid recreating)
  const checkForChanges = useCallback(() => {
    if (!editingReservation) return false;

    return (
      formData.guestName !== (editingReservation.guestName || "") ||
      formData.email !== (editingReservation.email || "") ||
      formData.phone !== (editingReservation.phone || "") ||
      formData.roomId !== (editingReservation.roomId || "") ||
      formData.checkIn !== (editingReservation.checkIn || "") ||
      formData.checkOut !== (editingReservation.checkOut || "") ||
      formData.adults !== (editingReservation.adults || 1) ||
      formData.children !== (editingReservation.children || 0) ||
      formData.notes !== (editingReservation.notes || "")
    );
  }, [formData, editingReservation]);

  // Calculate if there are unsaved changes (using callback to avoid dependency issues)
  const hasChanges = useMemo(() => {
    return checkForChanges();
  }, [checkForChanges]);

  // Update hasUnsavedChanges state only when hasChanges actually changes
  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges]);

  // Reset ref when reservation is cleared
  useEffect(() => {
    if (!editingReservation) {
      lastReservationIdRef.current = null;
    }
  }, [editingReservation]);

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
      toast.error("Failed to update reservation. Please try again.");
    }
  };

  const handleStatusUpdate = async (
    newStatus: ReservationStatus,
    reason?: string
  ) => {
    if (!editingReservation) return;

    // Validate the status transition
    const currentStatus = editingReservation.status as ReservationStatus;
    const validation = validateStatusTransition(currentStatus, newStatus);

    if (!validation.isValid) {
      toast.error(validation.reason || "Invalid status transition");
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const response = await fetch(
        `/api/reservations/${editingReservation.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            newStatus,
            reason,
            updatedBy: "user", // This should come from session
            isAutomatic: false
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      await response.json();

      // Update the local reservation data
      setEditingReservation({
        ...editingReservation,
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        statusChangeReason: reason
      });

      toast.success(`Status updated to ${getStatusConfig(newStatus).label}`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setIsUpdatingStatus(false);
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
      toast.error("Failed to delete reservation. Please try again.");
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

  // Don't render if editingReservation is null or missing required fields
  if (!editingReservation || !editingReservation.id) {
    return null;
  }

  return (
    <Sheet open={!!editingReservation} onOpenChange={() => {}}>
      <SheetClose asChild>
        <div />
      </SheetClose>
      <SheetContent className="fixed top-16 text-lg bottom-0 left-0 right-0 w-full h-[calc(100vh-4rem)] overflow-y-auto !bg-gray-100 dark:!bg-[#121212] !text-gray-900 dark:!text-[#f0f8ff] [&_label]:text-base [&_input]:text-base [&_textarea]:text-base [&_[data-slot=select-trigger]]:text-base [&_[data-slot=select-item]]:text-base [&_[data-slot=select-content]]:z-[99999] z-[9999]">
        <SheetHeader className="relative">
          {/* Status and Action Dropdowns + Close button in top right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </span>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-auto min-w-32 text-xs justify-between px-3 bg-purple-50 dark:bg-purple-900/20 text-[#7210a2] dark:text-[#8b4aff] border-[#7210a2] dark:border-[#8b4aff] hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-sm"
                    disabled={isUpdatingStatus}
                  >
                    <span>
                      {
                        getStatusConfig(
                          editingReservation.status as ReservationStatus
                        ).label
                      }
                    </span>
                    <ChevronDownIcon className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[10000]"
                  sideOffset={5}
                >
                  {getAllowedNextStatuses(
                    editingReservation.status as ReservationStatus
                  ).map((status) => {
                    const config = getStatusConfig(status);
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={isUpdatingStatus}
                        className="flex items-center gap-2"
                      >
                        <StatusBadge
                          status={status}
                          size="sm"
                          showIcon={true}
                          showLabel={false}
                        />
                        <span>{config.label}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {config.description}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                  {getAllowedNextStatuses(
                    editingReservation.status as ReservationStatus
                  ).length === 0 && (
                    <DropdownMenuItem disabled>
                      No status changes available
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Actions:
              </span>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-32 text-xs justify-between px-3 bg-purple-50 dark:bg-purple-900/20 text-[#7210a2] dark:text-[#8b4aff] border-[#7210a2] dark:border-[#8b4aff] hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-sm"
                  >
                    <span>Select Action</span>
                    <ChevronDownIcon className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[10000]"
                  sideOffset={5}
                >
                  <DropdownMenuItem
                    onClick={() => console.log("Change Dates clicked")}
                  >
                    Change Dates
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Move Room clicked")}
                  >
                    Move Room
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Add Charge clicked")}
                  >
                    Add Charge
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Record Payment clicked")}
                  >
                    Record Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Refund clicked")}
                  >
                    Refund
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Print/Download Folio clicked")}
                  >
                    Print/Download Folio
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Send Confirmation clicked")}
                  >
                    Send Confirmation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-md bg-gray-200 hover:!bg-gray-300 dark:!bg-gray-700 dark:hover:bg-gray-900 transition-colors"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6 dark:!text-[#f0f8f9]" />
            </button>
          </div>

          {/* Back button */}
          <button
            type="button"
            onClick={handleClose}
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#7210a2] dark:bg-[#8b4aff] hover:bg-purple-600 dark:hover:bg-[#a876ff] text-[#f0f8ff] font-medium transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>

          {/* Guest Information - Aligned with form content */}
          <div className="pl-4">
            <SheetTitle className="text-3xl flex items-center gap-3">
              {formData.guestName || editingReservation.guestName}
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={editingReservation.status as ReservationStatus}
                  size="sm"
                />
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    editingReservation.paymentStatus === "PAID"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : editingReservation.paymentStatus === "PARTIALLY_PAID"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {editingReservation.paymentStatus || "UNPAID"}
                </span>
              </div>
            </SheetTitle>
            <div className="text-md space-y-2 mt-2">
              <div className="text-sm text-gray-600 pt-2 dark:text-gray-400 font-bold font-mono uppercase">
                {editingReservation.id}
                {/* Res ID:  */}
              </div>
              <div className="text-sm text-muted-foreground font-bold">
                {/* Modify booking details for{" "}
                {formData.guestName || editingReservation.guestName} |{" "} */}
                {formatDateRange()} | {calculateNights()} Night(s)
                {calculateNights() > 1 ? "s" : ""}
              </div>
            </div>
          </div>
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

            <TabsContent value="folio" className="mt-0">
              <EditFolioTab
                reservationData={editingReservation}
                formData={formData}
                onUpdate={updateFormData}
              />
            </TabsContent>

            <TabsContent value="cards" className="mt-0">
              <EditCardsTab
                reservationData={editingReservation}
                formData={formData}
                onUpdate={updateFormData}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <EditDocumentsTab
                reservationData={editingReservation}
                formData={formData}
                onUpdate={updateFormData}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <EditNotesTab
                reservationData={editingReservation}
                formData={formData}
                onUpdate={updateFormData}
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <EditAuditTab
                reservationData={editingReservation}
                formData={formData}
                onUpdate={updateFormData}
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
