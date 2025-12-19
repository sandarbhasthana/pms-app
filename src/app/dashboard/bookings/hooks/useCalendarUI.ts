// File: src/app/dashboard/bookings/hooks/useCalendarUI.ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Reservation,
  SelectedSlot,
  BlockData,
  ReservationFlyout,
  CellFlyout,
  BlockFlyout,
  AddDropdown,
  GuestDetails
} from "../types";

/**
 * Custom hook for managing calendar UI state
 * Handles dialogs, flyouts, modals, and other UI elements
 */
export function useCalendarUI() {
  // Refs for flyout positioning
  const flyoutRef = useRef<HTMLDivElement>(null);
  const cellFlyoutRef = useRef<HTMLDivElement>(null);
  const blockFlyoutRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dialog states
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [viewReservation, setViewReservation] = useState<Reservation | null>(null);
  const [blockData, setBlockData] = useState<BlockData | null>(null);

  // Flyout states
  const [flyout, setFlyout] = useState<ReservationFlyout | null>(null);
  const [cellFlyout, setCellFlyout] = useState<CellFlyout | null>(null);
  const [blockFlyout, setBlockFlyout] = useState<BlockFlyout | null>(null);
  const [addDropdown, setAddDropdown] = useState<AddDropdown | null>(null);

  // Guest details state
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idType, setIdType] = useState("passport");
  const [idNumber, setIdNumber] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("");
  const [guestImageUrl, setGuestImageUrl] = useState<string | undefined>();
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | undefined>();
  const [idExpiryDate, setIdExpiryDate] = useState<string | undefined>();
  const [idDocumentExpired, setIdDocumentExpired] = useState<boolean | undefined>();

  // OCR and scanner state
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedSlot, setLastScannedSlot] = useState<SelectedSlot | null>(null);

  // Other UI state
  const [showLegend, setShowLegend] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  /**
   * Detect dark mode changes
   */
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  /**
   * Reset guest details form
   */
  const resetGuestDetails = useCallback(() => {
    setAdults(1);
    setChildren(0);
    setFullName("");
    setPhone("");
    setEmail("");
    setIdType("passport");
    setIdNumber("");
    setIssuingCountry("");
    setGuestImageUrl(undefined);
    setIdDocumentUrl(undefined);
    setIdExpiryDate(undefined);
    setIdDocumentExpired(undefined);
  }, []);

  /**
   * Get guest details as object
   */
  const getGuestDetails = useCallback((): GuestDetails => {
    return {
      fullName,
      phone,
      email,
      idType,
      idNumber,
      issuingCountry,
      guestImageUrl,
      idDocumentUrl,
      idExpiryDate,
      idDocumentExpired
    };
  }, [
    fullName,
    phone,
    email,
    idType,
    idNumber,
    issuingCountry,
    guestImageUrl,
    idDocumentUrl,
    idExpiryDate,
    idDocumentExpired
  ]);

  return {
    // Refs
    flyoutRef,
    cellFlyoutRef,
    blockFlyoutRef,
    addButtonRef,
    containerRef,

    // Dialog states
    selectedSlot,
    setSelectedSlot,
    editingReservation,
    setEditingReservation,
    viewReservation,
    setViewReservation,
    blockData,
    setBlockData,

    // Flyout states
    flyout,
    setFlyout,
    cellFlyout,
    setCellFlyout,
    blockFlyout,
    setBlockFlyout,
    addDropdown,
    setAddDropdown,

    // Guest details
    adults,
    setAdults,
    children,
    setChildren,
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
    guestImageUrl,
    setGuestImageUrl,
    idDocumentUrl,
    setIdDocumentUrl,
    idExpiryDate,
    setIdExpiryDate,
    idDocumentExpired,
    setIdDocumentExpired,

    // OCR and scanner
    ocrEnabled,
    setOcrEnabled,
    showScanner,
    setShowScanner,
    lastScannedSlot,
    setLastScannedSlot,

    // Other UI
    showLegend,
    setShowLegend,
    selectedResource,
    setSelectedResource,
    isDarkMode,
    setIsDarkMode,

    // Helper functions
    resetGuestDetails,
    getGuestDetails
  };
}

