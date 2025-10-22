"use client";

import React, { createContext, useContext, useCallback, useState } from "react";

interface ApprovalBellContextType {
  refreshApprovalRequests: () => Promise<void>;
  registerRefresh: (fn: () => Promise<void>) => void;
}

const ApprovalBellContext = createContext<ApprovalBellContextType | undefined>(
  undefined
);

export function ApprovalBellProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [refreshFn, setRefreshFn] = useState<(() => Promise<void>) | null>(
    null
  );

  const registerRefresh = useCallback((fn: () => Promise<void>) => {
    setRefreshFn(() => fn);
  }, []);

  const refreshApprovalRequests = useCallback(async () => {
    if (refreshFn) {
      await refreshFn();
    }
  }, [refreshFn]);

  return (
    <ApprovalBellContext.Provider
      value={{ refreshApprovalRequests, registerRefresh }}
    >
      {children}
    </ApprovalBellContext.Provider>
  );
}

export function useApprovalBellRefresh() {
  const context = useContext(ApprovalBellContext);
  if (!context) {
    throw new Error(
      "useApprovalBellRefresh must be used within ApprovalBellProvider"
    );
  }
  return context;
}

