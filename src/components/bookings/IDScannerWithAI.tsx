"use client";

import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { XMarkIcon, CameraIcon } from "@heroicons/react/24/outline";
import { cropFaceFromDocument } from "@/lib/utils/image-processing";
import Image from "next/image";

interface ProcessedIDData {
  fullName: string;
  idType: "passport" | "ssn" | "driving_license" | "national_id" | "other";
  idNumber: string;
  issuingCountry: string;
  expiryDate: string;
  isExpired: boolean;
  daysUntilExpiry: number;
  facePhotoLocation: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  confidence: number;
}

interface ScanResult {
  croppedFaceBase64: string | null;
  fullDocumentBase64: string;
  extractedData: ProcessedIDData;
}

interface IDScannerWithAIProps {
  onComplete: (result: ScanResult) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

export default function IDScannerWithAI({
  onComplete,
  onError,
  onClose
}: IDScannerWithAIProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [extractedData, setExtractedData] = useState<ProcessedIDData | null>(
    null
  );
  const [croppedFace, setCroppedFace] = useState<string | null>(null);
  const [warning, setWarning] = useState<string>("");

  const handleCapture = async () => {
    if (!webcamRef.current) return;

    try {
      setIsProcessing(true);
      setProcessingStep("Capturing document...");

      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }

      setCapturedImage(imageSrc);
      setProcessingStep("Analyzing ID document with AI...");

      // Call OpenAI API
      const response = await fetch("/api/ai/process-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentImageBase64: imageSrc,
          imageType: "image/jpeg"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process ID document");
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to extract data from ID");
      }

      setExtractedData(result.data);
      setWarning(result.warning || "");

      // Try to crop face if coordinates are available
      let croppedFaceImage: string | null = null;
      if (result.data.facePhotoLocation) {
        try {
          setProcessingStep("Extracting face photo...");
          croppedFaceImage = await cropFaceFromDocument(
            imageSrc,
            result.data.facePhotoLocation
          );
          setCroppedFace(croppedFaceImage);
        } catch (cropError) {
          console.error("Failed to crop face:", cropError);
          setWarning(
            (prev) =>
              prev +
              (prev ? " " : "") +
              "⚠️ Failed to extract face photo. You can upload manually."
          );
        }
      } else {
        setWarning(
          (prev) =>
            prev +
            (prev ? " " : "") +
            "⚠️ No face photo detected on document. You can upload manually."
        );
      }

      setIsProcessing(false);
      setProcessingStep("");

      // Check if document is expired
      if (result.data.isExpired) {
        setShowExpiredDialog(true);
      } else {
        setShowConfirmDialog(true);
      }
    } catch (error) {
      console.error("Error processing ID:", error);
      setIsProcessing(false);
      setProcessingStep("");
      const err =
        error instanceof Error
          ? error
          : new Error("Unknown error processing ID");
      onError(err);
    }
  };

  const handleProceedAnyway = () => {
    setShowExpiredDialog(false);
    setShowConfirmDialog(true);
  };

  const handleRetry = () => {
    setShowExpiredDialog(false);
    setCapturedImage(null);
    setExtractedData(null);
    setCroppedFace(null);
    setWarning("");
  };

  const handleConfirm = () => {
    if (!extractedData || !capturedImage) return;

    onComplete({
      croppedFaceBase64: croppedFace,
      fullDocumentBase64: capturedImage,
      extractedData
    });

    setShowConfirmDialog(false);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    handleRetry();
  };

  return (
    <>
      {/* Main Scanner Dialog */}
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Scan ID Document
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isProcessing}
              title="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Camera/Preview Area */}
          <div className="relative bg-black aspect-video">
            {!capturedImage ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "environment",
                    width: 1280,
                    height: 720
                  }}
                  className="w-full h-full object-contain"
                />
                {/* Document Frame Guide Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-white/50 rounded-lg w-4/5 h-3/4 shadow-lg">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                      Position ID document within frame
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image
                  src={capturedImage}
                  alt="Captured ID"
                  width={1280}
                  height={720}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
                <p className="text-white text-lg font-medium">
                  {processingStep}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-center gap-4">
            {!capturedImage ? (
              <>
                <Button
                  onClick={handleCapture}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Capture Document
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={handleRetry}
                variant="outline"
                size="lg"
                disabled={isProcessing}
              >
                Retake Photo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expired Document Alert Dialog */}
      <AlertDialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              ⚠️ Document Expired
            </AlertDialogTitle>
            <AlertDialogDescription>
              {extractedData && (
                <>
                  This document expired{" "}
                  <strong>
                    {Math.abs(extractedData.daysUntilExpiry)} days ago
                  </strong>{" "}
                  on <strong>{extractedData.expiryDate}</strong>.
                  <br />
                  <br />
                  Do you want to proceed anyway?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExpiredDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetry}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Retake Photo
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleProceedAnyway}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Extracted Information</DialogTitle>
            <DialogDescription>
              Please verify the information extracted from the ID document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning Messages */}
            {warning && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {warning}
                </p>
              </div>
            )}

            {/* Cropped Face Preview */}
            {croppedFace && (
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                  <Image
                    src={croppedFace}
                    alt="Cropped face"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Extracted Data */}
            {extractedData && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {extractedData.fullName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ID Type
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 capitalize">
                    {extractedData.idType.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ID Number
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {extractedData.idNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Issuing Country
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {extractedData.issuingCountry}
                  </p>
                </div>
                {extractedData.expiryDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expiry Date
                    </label>
                    <p
                      className={`text-base ${
                        extractedData.isExpired
                          ? "text-red-600 dark:text-red-400"
                          : extractedData.daysUntilExpiry <= 30
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {extractedData.expiryDate}
                      {extractedData.isExpired && " (Expired)"}
                      {!extractedData.isExpired &&
                        extractedData.daysUntilExpiry <= 30 &&
                        ` (${extractedData.daysUntilExpiry} days left)`}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confidence
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {Math.round(extractedData.confidence * 100)}%
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleCancel} variant="outline">
              Retry
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Confirm & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
