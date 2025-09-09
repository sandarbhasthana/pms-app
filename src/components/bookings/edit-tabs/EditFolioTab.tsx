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

const EditFolioTab: React.FC<EditFolioTabProps> = (
  {
    // reservationData,
    // formData,
    // onUpdate
  }
) => {
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
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
            >
              Add Payment
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Refund Payment clicked")}
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
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
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
            >
              Adjust Charge
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add Exclusive Tax/Fee clicked")}
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
            >
              Add Exclusive Tax/Fee
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add Room Revenue clicked")}
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
            >
              Add Room Revenue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add Cancellation Fee clicked")}
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
            >
              Add Cancellation Fee
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log("Add No Show Fee clicked")}
              className="hover:bg-purple-100/80 dark:hover:bg-purple-900/30 focus:bg-purple-100/80 dark:focus:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 focus:text-purple-700 dark:focus:text-purple-300"
            >
              Add No Show Fee
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folio Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Folio Summary
        </h3>

        <div className="grid grid-cols-[1fr_auto] gap-y-1.5">
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">
            Room Charges
          </span>
          <span className="text-base font-mono font-semibold text-gray-900 dark:text-gray-100 justify-self-end">
            ₹5,000.00
          </span>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Taxes & Fees
          </span>
          <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300 justify-self-end">
            ₹900.00
          </span>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Add-ons
          </span>
          <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300 justify-self-end">
            ₹800.00
          </span>

          <div className="col-span-2 border-t border-gray-200 dark:border-gray-600 my-1"></div>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Payments
          </span>
          <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400 justify-self-end">
            -₹2,000.00
          </span>

          <div className="col-span-2 flex justify-between items-center py-3 border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:!bg-gray-700/50 rounded-lg px-4 mt-2">
            <span className="text-[17px] font-bold text-gray-900 dark:text-white">
              Outstanding Balance
            </span>
            <span className="text-[19px] font-mono font-bold text-red-600 dark:text-red-400">
              ₹4,700.00
            </span>
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
