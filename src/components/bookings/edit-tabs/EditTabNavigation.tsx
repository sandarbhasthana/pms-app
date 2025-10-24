"use client";

import React from "react";
import {
  UserIcon,
  PlusCircleIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { EditTabNavigationProps, EditBookingTab } from "./types";

// Add CSS for unsaved changes text - more specific selector to override global dark mode styles
const unsavedChangesStyle = `
  .dark .unsaved-changes-text {
    color: #FFFF80 !important;
  }
  .light .unsaved-changes-text {
    color: #F00 !important;
  }
  .unsaved-changes-text {
    color: #F00;
  }
`;

const EditTabNavigation: React.FC<EditTabNavigationProps> = ({
  activeTab,
  setActiveTab,
  hasUnsavedChanges
}) => {
  const tabConfig = {
    details: {
      id: "details" as EditBookingTab,
      label: "Details",
      icon: UserIcon,
      description: "Guest & Booking Information"
    },
    addons: {
      id: "addons" as EditBookingTab,
      label: "Add-ons",
      icon: PlusCircleIcon,
      description: "Additional Services"
    },
    folio: {
      id: "folio" as EditBookingTab,
      label: "Folio",
      icon: DocumentTextIcon,
      description: "Charges & Transactions"
    },
    cards: {
      id: "cards" as EditBookingTab,
      label: "Cards",
      icon: CreditCardIcon,
      description: "Payment Methods"
    },
    documents: {
      id: "documents" as EditBookingTab,
      label: "Documents",
      icon: FolderIcon,
      description: "Files & Attachments"
    },
    notes: {
      id: "notes" as EditBookingTab,
      label: "Notes",
      icon: ClipboardDocumentListIcon,
      description: "Internal Notes"
    },
    audit: {
      id: "audit" as EditBookingTab,
      label: "Audit Trail",
      icon: ClockIcon,
      description: "Reservation Activity"
    },
    payment: {
      id: "payment" as EditBookingTab,
      label: "Payment",
      icon: CreditCardIcon,
      description: "Payment Summary"
    }
  };

  return (
    <>
      <style>{unsavedChangesStyle}</style>
      <div className="space-y-4">
        {/* Horizontal Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-1 overflow-x-auto">
            {Object.values(tabConfig).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-t-lg ${
                    isActive
                      ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-purple-100/80 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Layout - Simplified */}
        <div className="block md:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as EditBookingTab)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {Object.values(tabConfig).map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Unsaved Changes Indicator - More Prominent */}
        {hasUnsavedChanges && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent rounded-lg font-semibold text-sm text-red-500 dark:!text-amber-300">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-red-500 dark:!text-[#FFFF80]" />
            <span className="unsaved-changes-text">
              Unsaved Changes - Click &quot;SAVE CHANGES&quot; button to Apply
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default EditTabNavigation;
