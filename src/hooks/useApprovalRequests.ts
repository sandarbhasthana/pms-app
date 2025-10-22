"use client";

import { useState, useEffect, useCallback } from "react";

export interface ApprovalRequest {
  id: string;
  reservationId: string;
  propertyId: string;
  requestType: string;
  requestReason: string;
  requestedBy: string;
  requestedAt: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  metadata?: string;
  requestedByUser?: {
    id: string;
    name: string | null;
    email: string;
  };
  reservation?: {
    id: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
  };
}

interface UseApprovalRequestsOptions {
  propertyId?: string;
  status?: string;
  pollInterval?: number; // in milliseconds
}

export function useApprovalRequests(options: UseApprovalRequestsOptions = {}) {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovalRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.status) params.append("status", options.status);
      params.append("limit", "50");

      const response = await fetch(
        `/api/approval-requests?${params.toString()}`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        // 401 means user is not authenticated - this is expected for non-authenticated users
        if (response.status === 401) {
          setApprovalRequests([]);
          return;
        }
        // 403 means user doesn't have permission - this is expected for non-managers
        if (response.status === 403) {
          setApprovalRequests([]);
          return;
        }
        throw new Error("Failed to fetch approval requests");
      }

      const data = await response.json();
      setApprovalRequests(data.approvalRequests || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch approval requests";
      setError(errorMessage);
      console.error("Error fetching approval requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.status]);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchApprovalRequests();

    // Set up polling if interval is specified
    if (options.pollInterval && options.pollInterval > 0) {
      const interval = setInterval(fetchApprovalRequests, options.pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchApprovalRequests, options.pollInterval]);

  const approveRequest = useCallback(
    async (requestId: string, approvalNotes?: string) => {
      try {
        const response = await fetch(`/api/approval-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: "APPROVED",
            approvalNotes
          })
        });

        if (!response.ok) {
          throw new Error("Failed to approve request");
        }

        const updated = await response.json();

        // Update local state
        setApprovalRequests((prev) =>
          prev.map((req) => (req.id === requestId ? updated : req))
        );

        return updated;
      } catch (err) {
        console.error("Error approving request:", err);
        throw err;
      }
    },
    []
  );

  const rejectRequest = useCallback(
    async (requestId: string, approvalNotes?: string) => {
      try {
        const response = await fetch(`/api/approval-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: "REJECTED",
            approvalNotes
          })
        });

        if (!response.ok) {
          throw new Error("Failed to reject request");
        }

        const updated = await response.json();

        // Update local state
        setApprovalRequests((prev) =>
          prev.map((req) => (req.id === requestId ? updated : req))
        );

        return updated;
      } catch (err) {
        console.error("Error rejecting request:", err);
        throw err;
      }
    },
    []
  );

  return {
    approvalRequests,
    isLoading,
    error,
    refetch: fetchApprovalRequests,
    approveRequest,
    rejectRequest
  };
}
