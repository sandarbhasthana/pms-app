"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetDescription
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
  validateStatusTransition
} from "@/lib/reservation-status/utils";
import {
  StatusBadge,
  StatusUpdateModal
} from "@/components/reservation-status";

import { EditDetailsTab } from "./edit-tabs/EditDetailsTab";
import { EditAddonsTab } from "./edit-tabs/EditAddonsTab";
import { EditPaymentTab } from "./edit-tabs/EditPaymentTab";
import EditFolioTab from "./edit-tabs/EditFolioTab";
import EditCardsTab from "./edit-tabs/EditCardsTab";
import EditDocumentsTab from "./edit-tabs/EditDocumentsTab";
import EditNotesTab from "./edit-tabs/EditNotesTab";
import EditAuditTab from "./edit-tabs/EditAuditTab";
import { StatusChangeConfirmationModal } from "./StatusChangeConfirmationModal";
import { EarlyCheckInOptionsModal } from "./EarlyCheckInOptionsModal";
import { useApprovalBellRefresh } from "@/contexts/ApprovalBellContext";
import {
  EditBookingSheetProps,
  EditBookingTab,
  EditBookingFormData
} from "./edit-tabs/types";

const EditBookingSheetComponent: React.FC<EditBookingSheetProps> = ({
  editingReservation,
  setEditingReservation,
  availableRooms,
  onUpdate,
  onDelete
}) => {
  const { refreshApprovalRequests } = useApprovalBellRefresh();
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
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    newStatus: ReservationStatus;
  } | null>(null);
  const [showEarlyCheckInModal, setShowEarlyCheckInModal] = useState(false);
  const [earlyCheckInData, setEarlyCheckInData] = useState<{
    hoursEarly: number;
    currentCheckInTime: string;
    scheduledCheckInTime: string;
  } | null>(null);

  // Track the last reservation ID to prevent unnecessary form resets
  const lastReservationIdRef = useRef<string | null>(null);
  // Track if we're in the initialization phase to avoid checking unsaved changes
  const isInitializingRef = useRef(true);

  // Initialize form data when reservation ID actually changes (prevents unnecessary resets)
  useEffect(() => {
    const currentReservationId = editingReservation?.id || null;

    // Only initialize if the reservation ID has actually changed
    if (currentReservationId !== lastReservationIdRef.current) {
      lastReservationIdRef.current = currentReservationId;

      if (editingReservation) {
        const newFormData = {
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
        };
        setFormData(newFormData);
        setActiveTab("details");
        setHasUnsavedChanges(false);
        // Mark that we're done initializing
        isInitializingRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingReservation?.id]); // Only depend on ID to prevent unnecessary re-runs

  // Calculate if there are unsaved changes directly (avoid extra callback layer)
  // Skip during initialization to prevent unnecessary renders
  useEffect(() => {
    // Skip during initialization phase
    if (isInitializingRef.current) {
      return;
    }

    if (!editingReservation) {
      // Only update state if it's currently true
      setHasUnsavedChanges((prev) => (prev ? false : prev));
      return;
    }

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

    // Only update state if the value actually changed
    setHasUnsavedChanges((prev) => (prev !== hasChanges ? hasChanges : prev));
  }, [formData, editingReservation]);

  // Reset refs when reservation is cleared
  useEffect(() => {
    if (!editingReservation) {
      lastReservationIdRef.current = null;
      isInitializingRef.current = true; // Reset initialization flag for next reservation
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingReservation?.id]);

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

    // Check if this is an early check-in
    if (
      newStatus === ReservationStatus.IN_HOUSE &&
      editingReservation.checkIn
    ) {
      const now = new Date();
      const checkInTime = new Date(editingReservation.checkIn);
      const hoursUntilCheckIn =
        (checkInTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If check-in is more than 4 hours in the future, it's an early check-in
      if (hoursUntilCheckIn > 4) {
        setEarlyCheckInData({
          hoursEarly: hoursUntilCheckIn,
          currentCheckInTime: now.toISOString(),
          scheduledCheckInTime: editingReservation.checkIn
        });
        setShowEarlyCheckInModal(true);
        return;
      }
    }

    // Check if this is a critical transition that needs confirmation
    const isCriticalTransition =
      (currentStatus === "CONFIRMED" && newStatus === "CANCELLED") ||
      (currentStatus === "IN_HOUSE" && newStatus === "CANCELLED") ||
      (currentStatus === "CONFIRMED" && newStatus === "NO_SHOW");

    // If critical transition and no reason provided, show confirmation modal
    if (isCriticalTransition && !reason) {
      setPendingStatusChange({ newStatus });
      setShowStatusConfirmation(true);
      return;
    }

    setIsUpdatingStatus(true);

    try {
      console.log(`🔄 Updating status to ${newStatus} with reason: ${reason}`);

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
            reason: reason || "Status changed from EditBookingSheet",
            isAutomatic: false
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();

        // Handle approval required response
        if (response.status === 403 && error.requiresApproval) {
          // Create approval request
          try {
            const approvalRes = await fetch("/api/approval-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                reservationId: editingReservation.id,
                requestType: "EARLY_CHECKIN",
                requestReason:
                  error.approvalReason ||
                  "Early check-in requires manager approval",
                metadata: {
                  newStatus,
                  reason,
                  timestamp: new Date().toISOString()
                }
              })
            });

            if (approvalRes.ok) {
              await approvalRes.json();

              // Show success message FIRST
              toast.success("Request forwarded to manager for approval");

              // Refresh approval requests in the bell
              await refreshApprovalRequests();

              setIsUpdatingStatus(false);
              return;
            } else {
              // Approval request creation failed
              throw new Error("Failed to create approval request");
            }
          } catch (approvalError) {
            console.error("Error creating approval request:", approvalError);
            throw new Error("Failed to create approval request");
          }
        }

        // Build detailed error message from validation details
        let errorMessage = error.error || "Failed to update status";

        if (
          error.details &&
          Array.isArray(error.details) &&
          error.details.length > 0
        ) {
          errorMessage = error.details[0]; // Show first validation error
        }

        throw new Error(errorMessage);
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

      // Trigger calendar refresh by calling onUpdate with empty data
      // This will cause the calendar to refetch and display the updated status color
      if (onUpdate) {
        await onUpdate(editingReservation.id, {});
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setIsUpdatingStatus(false);
      setPendingStatusChange(null);
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

  const handleEarlyCheckInApproval = async () => {
    // Proceed with the status update - it will trigger the approval request flow
    await handleStatusUpdate(
      ReservationStatus.IN_HOUSE,
      "Early check-in requested"
    );
    // Close modal after approval request is created
    setShowEarlyCheckInModal(false);
    setEarlyCheckInData(null);
  };

  const handleEarlyCheckInDateChange = (newCheckInDate: string) => {
    // Update the form field with the new check-in date
    setFormData({
      ...formData,
      checkIn: newCheckInDate
    });
    // Close the modal
    setShowEarlyCheckInModal(false);
    setEarlyCheckInData(null);
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
        <SheetDescription className="sr-only">
          Edit booking details including guest information, dates, and status
        </SheetDescription>
        <SheetHeader className="relative">
          {/* Status and Action Dropdowns + Close button in top right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="h-10 px-4 text-sm font-medium justify-between gap-2 rounded-full"
                    style={{
                      backgroundColor:
                        editingReservation.status === "CONFIRMED"
                          ? "#14b8a6" // Teal
                          : editingReservation.status === "CONFIRMATION_PENDING"
                          ? "#ec4899" // Pink
                          : editingReservation.status === "IN_HOUSE"
                          ? "#22c55e" // Green
                          : editingReservation.status === "CANCELLED"
                          ? "#6b7280" // Gray
                          : editingReservation.status === "CHECKED_OUT"
                          ? "#8b5cf6" // Purple
                          : editingReservation.status === "NO_SHOW"
                          ? "#f97316" // Orange
                          : "#6b7280",
                      color: "white",
                      border: "none"
                    }}
                  >
                    <span className="uppercase text-xs font-bold">
                      {editingReservation.status?.replace(/_/g, " ")}
                    </span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[10000]"
                  sideOffset={5}
                >
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate(
                        "CONFIRMATION_PENDING",
                        "Status changed"
                      )
                    }
                  >
                    Confirmation Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CONFIRMED", "Status changed")
                    }
                  >
                    Confirmed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("IN_HOUSE", "Status changed")
                    }
                  >
                    In-House
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CHECKED_OUT", "Status changed")
                    }
                  >
                    Checked Out
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("NO_SHOW", "Status changed")
                    }
                  >
                    No-Show
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CANCELLED", "Status changed")
                    }
                  >
                    Cancelled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions Dropdown */}
            <div className="flex items-center gap-2">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 text-sm font-medium justify-between gap-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-none"
                  >
                    <span className="uppercase text-xs font-bold">Actions</span>
                    <ChevronDownIcon className="h-4 w-4" />
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

      {/* Status Change Confirmation Modal */}
      {pendingStatusChange && (
        <StatusChangeConfirmationModal
          isOpen={showStatusConfirmation}
          currentStatus={editingReservation.status as ReservationStatus}
          newStatus={pendingStatusChange.newStatus}
          guestName={editingReservation.guestName || "Guest"}
          onConfirm={(reason) => {
            setShowStatusConfirmation(false);
            handleStatusUpdate(pendingStatusChange.newStatus, reason);
          }}
          onCancel={() => {
            setShowStatusConfirmation(false);
            setPendingStatusChange(null);
          }}
          isLoading={isUpdatingStatus}
        />
      )}

      {/* Advanced Status Update Modal */}
      <StatusUpdateModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        reservation={{
          id: editingReservation.id,
          guestName: editingReservation.guestName,
          roomNumber: editingReservation.roomNumber,
          checkIn: editingReservation.checkIn,
          checkOut: editingReservation.checkOut,
          status: editingReservation.status as ReservationStatus,
          paymentStatus: editingReservation.paymentStatus
        }}
        currentUserRole="FRONT_DESK" // This should come from user session
        onStatusUpdate={(_reservationId, newStatus, reason) =>
          handleStatusUpdate(newStatus, reason)
        }
      />

      {/* Early Check-in Options Modal */}
      {earlyCheckInData && (
        <EarlyCheckInOptionsModal
          isOpen={showEarlyCheckInModal}
          onClose={() => {
            setShowEarlyCheckInModal(false);
            setEarlyCheckInData(null);
          }}
          guestName={editingReservation.guestName || "Guest"}
          scheduledCheckInTime={earlyCheckInData.scheduledCheckInTime}
          currentCheckInTime={earlyCheckInData.currentCheckInTime}
          hoursEarly={earlyCheckInData.hoursEarly}
          onRequestApproval={handleEarlyCheckInApproval}
          onChangeCheckInDate={handleEarlyCheckInDateChange}
          isLoading={isUpdatingStatus}
        />
      )}
    </Sheet>
  );
};

// Memoize the component to prevent unnecessary re-renders when parent re-renders
// Only re-render if the actual props change (editingReservation ID, availableRooms, callbacks)
const EditBookingSheet = React.memo(
  EditBookingSheetComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    // Return false if props are different (do re-render)
    return (
      prevProps.editingReservation?.id === nextProps.editingReservation?.id &&
      prevProps.availableRooms === nextProps.availableRooms &&
      prevProps.onUpdate === nextProps.onUpdate &&
      prevProps.onDelete === nextProps.onDelete &&
      prevProps.setEditingReservation === nextProps.setEditingReservation
    );
  }
);

EditBookingSheet.displayName = "EditBookingSheet";

export default EditBookingSheet;
