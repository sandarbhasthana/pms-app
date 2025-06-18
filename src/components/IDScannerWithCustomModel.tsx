// File: src/components/IDScannerWithOCR.tsx
"use client";

import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";

interface ScanResult {
  idNumber: string;
  fullName: string;
  issuingCountry: string;
}

interface IDScannerWithOCRProps {
  onComplete: (result: ScanResult) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

export default function IDScannerWithOCR({
  onComplete,
  onError,
  onClose
}: IDScannerWithOCRProps) {
  const webcamRef = useRef<Webcam>(null);
  const [busy, setBusy] = useState(false);

  const handleScan = async () => {
    if (!webcamRef.current) return;
    setBusy(true);

    try {
      // 1️⃣ Capture a still from the camera
      const image = webcamRef.current.getScreenshot();
      if (!image) throw new Error("Camera capture failed");

      // 2️⃣ Run OCR
      const {
        data: { text }
      } = await Tesseract.recognize(
        image,
        "yourmodel+eng", // replace "yourmodel" with your custom traineddata filename
        {
          logger: (m: unknown) => console.log(m),
          langPath: "/tessdata", // public/tessdata/yourmodel.traineddata
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< "
        } as {
          logger: (m: unknown) => void;
          langPath: string;
          tessedit_char_whitelist: string;
        }
      );

      console.log("🌐 Raw OCR text:", text);

      // 3️⃣ Fuzzy‐ID extraction
      // a) ID - look for A-letter followed by ≥6 digits
      const idMatch = text.match(/[A-Z]\d{6,}/);
      const idNumber = idMatch?.[0]?.trim() ?? "";

      // b) Gather ALL uppercase “words” of length ≥3
      const uppercaseWords =
        Array.from(text.matchAll(/\b[A-Z]{3,}\b/g), (m) => m[0]) || [];

      // c) Remove the ID itself from the list
      const filtered = uppercaseWords.filter((w) => w !== idNumber);

      // d) Sort by length, pick top two as the name
      const nameParts = filtered
        .slice() // copy
        .sort((a, b) => b.length - a.length)
        .slice(0, 2);
      const fullName = nameParts.join(" ");

      // e) Try to pick a country (first “INDI…” or else first leftover)
      const issuingCountry =
        filtered.find((w) => /^INDI/.test(w)) ?? filtered[0] ?? "";

      // f) If all three pieces exist, we’re done
      if (idNumber && fullName && issuingCountry) {
        return onComplete({ idNumber, fullName, issuingCountry });
      }

      // Otherwise…
      throw new Error(
        "Could not parse ID fields from OCR. Please adjust framing/lighting and try again."
      );
    } catch (err) {
      console.error("⚠️ OCR scan error:", err);
      onError(err instanceof Error ? err : new Error(String(err)));
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
          onClick={handleScan}
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
