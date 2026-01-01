"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  AlertTriangle,
  Plus,
  RefreshCw
} from "lucide-react";

interface RoomTypeMapping {
  id: string;
  roomTypeId: string;
  roomTypeName: string;
  channexRoomTypeId: string | null;
  channexRoomTypeName?: string | null;
  channexRatePlanId: string | null;
  channexRatePlanName?: string | null;
  isActive: boolean;
}

interface ChannexRoomType {
  id: string;
  name: string;
  occupancy?: number;
}

interface ChannexRatePlan {
  id: string;
  name: string;
  roomTypeId?: string;
}

interface Props {
  propertyId: string;
  isConnected: boolean;
  onMappingChange: () => void;
}

export function PropertyMappingTab({
  propertyId,
  isConnected,
  onMappingChange
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<RoomTypeMapping[]>([]);
  const [channexRoomTypes, setChannexRoomTypes] = useState<ChannexRoomType[]>(
    []
  );
  const [channexRatePlans, setChannexRatePlans] = useState<ChannexRatePlan[]>(
    []
  );
  const [editedMappings, setEditedMappings] = useState<
    Record<string, { channexRoomTypeId: string; channexRatePlanId: string }>
  >({});
  const [creatingRoomType, setCreatingRoomType] = useState<string | null>(null);
  const [creatingRatePlan, setCreatingRatePlan] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch PMS room type mappings
  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/channex/room-mappings?propertyId=${propertyId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setMappings([]);
          return;
        }
        throw new Error("Failed to fetch mappings");
      }

      const data = await response.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error("Error fetching mappings:", error);
      toast.error("Failed to load room type mappings");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Fetch existing Channex room types
  const fetchChannexRoomTypes = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/channex/room-types?propertyId=${propertyId}`
      );
      if (response.ok) {
        const data = await response.json();
        setChannexRoomTypes(data.roomTypes || []);
      }
    } catch (error) {
      console.error("Error fetching Channex room types:", error);
    }
  }, [propertyId]);

  // Fetch existing Channex rate plans
  const fetchChannexRatePlans = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/channex/rate-plans?propertyId=${propertyId}`
      );
      if (response.ok) {
        const data = await response.json();
        setChannexRatePlans(data.ratePlans || []);
      }
    } catch (error) {
      console.error("Error fetching Channex rate plans:", error);
    }
  }, [propertyId]);

  // Refresh all Channex data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchChannexRoomTypes(), fetchChannexRatePlans()]);
    setRefreshing(false);
    toast.success("Channex data refreshed");
  };

  useEffect(() => {
    if (isConnected) {
      fetchMappings();
      fetchChannexRoomTypes();
      fetchChannexRatePlans();
    } else {
      setLoading(false);
    }
  }, [
    isConnected,
    fetchMappings,
    fetchChannexRoomTypes,
    fetchChannexRatePlans
  ]);

  // Handle dropdown selection change
  const handleSelectChange = (
    roomTypeId: string,
    field: "channexRoomTypeId" | "channexRatePlanId",
    value: string
  ) => {
    setEditedMappings((prev) => ({
      ...prev,
      [roomTypeId]: {
        channexRoomTypeId:
          field === "channexRoomTypeId"
            ? value
            : prev[roomTypeId]?.channexRoomTypeId || "",
        channexRatePlanId:
          field === "channexRatePlanId"
            ? value
            : prev[roomTypeId]?.channexRatePlanId || ""
      }
    }));
  };

  // Create new room type in Channex
  const handleCreateRoomType = async (roomTypeId: string) => {
    try {
      setCreatingRoomType(roomTypeId);
      const response = await fetch("/api/channex/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, roomTypeId })
      });

      if (!response.ok) {
        throw new Error("Failed to create room type in Channex");
      }

      const data = await response.json();
      toast.success(
        `Room type created in Channex: ${data.channexRoomType.name}`
      );

      // Update local state instead of refetching
      const newChannexRoomType = {
        id: data.channexRoomType.id,
        name: data.channexRoomType.name
      };
      setChannexRoomTypes((prev) => [...prev, newChannexRoomType]);

      // Update mapping locally
      setMappings((prev) =>
        prev.map((m) =>
          m.roomTypeId === roomTypeId
            ? { ...m, channexRoomTypeId: data.channexRoomType.id }
            : m
        )
      );

      // Clear any edited state for this mapping
      setEditedMappings((prev) => {
        const updated = { ...prev };
        if (updated[roomTypeId]) {
          updated[roomTypeId] = {
            ...updated[roomTypeId],
            channexRoomTypeId: data.channexRoomType.id
          };
        }
        return updated;
      });
    } catch (error) {
      console.error("Create room type error:", error);
      toast.error("Failed to create room type in Channex");
    } finally {
      setCreatingRoomType(null);
    }
  };

  // Create new rate plan in Channex
  const handleCreateRatePlan = async (
    roomTypeId: string,
    channexRoomTypeId: string
  ) => {
    if (!channexRoomTypeId) {
      toast.error("Map or create the room type first");
      return;
    }

    try {
      setCreatingRatePlan(roomTypeId);
      const response = await fetch("/api/channex/rate-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, roomTypeId, channexRoomTypeId })
      });

      if (!response.ok) {
        throw new Error("Failed to create rate plan in Channex");
      }

      const data = await response.json();
      toast.success(
        `Rate plan created in Channex: ${data.channexRatePlan.name}`
      );

      // Update local state instead of refetching
      const newRatePlan = {
        id: data.channexRatePlan.id,
        name: data.channexRatePlan.name,
        roomTypeId: channexRoomTypeId
      };
      setChannexRatePlans((prev) => [...prev, newRatePlan]);

      // Update mapping locally
      setMappings((prev) =>
        prev.map((m) =>
          m.roomTypeId === roomTypeId
            ? { ...m, channexRatePlanId: data.channexRatePlan.id }
            : m
        )
      );

      // Clear any edited state for this mapping
      setEditedMappings((prev) => {
        const updated = { ...prev };
        if (updated[roomTypeId]) {
          updated[roomTypeId] = {
            ...updated[roomTypeId],
            channexRatePlanId: data.channexRatePlan.id
          };
        }
        return updated;
      });
    } catch (error) {
      console.error("Create rate plan error:", error);
      toast.error("Failed to create rate plan in Channex");
    } finally {
      setCreatingRatePlan(null);
    }
  };

  // Save mapping selections
  const handleSave = async () => {
    const updates = Object.entries(editedMappings)
      .filter(
        ([, values]) => values.channexRoomTypeId || values.channexRatePlanId
      )
      .map(([roomTypeId, values]) => ({
        roomTypeId,
        ...values
      }));

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/channex/room-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, mappings: updates })
      });

      if (!response.ok) {
        throw new Error("Failed to save mappings");
      }

      toast.success("Room type mappings saved successfully");
      setEditedMappings({});
      fetchMappings();
      onMappingChange();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save room type mappings");
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            <p>Connect to Channex first to configure room type mappings.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const hasChanges = Object.keys(editedMappings).length > 0;

  // Get rate plans for a specific Channex room type
  const getRatePlansForRoomType = (channexRoomTypeId: string | null) => {
    if (!channexRoomTypeId) return channexRatePlans;
    return channexRatePlans.filter(
      (rp) => rp.roomTypeId === channexRoomTypeId || !rp.roomTypeId
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Room Type Mapping</CardTitle>
            <CardDescription>
              Map your PMS room types to Channex or create new ones
              automatically.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh from Channex
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <p className="text-muted-foreground">
            No room types found. Add room types in Accommodations settings
            first.
          </p>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">PMS Room Type</TableHead>
                  <TableHead>Channex Room Type</TableHead>
                  <TableHead>Channex Rate Plan</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => {
                  const edited = editedMappings[mapping.roomTypeId];
                  const currentChannexRoomId =
                    edited?.channexRoomTypeId ??
                    mapping.channexRoomTypeId ??
                    "";
                  const currentRatePlanId =
                    edited?.channexRatePlanId ??
                    mapping.channexRatePlanId ??
                    "";

                  // Check if mapped IDs actually exist in Channex
                  const roomTypeExistsInChannex = currentChannexRoomId
                    ? channexRoomTypes.some(
                        (rt) => rt.id === currentChannexRoomId
                      )
                    : false;
                  const ratePlanExistsInChannex = currentRatePlanId
                    ? channexRatePlans.some((rp) => rp.id === currentRatePlanId)
                    : false;

                  // Only consider mapped if the IDs exist in Channex
                  const isRoomMapped = Boolean(
                    currentChannexRoomId && roomTypeExistsInChannex
                  );
                  const isRateMapped = Boolean(
                    currentRatePlanId && ratePlanExistsInChannex
                  );
                  const isMapped = isRoomMapped && isRateMapped;

                  // Show warning if ID exists in DB but not in Channex (deleted)
                  const roomDeletedFromChannex = Boolean(
                    currentChannexRoomId && !roomTypeExistsInChannex
                  );
                  const rateDeletedFromChannex = Boolean(
                    currentRatePlanId && !ratePlanExistsInChannex
                  );

                  const availableRatePlans =
                    getRatePlansForRoomType(currentChannexRoomId);

                  return (
                    <TableRow key={mapping.roomTypeId}>
                      <TableCell className="font-medium">
                        {mapping.roomTypeName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={
                              roomTypeExistsInChannex
                                ? currentChannexRoomId
                                : "none"
                            }
                            onValueChange={(value) =>
                              handleSelectChange(
                                mapping.roomTypeId,
                                "channexRoomTypeId",
                                value === "none" ? "" : value
                              )
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                -- Not Mapped --
                              </SelectItem>
                              {channexRoomTypes.map((rt) => (
                                <SelectItem key={rt.id} value={rt.id}>
                                  {rt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCreateRoomType(mapping.roomTypeId);
                            }}
                            disabled={
                              creatingRoomType === mapping.roomTypeId ||
                              isRoomMapped
                            }
                            title={
                              roomDeletedFromChannex
                                ? "Room type deleted from Channex - click to recreate"
                                : "Create new room type in Channex"
                            }
                          >
                            {creatingRoomType === mapping.roomTypeId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isRoomMapped ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : roomDeletedFromChannex ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={
                              ratePlanExistsInChannex
                                ? currentRatePlanId
                                : "none"
                            }
                            onValueChange={(value) =>
                              handleSelectChange(
                                mapping.roomTypeId,
                                "channexRatePlanId",
                                value === "none" ? "" : value
                              )
                            }
                            disabled={!currentChannexRoomId}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select rate plan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                -- Not Mapped --
                              </SelectItem>
                              {availableRatePlans.map((rp) => (
                                <SelectItem key={rp.id} value={rp.id}>
                                  {rp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCreateRatePlan(
                                mapping.roomTypeId,
                                currentChannexRoomId
                              );
                            }}
                            disabled={
                              creatingRatePlan === mapping.roomTypeId ||
                              !isRoomMapped ||
                              isRateMapped
                            }
                            title={
                              rateDeletedFromChannex
                                ? "Rate plan deleted from Channex - click to recreate"
                                : "Create new rate plan in Channex"
                            }
                          >
                            {creatingRatePlan === mapping.roomTypeId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isRateMapped ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : rateDeletedFromChannex ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isMapped ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : roomDeletedFromChannex || rateDeletedFromChannex ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2">
              <Button onClick={handleSave} disabled={saving || !hasChanges}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Mappings
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
