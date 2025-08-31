"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DocumentIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

interface EditDocumentsTabProps {
  reservationData: any;
  formData: any;
  onUpdate: (data: any) => void;
}

const EditDocumentsTab: React.FC<EditDocumentsTabProps> = ({
  reservationData,
  formData,
  onUpdate
}) => {
  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Documents & Files
          </h3>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
        
        {/* Drag & Drop Area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Upload Documents
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50">
            Choose Files
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Supports: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Uploaded Documents
        </h3>
        
        <div className="text-center py-12">
          <DocumentIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Documents
          </h4>
          <p className="text-gray-500 dark:text-gray-400">
            Upload documents related to this reservation.
          </p>
        </div>
      </div>

      {/* Document Categories */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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

      {/* Placeholder Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          <strong>Coming Soon:</strong> S3 pre-signed URL upload, document preview, download, and tagging functionality will be implemented in Phase 3 of the Folio Creation Plan.
        </p>
      </div>
    </div>
  );
};

export default EditDocumentsTab;
