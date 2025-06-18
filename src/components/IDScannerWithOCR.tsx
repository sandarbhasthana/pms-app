"use client";

import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";

interface ScanResult {
  idNumber: string;
  fullName: string;
  issuingCountry: string;
}

interface OCRScannerProps {
  onComplete: (result: ScanResult) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

export default function IDScannerWithOCR({
  onComplete,
  onError,
  onClose
}: OCRScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [busy, setBusy] = useState(false);

  const captureAndRecognize = async () => {
    if (!webcamRef.current) return;
    setBusy(true);
    try {
      // 1) grab screenshot from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Failed to capture image");

      // 2) run Tesseract OCR
      const { data } = await Tesseract.recognize(imageSrc, "eng", {
        logger: (m) => console.log(m), // optional
      });

      const text = data.text;
      console.log("OCR text:", text);

      // 3) naive parsing via Regex (customize per your ID layout)
      const idMatch = text.match(/Document\s*No\.?\s*([A-Z0-9\-]+)/i);
      const nameMatch = text.match(/Name\s*:\s*([A-Z ]{3,})/i);
      const countryMatch = text.match(/Nationality\s*:\s*([A-Z]{2,})/i);

      if (!idMatch || !nameMatch || !countryMatch) {
        throw new Error("Could not parse ID fields. Try again.");
      }

      onComplete({
        idNumber: idMatch[1].trim(),
        fullName: nameMatch[1].trim(),
        issuingCountry: countryMatch[1].trim()
      });
    } catch (err) {
      console.error("OCR scan error:", err);
      onError(err as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/png"
        videoConstraints={{ facingMode: "environment" }}
        className="w-full max-w-md rounded-lg shadow-lg"
      />
      <div className="mt-4 flex space-x-2">
        <button
          onClick={captureAndRecognize}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {busy ? "Scanning…" : "Scan ID"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
