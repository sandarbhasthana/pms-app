"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";

interface EditFolioTabProps {
  reservationData: EditReservationData;
    formData: EditBookingFormData;
    onUpdate: (data: Partial<EditBookingFormData>) => void;
}

const EditFolioTab: React.FC<EditFolioTabProps> = ({
  // reservationData,
  // formData,
  // onUpdate
}) => {
  return (
    <div className="space-y-6">
      {/* Folio Actions */}
      <div className="flex items-center gap-4">
        {/* ADD/REFUND PAYMENT Dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 text-sm justify-between bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-sm"
            >
              <span>ADD/REFUND PAYMENT</span>
              <ChevronDownIcon className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="z-[10000]"
            sideOffset={5}
          >
            <DropdownMenuItem
              onClick={() => console.log("Add Payment clicked")}
            >
              Add Payment
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Refund Payment clicked")}
            >
              Refund Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ADD/ADJUST CHARGE Dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 text-sm justify-between bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-sm"
            >
              <span>ADD/ADJUST CHARGE</span>
              <ChevronDownIcon className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="z-[10000]"
            sideOffset={5}
          >
            <DropdownMenuItem
              onClick={() => console.log("Adjust Charge clicked")}
            >
              Adjust Charge
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add Exclusive Tax/Fee clicked")}
            >
              Add Exclusive Tax/Fee
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add Room Revenue clicked")}
            >
              Add Room Revenue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add Cancellation Fee clicked")}
            >
              Add Cancellation Fee
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add No Show Fee clicked")}
            >
              Add No Show Fee
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folio Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Folio Summary
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              Room Charges:
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹5,000.00
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              Taxes & Fees:
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹900.00
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Add-ons:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹800.00
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                Payments:
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                -₹2,000.00
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span className="text-gray-900 dark:text-gray-100">
                Outstanding Balance:
              </span>
              <span className="text-red-600 dark:text-red-400">₹4,700.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Transaction History
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Room Charge - Deluxe Room
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aug 31, 2025 • 2 nights
              </p>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹5,000.00
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                GST (18%)
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aug 31, 2025
              </p>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹900.00
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Extra Bed
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aug 31, 2025 • 2 nights
              </p>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ₹1,000.00
            </span>
          </div>

          <div className="flex justify-between items-center py-2">
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">
                Advance Payment
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aug 30, 2025 • Card Payment
              </p>
            </div>
            <span className="font-medium text-green-600 dark:text-green-400">
              -₹2,000.00
            </span>
          </div>
        </div>
      </div>

      {/* Placeholder Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>Note:</strong> This is a placeholder implementation. Full
          folio functionality with Stripe integration will be implemented in
          later phases according to the Folio Creation Plan.
        </p>
      </div>
    </div>
  );
};

export default EditFolioTab;
