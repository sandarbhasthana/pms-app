"use client";

import React, { useRef, useState, useEffect } from "react";
import NextImage from "next/image";
import Webcam from "react-webcam";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CameraIcon,
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon
} from "@heroicons/react/24/outline";

interface CropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IDScannerWithEdgeRefinementProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (croppedImageBase64: string) => void;
  onError: (error: Error) => void;
}

type DragHandle = "tl" | "tr" | "bl" | "br" | null;

export const IDScannerWithEdgeRefinement: React.FC<
  IDScannerWithEdgeRefinementProps
> = ({ isOpen, onClose, onCapture, onError }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cropCoords, setCropCoords] = useState<CropCoordinates>({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const [draggingHandle, setDraggingHandle] = useState<DragHandle>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize crop coordinates when image is captured
  useEffect(() => {
    if (capturedImage && imageWidth && imageHeight) {
      // Set initial crop to 90% of image with 5% margin
      const margin = Math.min(imageWidth, imageHeight) * 0.05;
      setCropCoords({
        x: margin,
        y: margin,
        width: imageWidth - margin * 2,
        height: imageHeight - margin * 2
      });
    }
  }, [capturedImage, imageWidth, imageHeight]);

  const handleCapture = () => {
    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          setCapturedImage(imageSrc);
          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            setImageWidth(img.width);
            setImageHeight(img.height);
          };
          img.src = imageSrc;
        }
      } catch (error) {
        onError(
          error instanceof Error ? error : new Error("Failed to capture image")
        );
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setRotation(0);
    setZoom(1);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => {
      const newZoom = direction === "in" ? prev + 0.1 : prev - 0.1;
      return Math.max(1, Math.min(3, newZoom));
    });
  };

  const handleMouseDown = (handle: DragHandle) => {
    setDraggingHandle(handle);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingHandle || !canvasRef.current || !imageWidth || !imageHeight)
      return;

    const rect = canvasRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    // Convert display coordinates to image coordinates
    // The image is displayed with object-contain, so we need to calculate the scale
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Calculate the actual displayed image dimensions (accounting for object-contain)
    const imageAspect = imageWidth / imageHeight;
    const displayAspect = displayWidth / displayHeight;

    let displayedImageWidth: number;
    let displayedImageHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect > displayAspect) {
      // Image is wider, fits to width
      displayedImageWidth = displayWidth;
      displayedImageHeight = displayWidth / imageAspect;
      offsetY = (displayHeight - displayedImageHeight) / 2;
    } else {
      // Image is taller, fits to height
      displayedImageHeight = displayHeight;
      displayedImageWidth = displayHeight * imageAspect;
      offsetX = (displayWidth - displayedImageWidth) / 2;
    }

    // Convert display coordinates to image coordinates
    const imageX = ((displayX - offsetX) / displayedImageWidth) * imageWidth;
    const imageY = ((displayY - offsetY) / displayedImageHeight) * imageHeight;

    const minSize = 50;
    const newCoords = { ...cropCoords };

    // Handle ONLY corner dragging (no edge dragging)
    if (draggingHandle === "tl") {
      // Top-left corner
      newCoords.x = Math.max(
        0,
        Math.min(imageX, cropCoords.x + cropCoords.width - minSize)
      );
      newCoords.y = Math.max(
        0,
        Math.min(imageY, cropCoords.y + cropCoords.height - minSize)
      );
      newCoords.width = cropCoords.width + (cropCoords.x - newCoords.x);
      newCoords.height = cropCoords.height + (cropCoords.y - newCoords.y);
    } else if (draggingHandle === "tr") {
      // Top-right corner
      newCoords.y = Math.max(
        0,
        Math.min(imageY, cropCoords.y + cropCoords.height - minSize)
      );
      newCoords.width = Math.max(minSize, imageX - cropCoords.x);
      newCoords.height = cropCoords.height + (cropCoords.y - newCoords.y);
    } else if (draggingHandle === "bl") {
      // Bottom-left corner
      newCoords.x = Math.max(
        0,
        Math.min(imageX, cropCoords.x + cropCoords.width - minSize)
      );
      newCoords.width = cropCoords.width + (cropCoords.x - newCoords.x);
      newCoords.height = Math.max(minSize, imageY - cropCoords.y);
    } else if (draggingHandle === "br") {
      // Bottom-right corner - allow dragging to full image bounds
      newCoords.width = Math.max(minSize, imageX - cropCoords.x);
      newCoords.height = Math.max(minSize, imageY - cropCoords.y);
    }

    setCropCoords(newCoords);
  };

  const handleMouseUp = () => {
    setDraggingHandle(null);
  };

  const handleConfirmAndProcess = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      // Create canvas for cropping and rotation
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      const img = new Image();

      img.onload = () => {
        try {
          // Apply rotation
          const radians = (rotation * Math.PI) / 180;
          const cos = Math.cos(radians);
          const sin = Math.sin(radians);

          // Calculate rotated dimensions
          const rotatedWidth =
            Math.abs(img.width * cos) + Math.abs(img.height * sin);
          const rotatedHeight =
            Math.abs(img.width * sin) + Math.abs(img.height * cos);

          canvas.width = rotatedWidth;
          canvas.height = rotatedHeight;

          // Translate and rotate
          ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
          ctx.rotate(radians);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);

          // Now crop from the rotated image
          const croppedCanvas = document.createElement("canvas");
          const croppedCtx = croppedCanvas.getContext("2d");
          if (!croppedCtx)
            throw new Error("Failed to get cropped canvas context");

          croppedCanvas.width = cropCoords.width;
          croppedCanvas.height = cropCoords.height;

          croppedCtx.drawImage(
            canvas,
            cropCoords.x,
            cropCoords.y,
            cropCoords.width,
            cropCoords.height,
            0,
            0,
            cropCoords.width,
            cropCoords.height
          );

          const croppedBase64 = croppedCanvas.toDataURL("image/jpeg", 0.95);

          // Just pass the cropped image to parent - let parent handle AI processing
          onCapture(croppedBase64);
          resetScanner();
        } catch (error) {
          onError(
            error instanceof Error ? error : new Error("Failed to crop image")
          );
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        onError(new Error("Failed to load image"));
        setIsProcessing(false);
      };

      img.src = capturedImage;
    } catch (error) {
      onError(
        error instanceof Error ? error : new Error("Failed to process image")
      );
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setRotation(0);
    setZoom(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {capturedImage ? "Refine Document Edges" : "Capture ID Document"}
          </DialogTitle>
        </DialogHeader>

        {!capturedImage ? (
          <div className="space-y-4">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-lg"
            />
            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCapture} className="flex-1">
                <CameraIcon className="w-4 h-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={canvasRef}
              className="relative bg-gray-900 rounded-lg overflow-hidden cursor-move"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                width: "100%",
                height: "400px"
              }}
            >
              <NextImage
                src={capturedImage}
                alt="Captured"
                fill
                className="object-contain"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`
                }}
                // ⚠️ Keep unoptimized: base64 data URLs cannot be optimized by Next.js
                unoptimized
              />

              {/* Crop overlay */}
              <div
                className="absolute border-2 border-blue-500"
                style={{
                  left: `${(cropCoords.x / imageWidth) * 100}%`,
                  top: `${(cropCoords.y / imageHeight) * 100}%`,
                  width: `${(cropCoords.width / imageWidth) * 100}%`,
                  height: `${(cropCoords.height / imageHeight) * 100}%`
                }}
              >
                {/* Corner handles */}
                {(["tl", "tr", "bl", "br"] as const).map((handle) => (
                  <div
                    key={handle}
                    className="absolute w-3 h-3 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600"
                    style={{
                      [handle.includes("t") ? "top" : "bottom"]: "-6px",
                      [handle.includes("l") ? "left" : "right"]: "-6px"
                    }}
                    onMouseDown={() => handleMouseDown(handle)}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => handleZoom("out")}
                variant="outline"
                size="sm"
              >
                <MagnifyingGlassMinusIcon className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2 py-1">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                onClick={() => handleZoom("in")}
                variant="outline"
                size="sm"
              >
                <MagnifyingGlassPlusIcon className="w-4 h-4" />
              </Button>
              <Button onClick={handleRotate} variant="outline" size="sm">
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2 py-1">
                {rotation}°
              </span>
            </div>

            {/* Crop dimensions */}
            <div className="text-sm text-gray-600 text-center">
              Crop size: {Math.round(cropCoords.width)} ×{" "}
              {Math.round(cropCoords.height)} px
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleRetake}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                Retake
              </Button>
              <Button
                onClick={handleConfirmAndProcess}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Confirm & Process"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IDScannerWithEdgeRefinement;
