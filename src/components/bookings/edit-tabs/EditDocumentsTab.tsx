"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  DocumentIcon
} from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export interface EditDocumentsTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  onUpdate: (data: Partial<EditBookingFormData>) => void;
}

interface ReservationDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  tag: string;
  createdAt: string;
  uploader: {
    id: string;
    name: string | null;
    email: string;
  };
}

const EditDocumentsTab: React.FC<EditDocumentsTabProps> = ({
  reservationData
}) => {
  const [documents, setDocuments] = useState<ReservationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Memoize fetchDocuments to prevent unnecessary re-renders
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/reservations/${reservationData.id}/documents`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [reservationData.id, toast]);

  // Fetch documents when reservation ID changes
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Memoize helper functions to prevent unnecessary re-creation
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const handleDownload = useCallback((url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

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
            <div className="w-full max-w-3xl bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reservationData.idDocumentUrl}
                alt="ID Document"
                className="w-full h-auto"
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

        {/* Document List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="min-h-[100px] bg-gray-50 dark:!bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 p-6 flex items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading documents...
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="min-h-[100px] bg-gray-50 dark:!bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 p-6 flex items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                No additional documents uploaded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Document Preview/Icon */}
                    <div className="flex-shrink-0">
                      {doc.mimeType.startsWith("image/") ? (
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded overflow-hidden">
                          <Image
                            src={doc.url}
                            alt={doc.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center">
                          <DocumentIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {doc.name}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                              {doc.tag.replace(/_/g, " ")}
                            </span>
                            <span>{formatFileSize(doc.size)}</span>
                            <span>
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                            <span>
                              by {doc.uploader.name || doc.uploader.email}
                            </span>
                          </div>
                        </div>

                        {/* Download Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc.url, doc.name)}
                          className="flex-shrink-0"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Categories */}
      <div className="bg-gray-50 dark:!bg-[#253141] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Document Categories
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">ID_DOCUMENT:</span> Identity documents
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
    </div>
  );
};

export default EditDocumentsTab;
