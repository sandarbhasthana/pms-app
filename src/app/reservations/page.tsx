// app/reservations/page.tsx
"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { format, parseISO, isWithinInterval, addDays } from "date-fns";
import {
  MoreVertical,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";

interface Reservation {
  id: string;
  guestName: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: string;
  notes?: string;
  phone?: string;
  email?: string;
  paymentStatus?: string;
}

// simple SWR fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Network error");
    return res.json() as Promise<{ reservations: Reservation[] }>;
  });

const ReservationsPage = () => {
  // — SWR data fetch & revalidate function —
  const { data, error, isValidating } = useSWR("/api/reservations", fetcher, {
    revalidateOnFocus: false
  });
  // Memoize reservations to avoid dependency issues
  const reservations = useMemo(
    () => data?.reservations ?? [],
    [data?.reservations]
  );

  // helper to download a Blob as a file
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // — UI state (unchanged) —
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: "",
    to: ""
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // — mutation state —
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Global report for all reservations (uses current search/filter state)
  const handleFullReport = async () => {
    setLoadingActionId("full"); // you can reuse loadingActionId for global if you like
    setActionError(null);
    try {
      // build query params same as your front-end filters
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      if (customRange.from && customRange.to) {
        params.set("from", customRange.from);
        params.set("to", customRange.to);
      }
      const res = await fetch(`/api/reservations/report?${params.toString()}`, {
        headers: { Accept: "application/pdf" }
      });

      // Check if response is PDF or error JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // If we get here, the response should be a PDF
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `reservations-report.pdf`);
        // Clear any previous errors since download succeeded
        setActionError(null);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      // ignore the benign "Failed to fetch" that still results in a download
      if (!(err instanceof Error && err.message === "Failed to fetch")) {
        console.error("Report generation error:", err);
        setActionError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  // 2. Per-reservation report
  const handleGenerateReport = async (id: string) => {
    setLoadingActionId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/report`, {
        headers: { Accept: "application/pdf" }
      });

      // Check if response is PDF or error JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // If we get here, the response should be a PDF
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `reservation-${id}-report.pdf`);
        // Clear any previous errors since download succeeded
        setActionError(null);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      // ignore the benign "Failed to fetch" that still results in a download
      if (!(err instanceof Error && err.message === "Failed to fetch")) {
        console.error("Report generation error:", err);
        setActionError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  // 3. Per-reservation invoice
  const handleGenerateInvoice = async (id: string) => {
    setLoadingActionId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/invoice`, {
        headers: { Accept: "application/pdf" }
      });

      // Check if response is PDF or error JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // If we get here, the response should be a PDF
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `reservation-${id}-invoice.pdf`);
        // Clear any previous errors since download succeeded
        setActionError(null);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      // ignore the benign "Failed to fetch" that still results in a download
      if (!(err instanceof Error && err.message === "Failed to fetch")) {
        console.error("Report generation error:", err);
        setActionError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    setLoadingActionId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Delete failed");
      }
      // revalidate the list after successful delete
      await mutate("/api/reservations");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingActionId(null);
    }
  };

  // — Filtering & pagination logic (unchanged) —
  const filtered = useMemo(() => {
    let d = reservations;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.guestName.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
      );
    }
    if (filter !== "all") {
      const now = new Date();
      let range: { start: Date; end: Date } | null = null;
      switch (filter) {
        case "week":
          range = { start: now, end: addDays(now, 7) };
          break;
        case "month":
          range = { start: now, end: addDays(now, 30) };
          break;
        case "year":
          range = { start: now, end: addDays(now, 365) };
          break;
        case "custom":
          if (customRange.from && customRange.to) {
            range = {
              start: parseISO(customRange.from),
              end: parseISO(customRange.to)
            };
          }
          break;
      }
      if (range) {
        d = d.filter((r) =>
          isWithinInterval(parseISO(r.checkIn), {
            start: range.start,
            end: range.end
          })
        );
      }
    }
    return d;
  }, [reservations, search, filter, customRange]);

  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reservations</h1>

      {/* Search + Filter + Full Report button */}
      <div className="flex items-center justify-between space-x-4">
        <Input
          placeholder="Search by Name, E-mail or Phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
        <div className="flex items-center space-x-2">
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              {filter === "all"
                ? "All"
                : filter === "week"
                ? "Next 7 Days"
                : filter === "month"
                ? "Next 30 Days"
                : filter === "year"
                ? "Next Year"
                : "Custom Range"}
            </SelectTrigger>
            <SelectContent className="border-r-[5px]">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="week">Next 7 Days</SelectItem>
              <SelectItem value="month">Next 30 Days</SelectItem>
              <SelectItem value="year">Next Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {filter === "custom" && (
            <div className="flex space-x-2">
              <Input
                type="date"
                value={customRange.from}
                onChange={(e) =>
                  setCustomRange({ ...customRange, from: e.target.value })
                }
                className="rounded-sm"
              />
              <Input
                type="date"
                value={customRange.to}
                onChange={(e) =>
                  setCustomRange({ ...customRange, to: e.target.value })
                }
                className="rounded-sm"
              />
            </div>
          )}

          <Button
            onClick={handleFullReport}
            disabled={loadingActionId === "full"}
            className="bg-purple-500 hover:bg-purple-400 text-white rounded-sm"
          >
            {loadingActionId === "full" ? "Generating…" : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* show global action error or loading */}
      {actionError && (
        <div className="bg-red-50 border display-none border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {actionError}
        </div>
      )}
      {isValidating && !data && (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin w-4 h-4" />
          <span>Loading reservations…</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Failed to load reservations:</strong>{" "}
          {error.message || "Unknown error occurred"}
        </div>
      )}

      {/* Reservations table */}
      <div className="overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
              <th className="p-2 text-left">Guest</th>
              <th className="p-2 text-left">Room</th>
              <th className="p-2 text-left">Check-In</th>
              <th className="p-2 text-left">Check-Out</th>
              <th className="p-2 text-center">Adults</th>
              <th className="p-2 text-center">Children</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Payment</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.guestName}</td>
                <td className="p-2">{r.roomId}</td>
                <td className="p-2">{format(parseISO(r.checkIn), "P")}</td>
                <td className="p-2">{format(parseISO(r.checkOut), "P")}</td>
                <td className="p-2 text-center">{r.adults}</td>
                <td className="p-2 text-center">{r.children}</td>
                <td className="p-2 text-center">{r.status}</td>
                <td className="p-2 text-center">{r.paymentStatus}</td>
                <td className="p-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleGenerateReport(r.id)}
                        disabled={loadingActionId === r.id}
                      >
                        {loadingActionId === r.id ? (
                          <span className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-1" />
                            Generating…
                          </span>
                        ) : (
                          "Generate Report"
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleGenerateInvoice(r.id)}
                        disabled={loadingActionId === r.id}
                      >
                        {loadingActionId === r.id ? (
                          <span className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-1" />
                            Invoicing…
                          </span>
                        ) : (
                          "Generate Invoice"
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDeleteReservation(r.id)}
                        className="text-red-600"
                        disabled={loadingActionId === r.id}
                      >
                        {loadingActionId === r.id ? (
                          <span className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-1" />
                            Deleting…
                          </span>
                        ) : (
                          "Delete Reservation"
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center space-x-2 mt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage(1)}
          disabled={page === 1}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          <ChevronLeft />
        </Button>
        <span>
          Page {page} of {pageCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
          disabled={page === pageCount}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage(pageCount)}
          disabled={page === pageCount}
        >
          <ChevronsRight />
        </Button>
        <div className="flex items-center space-x-1">
          <label htmlFor="pageSize" className="sr-only">
            Items per page
          </label>
          <Input
            id="pageSize"
            type="number"
            min={1}
            value={pageSize}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              setPageSize(val);
              setPage(1);
            }}
            className="w-16 text-center"
          />
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
