"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";

export interface EditCardsTabProps {
    reservationData: EditReservationData;
    formData: EditBookingFormData;
    onUpdate: (data: Partial<EditBookingFormData>) => void;
}

const EditCardsTab: React.FC<EditCardsTabProps> = ({
  // reservationData,
  // formData,
  // onUpdate
}) => {
  return (
    <div className="space-y-6">
      {/* Add New Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Payment Methods
          </h3>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>
        
        <div className="text-center py-12">
          <CreditCardIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Payment Methods
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add a payment method to process payments for this reservation.
          </p>
          <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50">
            Add First Card
          </Button>
        </div>
      </div>

      {/* Stripe Integration Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Secure Payment Processing
        </h4>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Payment methods are securely processed through Stripe. Card details are never stored on our servers.
        </p>
      </div>

      {/* Placeholder Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          <strong>Coming Soon:</strong> Stripe Elements integration for secure card collection, payment method management, and SetupIntent handling will be implemented in Phase 5 of the Folio Creation Plan.
        </p>
      </div>
    </div>
  );
};

export default EditCardsTab;
