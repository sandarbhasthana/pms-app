"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense
} from "react";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeftIcon,
  XMarkIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon
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
import {
  calculateNightsWithSixAMBoundary,
  getOperationalDayStart,
  getOperationalDate
} from "@/lib/timezone/day-boundaries";
import { formatDateRange as formatDateRangeUtil } from "@/lib/utils/dateFormatter";

import { EditDetailsTab } from "./edit-tabs/EditDetailsTab";
import { EditAddonsTab } from "./edit-tabs/EditAddonsTab";
// ⚡ LAZY LOAD: Payment tab imports Stripe (~50MB), only load when tab is opened
const EditPaymentTab = lazy(() =>
  import("./edit-tabs/EditPaymentTab").then((mod) => ({
    default: mod.EditPaymentTab
  }))
);
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
import { shortenId } from "@/lib/utils/cuid-formatter";

// Helper function to check if reservation is for today (using operational day boundaries)
const isReservationToday = (
  checkInDate: string,
  checkOutDate: string,
  timezone: string = "UTC"
): boolean => {
  const today = new Date();
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Use operational date (6 AM boundary) instead of midnight
  const todayOperationalDate = getOperationalDate(today, timezone);
  const checkInOperationalDate = getOperationalDate(checkIn, timezone);
  const checkOutOperationalDate = getOperationalDate(checkOut, timezone);

  // Check if today falls within the reservation dates (inclusive)
  return (
    todayOperationalDate >= checkInOperationalDate &&
    todayOperationalDate <= checkOutOperationalDate
  );
};

const EditBookingSheetComponent: React.FC<EditBookingSheetProps> = ({
  editingReservation,
  setEditingReservation,
  availableRooms,
  onUpdate,
  onDelete
}) => {
  const { refreshApprovalRequests } = useApprovalBellRefresh();
  const [activeTab, setActiveTab] = useState<EditBookingTab>("details");
  const [calculatedPaymentStatus, setCalculatedPaymentStatus] = useState<
    "PAID" | "PARTIALLY_PAID" | "UNPAID"
  >("UNPAID");
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
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
        // Fetch full reservation data to ensure we have all fields including depositAmount
        const fetchFullReservationData = async () => {
          try {
            console.log(
              `📥 Fetching full reservation data for ${editingReservation.id}...`
            );
            const res = await fetch(
              `/api/reservations/${editingReservation.id}`,
              {
                credentials: "include"
              }
            );

            if (!res.ok) {
              console.warn(
                `Failed to fetch full reservation data: ${res.status}`
              );
              // Fall back to using the provided data
              initializeFormData(editingReservation);
              return;
            }

            const fullReservation = await res.json();
            // console.log(`✅ Full reservation data loaded:`, {
            //   id: fullReservation.id,
            //   depositAmount: fullReservation.depositAmount,
            //   paidAmount: fullReservation.paidAmount,
            //   status: fullReservation.status,
            //   checkIn: fullReservation.checkIn,
            //   checkOut: fullReservation.checkOut,
            //   paymentStatus: fullReservation.paymentStatus,
            //   payments: fullReservation.payments?.length || 0,
            //   addons: fullReservation.addons?.length || 0
            // });
            // console.log(`📋 Full reservation object:`, fullReservation);
            initializeFormData(fullReservation);

            // Set calculated payment status from API response
            // console.log(
            //   `💳 Payment status for ${editingReservation.id}:`,
            //   fullReservation.paymentStatus
            // );
            setCalculatedPaymentStatus(
              fullReservation.paymentStatus || "UNPAID"
            );
          } catch (error) {
            console.error("Error fetching full reservation data:", error);
            // Fall back to using the provided data
            console.log(
              `⚠️ Falling back to provided reservation data:`,
              editingReservation
            );
            initializeFormData(editingReservation);
          }
        };

        fetchFullReservationData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingReservation?.id]); // Only depend on ID to prevent unnecessary re-runs

  // Helper function to initialize form data from reservation object
  const initializeFormData = (reservation: typeof editingReservation) => {
    if (!reservation) {
      console.warn(
        "⚠️ Cannot initialize form data: reservation is null/undefined"
      );
      return;
    }

    // Validate required fields
    if (!reservation.id || !reservation.roomId) {
      console.error("❌ Invalid reservation data: missing required fields", {
        id: reservation.id,
        roomId: reservation.roomId
      });
      return;
    }

    // Log payment data for debugging
    // console.log(`💳 Payment data for reservation ${reservation.id}:`, {
    //   depositAmount: reservation.depositAmount,
    //   paidAmount: reservation.paidAmount,
    //   paymentStatus: reservation.paymentStatus,
    //   status: reservation.status
    // });

    // Helper to format dates to YYYY-MM-DD string format
    const formatDateString = (
      date: string | Date | null | undefined
    ): string => {
      if (!date) return "";
      if (typeof date === "string") {
        // If already a string, extract just the date part
        return date.split("T")[0];
      }
      // If it's a Date object, convert to ISO string and extract date part
      try {
        return new Date(date).toISOString().split("T")[0];
      } catch {
        console.warn(`Failed to format date: ${date}`);
        return "";
      }
    };

    const newFormData = {
      guestName: reservation.guestName || "",
      email: reservation.email || "",
      phone: reservation.phone || "",
      idType: reservation.idType || "passport",
      idNumber: reservation.idNumber || "",
      issuingCountry: reservation.issuingCountry || "",
      roomId: reservation.roomId || "",
      checkIn: formatDateString(reservation.checkIn),
      checkOut: formatDateString(reservation.checkOut),
      adults: reservation.adults || 1,
      children: reservation.children || 0,
      notes: reservation.notes || "",
      addons: {
        extraBed: false, // Will be populated from backend when available
        extraBedQuantity: 1,
        breakfast: false,
        breakfastQuantity: 1,
        customAddons: (reservation.addons || []).map((addon) => ({
          id: addon.id,
          name: addon.name,
          description: addon.description,
          price: addon.price,
          quantity: addon.quantity,
          perNight: addon.nights ? addon.nights > 1 : false // Convert nights to perNight boolean
        }))
      },
      payment: {
        totalAmount: reservation.depositAmount
          ? reservation.depositAmount / 100
          : 0, // Convert from cents
        paidAmount: reservation.paidAmount || 0,
        paymentMethod: "cash", // Default method
        paymentStatus: reservation.paymentStatus || "UNPAID"
      }
    };

    // Validate calculated values
    if (
      newFormData.payment.totalAmount === 0 &&
      reservation.status === "CONFIRMATION_PENDING"
    ) {
      console.warn(
        `⚠️ Warning: CONFIRMATION_PENDING reservation has ₹0 total amount. This may indicate missing depositAmount.`,
        {
          reservationId: reservation.id,
          depositAmount: reservation.depositAmount
        }
      );
    }

    setFormData(newFormData);
    setActiveTab("details");
    setHasUnsavedChanges(false);
    // Mark that we're done initializing
    isInitializingRef.current = false;
  };

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

    // Helper function to format dates for comparison
    const formatDateForComparison = (
      date: string | Date | null | undefined
    ): string => {
      if (!date) return "";
      if (typeof date === "string") {
        return date.split("T")[0]; // Extract just the date part
      }
      try {
        return new Date(date).toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    const hasChanges =
      formData.guestName !== (editingReservation.guestName || "") ||
      formData.email !== (editingReservation.email || "") ||
      formData.phone !== (editingReservation.phone || "") ||
      formData.roomId !== (editingReservation.roomId || "") ||
      formData.checkIn !==
        formatDateForComparison(editingReservation.checkIn) ||
      formData.checkOut !==
        formatDateForComparison(editingReservation.checkOut) ||
      formData.adults !== (editingReservation.adults || 1) ||
      formData.children !== (editingReservation.children || 0) ||
      formData.notes !== (editingReservation.notes || "");

    // Only update state if the value actually changed
    setHasUnsavedChanges((prev) => (prev !== hasChanges ? hasChanges : prev));
  }, [
    formData.guestName,
    formData.email,
    formData.phone,
    formData.roomId,
    formData.checkIn,
    formData.checkOut,
    formData.adults,
    formData.children,
    formData.notes,
    editingReservation,
    editingReservation?.guestName,
    editingReservation?.email,
    editingReservation?.phone,
    editingReservation?.roomId,
    editingReservation?.checkIn,
    editingReservation?.checkOut,
    editingReservation?.adults,
    editingReservation?.children,
    editingReservation?.notes
  ]);

  // Reset refs when reservation is cleared
  useEffect(() => {
    if (!editingReservation?.id) {
      lastReservationIdRef.current = null;
      isInitializingRef.current = true; // Reset initialization flag for next reservation
    }
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

      // Add hard refresh after save
      console.log("💾 Save completed, triggering hard refresh...");

      // Close the sheet first
      setEditingReservation(null);

      // Then trigger a hard refresh after a short delay to ensure sheet is closed
      setTimeout(() => {
        console.log("🔄 Performing hard refresh...");
        window.location.reload();
      }, 300);
    } catch (error) {
      console.error("Failed to update reservation:", error);
      toast.error("Failed to update reservation. Please try again.");
    }
  };

  const handleStatusUpdate = async (
    newStatus: ReservationStatus | string,
    reason?: string
  ) => {
    if (!editingReservation) return;

    // Validate the status transition
    const currentStatus = editingReservation.status as ReservationStatus;
    const statusToUpdate = newStatus as ReservationStatus;
    const validation = validateStatusTransition(currentStatus, statusToUpdate);

    if (!validation.isValid) {
      toast.error(validation.reason || "Invalid status transition");
      return;
    }

    // Check if this is an early check-in (using operational day boundaries)
    if (
      newStatus === ReservationStatus.IN_HOUSE &&
      editingReservation.checkIn
    ) {
      const now = new Date();
      const checkInDate = new Date(editingReservation.checkIn);
      const timezone = editingReservation.propertyTimezone || "UTC";

      // Get the operational day start (6 AM local time) for the check-in date
      const operationalDayStart = getOperationalDayStart(checkInDate, timezone);

      // If current time is before the operational day start, it's an early check-in
      if (now < operationalDayStart) {
        const hoursEarly =
          (operationalDayStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        setEarlyCheckInData({
          hoursEarly,
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

        // Create error object with isValidationError flag to suppress console logging
        const validationError = new Error(errorMessage);
        Object.defineProperty(validationError, "isValidationError", {
          value: true,
          enumerable: false
        });
        throw validationError;
      }

      await response.json();

      // Update the local reservation data
      setEditingReservation({
        ...editingReservation,
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        statusChangeReason: reason
      });

      toast.success(
        `Status updated to ${getStatusConfig(statusToUpdate).label}`
      );

      // Trigger calendar refresh by calling onUpdate with empty data
      // This will cause the calendar to refetch and display the updated status color
      if (onUpdate) {
        await onUpdate(editingReservation.id, {});
      }
    } catch (error) {
      // Only log to console if it's not a validation error (those are expected and already shown as toast)
      const isValidationError =
        error instanceof Error &&
        Object.getOwnPropertyDescriptor(error, "isValidationError")?.value ===
          true;

      if (!isValidationError) {
        console.error("Failed to update status:", error);
      }

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
    setShowCancelConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!editingReservation) return;

    try {
      await onDelete(editingReservation.id);
      setEditingReservation(null);
      setShowCancelConfirm(false);
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
    const timezone = editingReservation?.propertyTimezone || "UTC";

    // Use operational day boundaries (6 AM start) for accurate night counting
    return calculateNightsWithSixAMBoundary(checkIn, checkOut, timezone);
  };

  const formatDateRange = () => {
    if (!formData.checkIn || !formData.checkOut) return "";
    // Use locale-aware date formatting
    return formatDateRangeUtil(formData.checkIn, formData.checkOut);
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
      <SheetContent className="fixed top-16 text-lg bottom-0 left-0 right-0 w-full h-[calc(100vh-4rem)] overflow-y-auto bg-gray-100! dark:bg-[#121212]! text-gray-900! dark:text-[#f0f8ff]! [&_label]:text-base [&_input]:text-base [&_textarea]:text-base **:data-[slot=select-trigger]:text-base **:data-[slot=select-item]:text-base **:data-[slot=select-content]:z-99999 z-9999">
        <SheetDescription className="sr-only">
          Edit booking details including guest information, dates, and status
        </SheetDescription>
        <SheetHeader className="relative">
          {/* Status and Action Dropdowns + Close button in top right */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="h-10 px-4 text-sm font-medium justify-between gap-2 rounded-full text-white hover:text-white transition-all duration-200 group cursor-pointer"
                    style={{
                      backgroundColor:
                        editingReservation.status === "CONFIRMED"
                          ? document.documentElement.classList.contains("dark")
                            ? "#3b513b" // Dark mode: Dark green
                            : "#6c956e" // Light mode: Green
                          : editingReservation.status === "CONFIRMATION_PENDING"
                          ? "#ec4899" // Pink
                          : editingReservation.status === "IN_HOUSE"
                          ? "#22c55e" // Green
                          : editingReservation.status === "CHECKOUT_DUE"
                          ? document.documentElement.classList.contains("dark")
                            ? "#b45309" // Dark mode: Amber-800
                            : "#f59e0b" // Light mode: Amber
                          : editingReservation.status === "CANCELLED"
                          ? "#6b7280" // Gray
                          : editingReservation.status === "CHECKED_OUT"
                          ? "#8b5cf6" // Purple
                          : editingReservation.status === "NO_SHOW"
                          ? document.documentElement.classList.contains("dark")
                            ? "#991b1b" // Dark mode: Brick red
                            : "#b91c1c" // Light mode: Brick red
                          : "#6b7280",
                      color: "white",
                      border: "none"
                    }}
                    onMouseEnter={(e) => {
                      // Darken only the background by adjusting opacity
                      e.currentTarget.style.boxShadow =
                        "inset 0 0 0 9999px rgba(0, 0, 0, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      // Remove the darkening effect
                      e.currentTarget.style.boxShadow = "none";
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
                  className="z-99999"
                  sideOffset={5}
                >
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate(
                        "CONFIRMATION_PENDING",
                        "Status changed"
                      )
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Confirmation Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CONFIRMED", "Status changed")
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Confirmed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("IN_HOUSE", "Status changed")
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    In-House
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CHECKOUT_DUE", "Status changed")
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Checkout Due
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CHECKED_OUT", "Status changed")
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Checked Out
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("NO_SHOW", "Status changed")
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    No-Show
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusUpdate("CANCELLED", "Status changed")
                    }
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions Dropdown */}
            <div className="flex items-center gap-2">
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 text-sm font-medium justify-between gap-2 rounded-full bg-blue-400 hover:bg-blue-500 text-white border-none dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white hover:text-white cursor-pointer"
                  >
                    <span className="uppercase text-xs font-bold">Actions</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-99999"
                  sideOffset={5}
                >
                  <DropdownMenuItem
                    onClick={() => console.log("Change Dates clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Change Dates
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Move Room clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Move Room
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Add Charge clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Add Charge
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Record Payment clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Record Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Refund clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Refund
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Print/Download Folio clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Print/Download Folio
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Send Confirmation clicked")}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Send Confirmation
                  </DropdownMenuItem>
                  {editingReservation.status === "IN_HOUSE" &&
                    isReservationToday(
                      editingReservation.checkIn,
                      editingReservation.checkOut,
                      editingReservation.propertyTimezone || "UTC"
                    ) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowCheckOutConfirm(true)}
                          className="cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors text-blue-600 dark:text-blue-400 font-medium"
                        >
                          Check-Out
                        </DropdownMenuItem>
                      </>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-md bg-gray-200 hover:bg-gray-300! dark:bg-gray-700! dark:hover:bg-gray-900 transition-colors cursor-pointer"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6 dark:text-[#f0f8f9]!" />
            </button>
          </div>

          {/* Back button */}
          <button
            type="button"
            onClick={handleClose}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-full bg-[#7210a2] dark:bg-[#8b4aff] hover:bg-purple-600 dark:hover:bg-[#a876ff] text-[#f0f8ff] font-bold transition-colors cursor-pointer text-sm mb-[1.1rem]"
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
                  {shortenId(editingReservation.id, 8)}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        editingReservation.id
                      );
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
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">
                      Loading payment tab...
                    </span>
                  </div>
                }
              >
                <EditPaymentTab
                  reservationData={editingReservation}
                  formData={formData}
                  updateFormData={updateFormData}
                  availableRooms={availableRooms}
                  onPrevious={handlePrevious}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onUpdate={onUpdate}
                  setEditingReservation={setEditingReservation}
                  onStatusUpdate={handleStatusUpdate}
                />
              </Suspense>
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

      {/* Cancel Booking Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Cancellation
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to cancel the booking for{" "}
              <span className="font-semibold">
                {editingReservation.guestName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-Out Confirmation Dialog */}
      {showCheckOutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Check-Out
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to check out{" "}
              <span className="font-semibold">
                {editingReservation.guestName}
              </span>
              ?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCheckOutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/reservations/${editingReservation.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "CHECKED_OUT" })
                      }
                    );
                    if (!res.ok)
                      throw new Error((await res.json()).error || "Error");
                    toast.success("Checked out!");
                    setShowCheckOutConfirm(false);
                    handleClose();
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Unknown error"
                    );
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
              >
                Check-Out
              </button>
            </div>
          </div>
        </div>
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
