// File: src/components/IDScanner.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as BlinkIDSDK from "@microblink/blinkid-in-browser-sdk";

interface ScanResult {
  idNumber: string;
  fullName: string;
  issuingCountry: string;
}

interface IDScannerProps {
  licenseKey: string;
  onComplete: (result: ScanResult) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

export default function IDScanner({
  licenseKey,
  onComplete,
  onError,
  onClose
}: IDScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<BlinkIDSDK.BlinkIdSingleSideRecognizer>(null);
  const runnerRef = useRef<BlinkIDSDK.RecognizerRunner>(null);
  const videoRecognizerRef = useRef<BlinkIDSDK.VideoRecognizer>(null);
  const wasmSDKRef = useRef<BlinkIDSDK.WasmSDK | null>(null);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!BlinkIDSDK.isBrowserSupported()) {
          throw new Error("Browser not supported by BlinkID SDK");
        }

        // 1) Load WASM engine
        const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);

        loadSettings.engineLocation = "/resources/advanced";
        loadSettings.workerLocation = "/resources/advanced-threads";

        console.log("Attempting to load BlinkID SDK with settings:", {
          engineLocation: loadSettings.engineLocation,
          workerLocation: loadSettings.workerLocation
        });

        wasmSDKRef.current = await BlinkIDSDK.loadWasmModule(loadSettings);
        console.log("BlinkID SDK loaded successfully");
        if (cancelled) return;

        // 2) Create recognizer + runner
        const recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
          wasmSDKRef.current!
        );
        recognizerRef.current = recognizer;
        const runner = await BlinkIDSDK.createRecognizerRunner(
          wasmSDKRef.current!,
          [recognizer],
          true
        );
        runnerRef.current = runner;

        // 3) Hook up camera to video element
        const videoElem = videoRef.current!;
        const videoRecognizer =
          await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
            videoElem,
            runner
          );
        videoRecognizerRef.current = videoRecognizer;
      } catch (err) {
        console.error("BlinkID initialization error:", err);
        if (!cancelled) {
          const errorMessage =
            err instanceof Error && err.message
              ? err.message
              : "Scanner initialization failed. Please check your license key and resources.";
          onError(new Error(errorMessage));
        }
      }
    })();

    // Capture the current video element for cleanup
    const currentVideoElement = videoRef.current;

    return () => {
      cancelled = true;
      videoRecognizerRef.current?.releaseVideoFeed();
      runnerRef.current?.delete();
      recognizerRef.current?.delete();
      if (currentVideoElement?.srcObject instanceof MediaStream) {
        (currentVideoElement.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
      wasmSDKRef.current?.delete();
    };
  }, [licenseKey, onError]);

  const handleScan = async () => {
    if (!videoRecognizerRef.current || !recognizerRef.current) return;
    setBusy(true);
    try {
      // Perform a single recognition pass
      await videoRecognizerRef.current.recognize();

      const result = await recognizerRef.current.getResult();
      if (result.state === BlinkIDSDK.RecognizerResultState.Valid) {
        onComplete({
          idNumber: result.documentNumber?.toString() ?? "",
          fullName: result.fullName?.toString() ?? "",
          issuingCountry: result.mrz.nationality?.toString() ?? ""
        });
      } else {
        onError(new Error("Could not read ID—please try again"));
      }
    } catch (err) {
      console.error("BlinkID error:", err);
      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : "Scanner initialization failed. Please check your license key and try again.";
      onError(new Error(errorMessage));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
      <video ref={videoRef} className="w-full max-w-md rounded-lg shadow-lg" />
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
