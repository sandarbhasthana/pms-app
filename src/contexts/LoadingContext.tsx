"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface LoadingContextType {
  isLoading: boolean;
  loadingText: string;
  showLoader: (text?: string) => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");

  const showLoader = useCallback((text: string = "Loading...") => {
    setLoadingText(text);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    setLoadingText("Loading...");
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingText,
        showLoader,
        hideLoader
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useGlobalLoader must be used within a LoadingProvider");
  }
  return context;
}

