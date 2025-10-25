"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";
import CreditCardDisplay from "@/components/cards/CreditCardDisplay";
import AddCardModal from "@/components/cards/AddCardModal";
import { toast } from "sonner";

export interface EditCardsTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  onUpdate: (data: Partial<EditBookingFormData>) => void;
}

interface PaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
  gradientIndex?: number;
  createdAt: string;
}

const EditCardsTab: React.FC<EditCardsTabProps> = ({
  reservationData
  // formData and onUpdate not needed for card display
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/reservations/${reservationData.id}/payment-methods`
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      } else {
        // If not ok, still set empty array (e.g., for cash payments)
        setPaymentMethods([]);
      }
    } catch {
      // Don't show error toast - it's normal for cash/bank transfer payments
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  }, [reservationData.id]);

  // Fetch payment methods on mount
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleDeleteCard = async (methodId: string) => {
    try {
      const response = await fetch(
        `/api/reservations/${reservationData.id}/payment-methods/${methodId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Card deleted successfully");
        await fetchPaymentMethods();
      } else {
        toast.error("Failed to delete card");
      }
    } catch {
      toast.error("Error deleting card");
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      // Update all cards to not default, then set this one as default
      const response = await fetch(
        `/api/reservations/${reservationData.id}/payment-methods/${methodId}/set-default`,
        { method: "PATCH" }
      );

      if (response.ok) {
        toast.success("Default card updated");
        // Add a small delay to ensure database is updated
        await new Promise((resolve) => setTimeout(resolve, 300));
        await fetchPaymentMethods();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to set default card");
      }
    } catch {
      toast.error("Error setting default card");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Payment Methods
          </h3>
          <Button
            onClick={() => setIsAddCardModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading cards...
            </span>
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCardIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Payment Methods
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add a payment method to process payments for this reservation.
            </p>
            <Button
              onClick={() => setIsAddCardModalOpen(true)}
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              Add First Card
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentMethods.map((method) => (
                <CreditCardDisplay
                  key={method.id}
                  brand={method.brand}
                  last4={method.last4}
                  expMonth={method.expMonth}
                  expYear={method.expYear}
                  isDefault={method.isDefault}
                  onDelete={() => handleDeleteCard(method.id)}
                  onSetDefault={() => handleSetDefault(method.id)}
                  showActions={true}
                  gradientIndex={
                    method.gradientIndex ? method.gradientIndex + 1 : 1
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stripe Integration Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Secure Payment Processing
        </h4>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Payment methods are securely processed through Stripe. Card details
          are never stored on our servers.
        </p>
      </div>

      {/* Placeholder Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          <strong>Coming Soon:</strong> Stripe Elements integration for secure
          card collection, payment method management, and SetupIntent handling
          will be implemented in Phase 5 of the Folio Creation Plan.
        </p>
      </div>

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onCardAdded={() => {
          setIsAddCardModalOpen(false);
          // Small delay to ensure card is saved before refetching
          setTimeout(() => {
            fetchPaymentMethods();
          }, 500);
        }}
        reservationId={reservationData.id}
      />
    </div>
  );
};

export default EditCardsTab;
