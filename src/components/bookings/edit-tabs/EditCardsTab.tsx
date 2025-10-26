"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // Store fetch function in ref so it can be called from event handlers
  const fetchPaymentMethodsRef = useRef<() => Promise<void>>(async () => {});

  // Fetch payment methods on mount and when reservation ID changes
  useEffect(() => {
    const fetchPaymentMethods = async () => {
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
    };

    // Store the fetch function in ref for use in event handlers
    fetchPaymentMethodsRef.current = fetchPaymentMethods;

    fetchPaymentMethods();
  }, [reservationData.id]);

  const handleDeleteCard = useCallback(
    async (methodId: string) => {
      try {
        const response = await fetch(
          `/api/reservations/${reservationData.id}/payment-methods/${methodId}`,
          { method: "DELETE" }
        );

        if (response.ok) {
          toast.success("Card deleted successfully");
          await fetchPaymentMethodsRef.current();
        } else {
          toast.error("Failed to delete card");
        }
      } catch {
        toast.error("Error deleting card");
      }
    },
    [reservationData.id]
  );

  const handleSetDefault = useCallback(
    async (methodId: string) => {
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
          await fetchPaymentMethodsRef.current();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to set default card");
        }
      } catch {
        toast.error("Error setting default card");
      }
    },
    [reservationData.id]
  );

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

      {/* Secure Payment Processing Footer */}
      <div className="flex items-center justify-center gap-5 mt-5 py-3 px-6 border-t border-gray-200 dark:border-gray-700">
        {/* 256-bit SSL */}
        {/* <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 512 512"
          className="h-12 w-12 [&_path[fill='#7210a2']]:dark:fill-[#8b4aff]"
        >
          <g>
            <path
              fill="#382b73"
              d="M361.68 244.68c-.965-6.434-5.594-11.64-11.707-13.57-1.028-.325-2.188-.583-3.278-.645-.582-.067-1.16-.067-1.738-.067h-5.98v-39.363c0-45.734-37.243-82.976-82.977-82.976s-82.977 37.242-82.977 82.976v39.3h-5.98c-.578 0-1.156 0-1.738.063-1.157.13-2.25.325-3.278.645-6.113 1.867-10.68 7.14-11.707 13.57a16.73 16.73 0 0 0-.195 2.575v146.269c0 1.477.195 2.895.516 4.242.195.836.449 1.61.773 2.383 2.57 6.043 8.555 10.29 15.566 10.29h-1.03v.644c0 4.05 1.284 7.78 3.472 10.87.195.321.453.579.644.837.063.062.13.191.192.257a18.487 18.487 0 0 0 14.281 6.688H327.4a18.485 18.485 0 0 0 14.277-6.688c.066-.066.129-.128.195-.257.254-.258.45-.578.64-.836 2.188-3.024 3.473-6.82 3.473-10.871v-.645h-1.093c7.011 0 12.996-4.246 15.566-10.289.324-.773.582-1.547.773-2.383a18.31 18.31 0 0 0 .516-4.242V247.254c.129-.902.063-1.738-.066-2.574zm-160.032-53.645c0-29.972 24.38-54.351 54.352-54.351s54.352 24.379 54.352 54.351v39.3H201.648zm0 0"
            />
            <path
              fill="#7210a2"
              d="M344.957 397.57H167.043c-9.328 0-16.918-7.59-16.918-16.914v-146.27c0-9.323 7.59-16.913 16.918-16.913h177.914c9.328 0 16.918 7.59 16.918 16.914v146.27c0 9.323-7.59 16.913-16.918 16.913zm0 0"
            />
            <path
              fill="#7210a2"
              d="M344.957 217.473H167.043c-9.328 0-16.918 7.59-16.918 16.914v7.14c0-9.328 7.59-16.918 16.918-16.918h177.914c9.328 0 16.918 7.59 16.918 16.918v-7.14c0-9.325-7.59-16.914-16.918-16.914zm0 0"
            />
            <path
              fill="#7210a2"
              d="M344.957 383.227H167.043c-9.328 0-16.918-7.59-16.918-16.914v14.277c0 9.328 7.59 16.918 16.918 16.918h177.914c9.328 0 16.918-7.59 16.918-16.918v-14.278c0 9.391-7.59 16.915-16.918 16.915zm0 0"
            />
            <path
              fill="#ffffff"
              d="M327.46 416.805H184.54c-10.294 0-18.653-8.364-18.653-18.653v-.644h180.097v.644c.067 10.29-8.296 18.653-18.523 18.653zm0 0"
            />
            <path
              fill="#d1d3d4"
              d="M327.46 407.156H184.54c-7.013 0-13.122-3.86-16.34-9.648h-2.25v.644c0 10.29 8.363 18.653 18.652 18.653H327.46c10.293 0 18.652-8.364 18.652-18.653v-.644h-2.312c-3.219 5.789-9.328 9.648-16.34 9.648zm0 0"
            />
            <path
              fill="#ffffff"
              d="M338.977 217.473h-28.625v-39.301c0-29.977-24.38-54.352-54.352-54.352s-54.352 24.375-54.352 54.352v39.3h-28.625v-39.3c0-45.734 37.243-82.977 82.977-82.977s82.977 37.243 82.977 82.977zm0 0"
            />
            <path
              fill="#d1d3d4"
              d="M256 109.477c-37.95 0-68.695 30.746-68.695 68.695v39.3h14.277v-39.3c0-29.977 24.379-54.352 54.356-54.352 29.972 0 54.351 24.375 54.351 54.352v39.3h14.277v-39.3c.13-37.95-30.617-68.695-68.566-68.695zm0 0"
            />
            <path
              fill="#7210a2"
              d="M150.125 246.094h211.684v5.02H150.125zM150.125 363.934h211.684v5.015H150.125zm0 0"
            />
            <path
              fill="#ffffff"
              d="M353.191 340.066h8.684v-7.203h-8.684c-1.609-6.625-7.59-11.511-14.73-11.511-8.363 0-15.117 6.816-15.117 15.113 0 8.363 6.82 15.18 15.117 15.18 7.14 0 13.121-4.95 14.73-11.579zm-21.484-3.601a6.753 6.753 0 0 1 6.754-6.754 6.753 6.753 0 0 1 6.754 6.754 6.753 6.753 0 0 1-6.754 6.754 6.753 6.753 0 0 1-6.754-6.754zM353.191 282.18h8.684v-7.203h-8.684c-1.609-6.625-7.59-11.516-14.73-11.516-8.363 0-15.117 6.82-15.117 15.18 0 8.363 6.82 15.117 15.117 15.117 7.14 0 13.121-4.953 14.73-11.578zm-21.484-3.602a6.753 6.753 0 0 1 6.754-6.754 6.754 6.754 0 1 1-6.754 6.754zM331.836 311.125h30.039v-7.207h-30.04c-1.608-6.625-7.589-11.512-14.73-11.512-8.363 0-15.18 6.817-15.18 15.18s6.817 15.18 15.18 15.18c7.141-.063 13.122-5.016 14.73-11.641zm-21.484-3.602c0-3.734 3.023-6.753 6.753-6.753s6.754 3.02 6.754 6.753c0 3.73-3.023 6.75-6.754 6.75s-6.753-3.02-6.753-6.75zM282.82 304.629c-3.148-3.668-7.394-5.535-12.668-5.535-2.64 0-5.02.453-7.27 1.351.708-1.605 1.61-3.023 2.7-4.246.066-.062.195-.191.258-.254 2.765-2.832 6.496-4.183 11.515-4.183h3.602v-9.778h-4.18c-8.234.13-14.73 2.961-19.363 8.493-4.437 5.34-6.687 12.863-6.687 22.32v4.05c0 6.11 1.734 11.258 5.144 15.18 3.54 4.118 8.168 6.176 13.766 6.176 3.472 0 6.558-.902 9.261-2.637 2.704-1.738 4.825-4.18 6.239-7.27 1.351-2.956 2.058-6.304 2.058-9.905.196-5.66-1.351-10.227-4.375-13.762zm-7.91 21.223c-1.351 1.738-2.957 2.511-5.082 2.511-2.57 0-4.437-.902-6.047-2.832-1.734-2.12-2.57-4.886-2.57-8.426v-2.894c.578-1.48 1.543-2.637 3.023-3.668 1.672-1.156 3.407-1.734 5.336-1.734 2.383 0 4.055.77 5.407 2.378 1.476 1.739 2.183 4.118 2.183 7.204-.062 3.152-.77 5.53-2.25 7.46zm-34.605-20.711c-3.215-3.536-7.524-5.336-12.864-5.336-1.93 0-3.796.254-5.468.707l.836-8.235h21.293v-10.035h-30.426l-2.957 29.266 7.394 2.125 1.29-1.16c1.222-1.09 2.378-1.864 3.406-2.184 1.093-.387 2.382-.582 3.925-.582 2.57 0 4.375.711 5.79 2.316 1.48 1.672 2.187 3.86 2.187 6.692 0 3.344-.645 5.851-1.996 7.46-1.156 1.415-2.957 2.122-5.465 2.122-2.383 0-4.184-.578-5.469-1.735-1.285-1.16-2.12-3.09-2.379-5.597l-.324-2.766H208.98l.32 3.41c.454 5.079 2.317 9.133 5.536 12.028 3.215 2.894 7.394 4.375 12.414 4.375 5.531 0 9.969-1.801 13.121-5.34 3.086-3.41 4.629-8.168 4.629-14.086.066-5.402-1.543-9.973-4.695-13.445zm-58.211 22.578 9.004-10.164c3.797-4.309 6.37-7.782 7.914-10.743 1.672-3.148 2.508-6.171 2.508-8.937 0-4.953-1.61-8.941-4.758-11.902-3.09-2.895-7.336-4.371-12.61-4.371-3.472 0-6.625.77-9.39 2.312a15.998 15.998 0 0 0-6.496 6.563c-1.48 2.703-2.25 5.789-2.25 9.003v3.153h10.289v-3.153c0-2.507.707-4.5 2.125-5.98 1.414-1.48 3.277-2.188 5.722-2.188 2.317 0 4.051.579 5.274 1.801 1.222 1.223 1.8 2.832 1.8 5.082 0 1.48-.449 3.024-1.285 4.63-.964 1.866-2.765 4.312-5.34 7.269l-17.558 19.875v7.46h36.855v-9.71zm0 0"
            />
            <path
              fill="#ffffff"
              d="M282.82 301.41c-3.148-3.664-7.394-5.531-12.668-5.531-2.64 0-5.02.45-7.27 1.351.708-1.609 1.61-3.023 2.7-4.246a8.02 8.02 0 0 0 .258-.257c2.765-2.829 6.496-4.18 11.515-4.18h3.602v-9.777h-4.18c-8.234.128-14.73 2.96-19.363 8.492-4.437 5.336-6.687 12.863-6.687 22.316v4.055c0 6.11 1.734 11.254 5.144 15.18 3.54 4.117 8.168 6.175 13.766 6.175 3.472 0 6.558-.902 9.261-2.636 2.704-1.739 4.825-4.184 6.239-7.27 1.351-2.96 2.058-6.305 2.058-9.906.196-5.66-1.351-10.227-4.375-13.766zm-7.91 21.227c-1.351 1.738-2.957 2.508-5.082 2.508-2.57 0-4.437-.899-6.047-2.829-1.734-2.125-2.57-4.89-2.57-8.425v-2.895c.578-1.48 1.543-2.637 3.023-3.668 1.672-1.156 3.407-1.734 5.336-1.734 2.383 0 4.055.77 5.407 2.379 1.476 1.734 2.183 4.117 2.183 7.203-.062 3.152-.77 5.531-2.25 7.46zm-34.605-20.711c-3.215-3.54-7.524-5.34-12.864-5.34-1.93 0-3.796.258-5.468.707l.836-8.23h21.293v-10.036h-30.426l-2.957 29.266 7.394 2.125 1.29-1.16c1.222-1.094 2.378-1.863 3.406-2.188 1.093-.386 2.382-.578 3.925-.578 2.57 0 4.375.707 5.79 2.317 1.48 1.671 2.187 3.859 2.187 6.687 0 3.348-.645 5.856-1.996 7.461-1.156 1.418-2.957 2.125-5.465 2.125-2.383 0-4.184-.578-5.469-1.738-1.285-1.157-2.12-3.086-2.379-5.594l-.324-2.766H208.98l.32 3.407c.454 5.082 2.317 9.136 5.536 12.03 3.215 2.895 7.394 4.372 12.414 4.372 5.531 0 9.969-1.8 13.121-5.336 3.086-3.41 4.629-8.172 4.629-14.09.066-5.402-1.543-9.969-4.695-13.441zm-58.211 22.578 9.004-10.164c3.797-4.309 6.37-7.781 7.914-10.742 1.672-3.153 2.508-6.176 2.508-8.942 0-4.953-1.61-8.941-4.758-11.898-3.09-2.895-7.336-4.375-12.61-4.375-3.472 0-6.625.773-9.39 2.316-2.828 1.543-5.016 3.797-6.496 6.563-1.48 2.699-2.25 5.789-2.25 9.004v3.152h10.289v-3.152c0-2.508.707-4.504 2.125-5.98 1.414-1.481 3.277-2.188 5.722-2.188 2.317 0 4.051.578 5.274 1.8 1.222 1.223 1.8 2.829 1.8 5.082 0 1.477-.449 3.024-1.285 4.63-.964 1.867-2.765 4.308-5.34 7.269l-17.558 19.875v7.46h36.855v-9.71zm0 0"
            />
          </g>
        </svg> */}

        {/* PCI DSS */}
        {/* <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 64 64"
          className="h-12 w-12 [&_path[fill='#02797e']]:fill-[#7210a2] [&_path[fill='#02797e']]:dark:fill-[#8b4aff]"
        >
          <g transform="matrix(.617165 0 0 .617165 0 10.89296)">
            <path
              d="M103.7 43.2L23.4 68.4 0 4.7 84.3 0l19.4 43.2"
              fill="#02797e"
            />
            <path
              d="M43 30.4c0 1.6-.4 3-1.1 4.3-.7 1.2-1.7 2.3-3 3.1s-2.9 1.4-4.7 1.8-3.8.6-6.1.6h-1.6v8.2H16.1V21.1h12.2c4.6 0 8.2.8 10.8 2.3s3.9 3.9 3.9 7m-10 .1c0-2.4-1.8-3.6-5.3-3.6h-1.3v7.3h1.2c1.7 0 3.1-.3 4-.9.9-.5 1.4-1.5 1.4-2.8zm35.8 17.9c-1.6.3-3.4.5-5.5.5-2.9 0-5.5-.3-7.7-1-2.3-.7-4.2-1.6-5.8-2.8s-2.8-2.7-3.6-4.4c-.8-1.8-1.2-3.7-1.2-5.8s.4-4 1.3-5.8a14.38 14.38 0 0 1 3.7-4.5c1.6-1.2 3.5-2.2 5.7-2.9s4.6-1 7.2-1c2 0 3.9.1 5.6.4 1.7.4 1.7.4 3 .9v7.3c-1-.6-2.2-1.1-3.5-1.4-1.3-.4-2.7-.6-4.1-.6-2.4 0-4.3.7-5.8 1.9-1.5 1.3-2.2 3.1-2.2 5.6 0 1.2.2 2.3.7 3.3.5.9 1.1 1.7 1.9 2.3s1.7 1.1 2.8 1.4 2.2.5 3.4.5 2.5-.1 3.7-.4 2.5-.6 3.8-1.2v6.9l-3.4.8m7.7-27.3H87v27.4H76.5zm11.6-8.6c0 1.8-.6 3.3-1.8 4.3s-2.7 1.6-4.5 1.6-3.3-.5-4.5-1.6c-1.2-1-1.8-2.5-1.8-4.3 0-1.9.6-3.3 1.8-4.4s2.7-1.6 4.5-1.6 3.3.5 4.5 1.6c1.2 1 1.8 2.5 1.8 4.4"
              fill="#fff"
            />
          </g>
        </svg> */}

        {/* Stripe */}
        <svg
          id="Layer_2"
          data-name="Layer 2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 150 34"
          className="h-10 w-auto [&_path[fill='#7210a2']]:dark:fill-[#8b4aff] [&_polygon[fill='#7210a2']]:dark:fill-[#8b4aff] [&_rect[fill='#7210a2']]:dark:fill-[#8b4aff]"
        >
          <g id="Layer_1-2" data-name="Layer 1">
            <path
              d="M146,0H3.73C1.67,0,0,1.67,0,3.73h0v26.54C0,32.33,1.67,34,3.73,34h142.27c2.21,0,4-1.79,4-4V4c0-2.21-1.79-4-4-4ZM149,30c0,1.66-1.34,3-3,3H3.73c-1.51,0-2.72-1.22-2.73-2.73V3.73c0-1.51,1.22-2.72,2.73-2.73h142.27c1.66,0,3,1.34,3,3v26Z"
              fill="#7210a2"
              className="dark:fill-[#8b4aff]"
            />
            <path
              d="M17.07,11.24h-4.3v10.76h1.92v-4.16h2.38c2.4,0,3.9-1.16,3.9-3.3s-1.5-3.3-3.9-3.3ZM16.97,16.24h-2.28v-3.3h2.31c1.38,0,2.11.59,2.11,1.65s-.76,1.6-2.11,1.6l-.03.05Z"
              fill="#7210a2"
            />
            <path
              d="M25.1,14c-2.08-.02-3.79,1.64-3.81,3.73,0,.12,0,.24.01.36-.19,2.1,1.36,3.95,3.46,4.13,2.1.19,3.95-1.36,4.13-3.46.02-.22.02-.45,0-.68.18-2.07-1.35-3.89-3.42-4.08-.12-.01-.25-.02-.37-.01ZM25.1,20.67c-1.22,0-2-1-2-2.58s.76-2.58,2-2.58,2,1,2,2.58-.79,2.57-2,2.57h0Z"
              fill="#7210a2"
            />
            <polygon
              points="36.78 19.35 35.37 14.13 33.89 14.13 32.49 19.35 31.07 14.13 29.22 14.13 31.59 22.01 33.15 22.01 34.59 16.85 36.03 22.01 37.59 22.01 39.96 14.13 38.18 14.13 36.78 19.35"
              fill="#7210a2"
            />
            <path
              d="M44,14c-2.11.04-3.8,1.79-3.76,3.9,0,.06,0,.13,0,.19-.17,2.09,1.39,3.91,3.48,4.08.12,0,.23.01.35.01,1.49.08,2.86-.8,3.41-2.18l-1.49-.62c-.24.8-1,1.32-1.83,1.26-1.17.03-2.14-.9-2.17-2.07,0-.03,0-.07,0-.1h5.52v-.6c.02-2.16-1.2-3.87-3.52-3.87ZM42.07,17.13c.14-.95.97-1.65,1.93-1.63.86-.07,1.61.56,1.69,1.42,0,.07,0,.13,0,.2h-3.62Z"
              fill="#7210a2"
            />
            <path
              d="M50.69,15.3v-1.17h-1.8v7.87h1.8v-4.13c-.06-1.04.73-1.94,1.77-2,.08,0,.15,0,.23,0,.22-.02.44-.02.66,0v-1.8h-.51c-.9-.05-1.74.43-2.15,1.23Z"
              fill="#7210a2"
            />
            <path
              d="M57.48,14c-2.11.04-3.8,1.79-3.76,3.9,0,.06,0,.13,0,.19-.17,2.09,1.39,3.91,3.48,4.08.12,0,.23.01.35.01,1.47.06,2.82-.81,3.37-2.18l-1.54-.59c-.24.8-1,1.32-1.83,1.26-1.17-.01-2.11-.97-2.1-2.14,0-.01,0-.02,0-.03h5.54v-.6c0-2.19-1.24-3.9-3.52-3.9ZM55.55,17.13c.15-.94.97-1.63,1.92-1.62.86-.07,1.61.56,1.69,1.42,0,.07,0,.13,0,.2h-3.61Z"
              fill="#7210a2"
            />
            <path
              d="M67.56,15c-.56-.66-1.39-1.03-2.26-1-2.21,0-3.47,1.85-3.47,4.09s1.26,4.09,3.47,4.09c.87.03,1.7-.34,2.26-1v.82h1.8v-10.76h-1.8v3.76ZM67.56,18.35c.15,1.09-.61,2.11-1.7,2.26-.1.01-.2.02-.3.02-1.31,0-2-1-2-2.52s.7-2.52,2-2.52c1.11,0,2,.81,2,2.29v.47Z"
              fill="#7210a2"
            />
            <path
              d="M79.31,14c-.88-.04-1.73.33-2.31,1v-3.76h-1.8v10.76h1.8v-.83c.57.66,1.4,1.03,2.27,1,2.2,0,3.46-1.86,3.46-4.09s-1.22-4.08-3.42-4.08ZM79,20.6c-1.1.01-2.01-.88-2.02-1.98,0-.1,0-.2.02-.3v-.47c0-1.48.84-2.29,2-2.29,1.3,0,2,1,2,2.52s-.75,2.52-2,2.52Z"
              fill="#7210a2"
            />
            <path
              d="M86.93,19.66l-1.93-5.53h-1.9l2.9,7.59-.3.74c-.11.53-.61.88-1.14.79-.2.01-.4.01-.6,0v1.51c.24.04.49.05.73.05,1.29.09,2.46-.75,2.78-2l3.24-8.62h-1.89l-1.89,5.47Z"
              fill="#7210a2"
            />
            <path
              d="M125,12.43c-.8,0-1.56.31-2.13.87l-.14-.69h-2.39v12.92l2.72-.59v-3.13c.54.45,1.22.7,1.93.7,1.94,0,3.72-1.59,3.72-5.11,0-3.22-1.8-4.97-3.71-4.97ZM124.35,20.06c-.48.03-.95-.16-1.28-.52v-4.11c.33-.37.81-.57,1.3-.55,1,0,1.68,1.13,1.68,2.58s-.69,2.6-1.7,2.6Z"
              fill="#7210a2"
            />
            <path
              d="M133.73,12.43c-2.62,0-4.21,2.26-4.21,5.11,0,3.37,1.88,5.08,4.56,5.08,1.05.02,2.08-.23,3-.73v-2.25c-.84.42-1.76.63-2.7.62-1.08,0-2-.39-2.14-1.7h5.38v-1c.09-2.87-1.27-5.13-3.89-5.13ZM132.26,16.5c0-1.26.77-1.79,1.45-1.79s1.4.53,1.4,1.79h-2.85Z"
              fill="#7210a2"
            />
            <path
              d="M113,13.36l-.17-.82h-2.32v9.71h2.68v-6.58c.5-.6,1.31-.83,2.05-.58v-2.55c-.85-.33-1.81.02-2.24.82Z"
              fill="#7210a2"
            />
            <path
              d="M99.46,15.46c0-.44.36-.61.93-.61.94.02,1.87.27,2.7.72v-2.63c-.86-.35-1.78-.52-2.7-.51-2.21,0-3.68,1.18-3.68,3.16,0,3.1,4.14,2.6,4.14,3.93,0,.52-.44.69-1,.69-1.06-.06-2.08-.37-3-.9v2.69c.94.42,1.97.64,3,.64,2.26,0,3.82-1.15,3.82-3.16-.05-3.36-4.21-2.76-4.21-4.02Z"
              fill="#7210a2"
            />
            <path
              d="M107.28,10.24l-2.65.58v8.93c-.06,1.53,1.14,2.81,2.67,2.87.05,0,.1,0,.15,0,.66.03,1.31-.1,1.91-.37v-2.25c-.35.15-2.06.66-2.06-1v-4h2.06v-2.34h-2.06l-.02-2.42Z"
              fill="#7210a2"
            />
            <polygon
              points="116.25 11.7 118.98 11.13 118.98 8.97 116.25 9.54 116.25 11.7"
              fill="#7210a2"
            />
            <rect
              x="116.25"
              y="12.61"
              width="2.73"
              height="9.64"
              fill="#7210a2"
            />
          </g>
        </svg>
      </div>

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onCardAdded={() => {
          setIsAddCardModalOpen(false);
          // Small delay to ensure card is saved before refetching
          setTimeout(() => {
            fetchPaymentMethodsRef.current();
          }, 500);
        }}
        reservationId={reservationData.id}
      />
    </div>
  );
};

export default EditCardsTab;
