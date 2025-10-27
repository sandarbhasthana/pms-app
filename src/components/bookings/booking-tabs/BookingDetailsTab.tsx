"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { BookingTabProps, SelectedSlot } from "./types";
import {
  CameraIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import IDScannerWithEdgeRefinement from "@/components/bookings/IDScannerWithEdgeRefinement";
import { uploadGuestImages, resizeImage } from "@/lib/utils/image-processing";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Type for extracted ID data
interface ExtractedIDData {
  fullName: string;
  idType: string;
  idNumber: string;
  issuingCountry: string;
  expiryDate: string;
  isExpired: boolean;
  confidence: number;
  facePhotoLocation?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Extended props for details tab to include scanner functionality
interface BookingDetailsTabProps extends BookingTabProps {
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  setOcrEnabled: (v: boolean) => void;
  handleScanComplete: (result: {
    idNumber: string;
    fullName: string;
    issuingCountry: string;
    idType?: string;
    guestImageUrl?: string;
    idDocumentUrl?: string;
    idExpiryDate?: string;
    idDocumentExpired?: boolean;
  }) => void;
  handleScanError: (err: Error) => void;
  setLastScannedSlot: (slot: SelectedSlot | null) => void;
}

export const BookingDetailsTab: React.FC<BookingDetailsTabProps> = ({
  formData,
  updateFormData,
  selectedSlot,
  onNext,
  showScanner,
  setShowScanner,
  setOcrEnabled,
  handleScanComplete,
  handleScanError,
  setLastScannedSlot
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [extractedDataForConfirm, setExtractedDataForConfirm] =
    useState<ExtractedIDData | null>(null);
  const [croppedImageForConfirm, setCroppedImageForConfirm] = useState<
    string | null
  >(null);
  const [documentImageForConfirm, setDocumentImageForConfirm] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const result = e.target?.result as string;

            // Get original image dimensions
            const img = new window.Image();
            img.onload = async () => {
              setImageDimensions({ width: img.width, height: img.height });

              // Check if image exceeds 500x500
              if (img.width > 500 || img.height > 500) {
                toast({
                  title: "Image Too Large",
                  description: `Image is ${img.width}x${img.height}px. Resizing to fit within 500x500px...`
                });

                try {
                  // Resize the image
                  const resizedImage = await resizeImage(result, 500, 500);
                  setUploadedImage(resizedImage);

                  // Get resized dimensions
                  const resizedImg = new window.Image();
                  resizedImg.onload = () => {
                    setImageDimensions({
                      width: resizedImg.width,
                      height: resizedImg.height
                    });
                    toast({
                      title: "Image Resized",
                      description: `Image resized to ${resizedImg.width}x${resizedImg.height}px`
                    });
                  };
                  resizedImg.src = resizedImage;
                } catch (resizeError) {
                  console.error("Error resizing image:", resizeError);
                  toast({
                    title: "Resize Failed",
                    description:
                      "Failed to resize image. Please try another image.",
                    variant: "destructive"
                  });
                }
              } else {
                // Image is already within limits
                setUploadedImage(result);
                toast({
                  title: "Image Loaded",
                  description: `Image size: ${img.width}x${img.height}px`
                });
              }
            };
            img.src = result;
          } catch (error) {
            console.error("Error processing image:", error);
            toast({
              title: "Error",
              description: "Failed to process image. Please try again.",
              variant: "destructive"
            });
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error reading file:", error);
        toast({
          title: "Error",
          description: "Failed to read file. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleTakePhoto = () => {
    setLastScannedSlot(selectedSlot);
    setShowScanner(true);
    setOcrEnabled(true);
  };

  const handleEdgeRefinedCapture = async (croppedImageBase64: string) => {
    try {
      setIsUploading(true);
      setShowScanner(false);

      // Show processing toast
      toast({
        title: "Processing ID Document...",
        description: "Sending to AI for data extraction..."
      });

      // Send cropped image to AI for processing
      const response = await fetch("/api/ai/process-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentImageBase64: croppedImageBase64,
          imageType: "image/jpeg"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process ID document");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to process ID document");
      }

      const extractedData = result.data;

      // Extract face from document if coordinates available
      let faceImageBase64 = croppedImageBase64;
      if (extractedData.facePhotoLocation) {
        try {
          const faceCanvas = document.createElement("canvas");
          const faceCtx = faceCanvas.getContext("2d");
          if (!faceCtx) throw new Error("Failed to get face canvas context");

          // Create a promise-based image loader
          const faceImage = await new Promise<HTMLImageElement>(
            (resolve, reject) => {
              const img = new window.Image();
              img.onload = () => resolve(img);
              img.onerror = () =>
                reject(new Error("Failed to load face image"));
              img.src = croppedImageBase64;
            }
          );

          const faceCoords = extractedData.facePhotoLocation;
          faceCanvas.width = faceCoords.width;
          faceCanvas.height = faceCoords.height;

          faceCtx.drawImage(
            faceImage,
            faceCoords.x,
            faceCoords.y,
            faceCoords.width,
            faceCoords.height,
            0,
            0,
            faceCoords.width,
            faceCoords.height
          );

          faceImageBase64 = faceCanvas.toDataURL("image/jpeg", 0.95);
        } catch (cropError) {
          console.error("Failed to crop face:", cropError);
          // Fallback to using full document as face
        }
      }

      // Store data for confirmation dialog
      setExtractedDataForConfirm(extractedData);
      setCroppedImageForConfirm(faceImageBase64);
      setDocumentImageForConfirm(croppedImageBase64);
      setShowConfirmDialog(true);
      setIsUploading(false);
    } catch (error) {
      console.error("Error processing ID document:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to process ID document. Please try again.";
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive"
      });
      const err = error instanceof Error ? error : new Error(errorMessage);
      handleScanError(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmExtraction = async () => {
    if (
      !extractedDataForConfirm ||
      !croppedImageForConfirm ||
      !documentImageForConfirm
    )
      return;

    try {
      setIsUploading(true);

      // Upload both images to S3
      toast({
        title: "Uploading images...",
        description: "Please wait while we save your images."
      });

      const { personImageUrl, documentImageUrl } = await uploadGuestImages(
        croppedImageForConfirm, // Use the extracted face
        documentImageForConfirm, // Use the refined cropped document
        extractedDataForConfirm.fullName || "guest"
      );

      // Display face image in the image placeholder
      setUploadedImage(croppedImageForConfirm);

      // Call the parent handler with all extracted data
      handleScanComplete({
        fullName: extractedDataForConfirm.fullName,
        idNumber: extractedDataForConfirm.idNumber,
        issuingCountry: extractedDataForConfirm.issuingCountry,
        idType: extractedDataForConfirm.idType,
        guestImageUrl: personImageUrl,
        idDocumentUrl: documentImageUrl,
        idExpiryDate: extractedDataForConfirm.expiryDate,
        idDocumentExpired: extractedDataForConfirm.isExpired
      });

      toast({
        title: "Success!",
        description: "ID document processed and images uploaded successfully."
      });

      setShowConfirmDialog(false);
      setExtractedDataForConfirm(null);
      setCroppedImageForConfirm(null);
      setDocumentImageForConfirm(null);
    } catch (error) {
      console.error("Error uploading images:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload images. Please try again.";
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.checkIn.trim() !== "" &&
      formData.checkOut.trim() !== "" &&
      formData.adults > 0
    );
  };

  return (
    <div className="space-y-6">
      {/* Guest Information Section - Improved Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-6">Guest Information</h3>

        {/* Compact Side-by-Side Layout */}
        <div className="flex gap-6">
          {/* Left Side: Image Upload Section */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center">
              {/* Image Preview */}
              <div className="w-32 h-32 bg-gray-100 dark:!bg-gray-700 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-gray-300 dark:border-gray-600">
                {uploadedImage ? (
                  <Image
                    src={uploadedImage}
                    alt="Uploaded ID"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 dark:bg-gray-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-32">
                <Button
                  type="button"
                  onClick={handleTakePhoto}
                  className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-700 text-white w-full text-xs py-2"
                >
                  <CameraIcon className="h-3 w-3" />
                  TAKE PHOTO
                </Button>

                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center justify-center gap-2 w-full text-xs py-2"
                >
                  <ArrowUpTrayIcon className="h-3 w-3" />
                  UPLOAD
                </Button>

                {/* Image Dimensions */}
                {imageDimensions && (
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <InformationCircleIcon className="h-3 w-3" />
                    <span>
                      {imageDimensions.width}x{imageDimensions.height}px
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Right Side: Form Fields */}
          <div className="flex-1">
            {/* Row 1: Room No. (Read only) | Guest Name */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Room No.
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {selectedSlot.roomName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateFormData({ fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-[#f0f8ff] h-10"
                />
              </div>
            </div>

            {/* Row 2: Email | Phone No. */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  placeholder="guest@example.com"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-[#f0f8ff] h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  placeholder="+1 (555) 555-5555"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-[#f0f8ff] h-10"
                />
              </div>
            </div>

            {/* Row 3: Check-in Date | Check-out Date */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => updateFormData({ checkIn: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => updateFormData({ checkOut: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                  required
                />
              </div>
            </div>

            {/* Row 4: Adults | Children */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Adults</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        adults: Math.max(1, formData.adults - 1)
                      })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{formData.adults}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({ adults: formData.adults + 1 })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Children
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        childrenCount: Math.max(0, formData.childrenCount - 1)
                      })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">
                    {formData.childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        childrenCount: formData.childrenCount + 1
                      })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Row 5: ID Type | ID Number */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  ID Type
                </label>
                <select
                  value={formData.idType}
                  onChange={(e) => updateFormData({ idType: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                >
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver&apos;s License</option>
                  <option value="national_id">National ID</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => updateFormData({ idNumber: e.target.value })}
                  placeholder="Enter ID number"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-[#f0f8ff] h-10"
                />
              </div>
            </div>

            {/* Row 6: Issuing Country */}
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Issuing Country
                </label>
                <input
                  type="text"
                  value={formData.issuingCountry}
                  onChange={(e) =>
                    updateFormData({ issuingCountry: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ID Scanner with Edge Refinement Modal */}
      <IDScannerWithEdgeRefinement
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onCapture={handleEdgeRefinedCapture}
        onError={(error) => {
          handleScanError(error);
          setShowScanner(false);
        }}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Extracted Data</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the extracted information
            </AlertDialogDescription>
          </AlertDialogHeader>

          {extractedDataForConfirm && (
            <div className="space-y-4">
              {/* Face Preview */}
              {croppedImageForConfirm && (
                <div className="flex justify-center">
                  <Image
                    src={croppedImageForConfirm}
                    alt="Extracted Face"
                    width={300}
                    height={240}
                    className="rounded-lg border border-gray-300"
                  />
                </div>
              )}

              {/* Extracted Data */}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Name:</span>{" "}
                  {extractedDataForConfirm.fullName}
                </div>
                <div>
                  <span className="font-semibold">ID Type:</span>{" "}
                  {extractedDataForConfirm.idType}
                </div>
                <div>
                  <span className="font-semibold">ID Number:</span>{" "}
                  {extractedDataForConfirm.idNumber}
                </div>
                <div>
                  <span className="font-semibold">Country:</span>{" "}
                  {extractedDataForConfirm.issuingCountry}
                </div>
                <div>
                  <span className="font-semibold">Expiry Date:</span>{" "}
                  {extractedDataForConfirm.expiryDate}
                </div>
                <div>
                  <span className="font-semibold">Confidence:</span>{" "}
                  <span className="text-green-600 font-bold">
                    {Math.round(
                      (extractedDataForConfirm.confidence || 0) * 100
                    )}
                    %
                  </span>
                </div>
                {extractedDataForConfirm.isExpired && (
                  <div className="text-red-600 font-semibold">
                    ⚠️ Document Expired
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <AlertDialogCancel disabled={isUploading}>Retake</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExtraction}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Confirm & Continue"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-center text-gray-900 dark:text-gray-100">
              Uploading images...
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!isFormValid()}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Next: Add-ons →
        </Button>
      </div>
    </div>
  );
};
