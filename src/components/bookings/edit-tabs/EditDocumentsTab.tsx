"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";
import Image from "next/image";

export interface EditDocumentsTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  onUpdate: (data: Partial<EditBookingFormData>) => void;
}

const EditDocumentsTab: React.FC<EditDocumentsTabProps> = ({
  reservationData
}) => {
  return (
    <div className="space-y-6">
      {/* ID Document Section */}
      {reservationData.idDocumentUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ID Document
            </h3>
            {reservationData.idDocumentExpired && (
              <span className="text-xs font-semibold px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                ⚠️ Expired
              </span>
            )}
          </div>

          {/* ID Document Image */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-md bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <Image
                src={reservationData.idDocumentUrl}
                alt="ID Document"
                width={400}
                height={300}
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Document Info */}
            <div className="w-full space-y-2 text-sm">
              {reservationData.idType && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    ID Type:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {reservationData.idType}
                  </span>
                </div>
              )}
              {reservationData.idNumber && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    ID Number:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {reservationData.idNumber}
                  </span>
                </div>
              )}
              {reservationData.issuingCountry && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Issuing Country:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {reservationData.issuingCountry}
                  </span>
                </div>
              )}
              {reservationData.idExpiryDate && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Expiry Date:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(
                      reservationData.idExpiryDate
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Additional Documents
          </h3>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Drag & Drop Area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-transparent">
          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Upload Documents
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <Button
            variant="outline"
            className="border-purple-200 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          >
            Choose Files
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Supports: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
          </p>
        </div>

        {/* Document List Placeholder */}
        <div className="mt-6 min-h-[100px] bg-gray-50 dark:!bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No documents uploaded yet. Upload documents using the area above.
          </p>
        </div>
      </div>

      {/* Document Categories */}
      <div className="bg-gray-50 dark:!bg-[#253141] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Document Categories
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">ID_SCAN:</span> Identity documents
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">INVOICE:</span> Billing documents
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">CONTRACT:</span> Agreements
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">OTHER:</span> Miscellaneous
          </div>
        </div>
      </div>

      {/* Implementation Notice */}
      <div className="bg-blue-50 dark:!bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          <strong>📋 Implementation Status:</strong> S3 integration is complete
          and functional. Document upload UI, preview, download, tagging, and
          database persistence (ReservationDocument model) will be implemented
          in Phase 3 of the Folio Creation Plan.
        </p>
      </div>
    </div>
  );
};

export default EditDocumentsTab;
