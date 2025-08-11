// File: src/app/api/rates/logs/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";
import { format, subDays } from "date-fns";
import { Prisma } from "@prisma/client";

/**
 * GET /api/rates/logs - Fetch rate change audit logs
 * Query params:
 * - roomTypeId?: string (optional filter by room type)
 * - startDate?: string (default: 30 days ago)
 * - endDate?: string (default: today)
 * - changeType?: string (filter by change type)
 * - userId?: string (filter by user who made changes)
 * - limit?: number (default: 100, max: 1000)
 * - offset?: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    // Validate property access (FRONT_DESK and above can view rate logs)
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.FRONT_DESK
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;
    const { searchParams } = new URL(req.url);
    const roomTypeId = searchParams.get("roomTypeId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const changeType = searchParams.get("changeType");
    const userId = searchParams.get("userId");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Set default date range (last 30 days)
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : subDays(endDate, 30);

    const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 100;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    const { logs, totalCount } = await withPropertyContext(
      propertyId!,
      async (tx) => {
        // Build where clause
        const whereClause: Prisma.RateChangeLogWhereInput = {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          roomType: {
            propertyId: propertyId
          }
        };

        if (roomTypeId) {
          whereClause.roomTypeId = roomTypeId;
        }

        if (changeType) {
          whereClause.changeType = changeType;
        }

        if (userId) {
          whereClause.userId = userId;
        }

        // Get total count for pagination
        const totalCount = await tx.rateChangeLog.count({
          where: whereClause
        });

        // Fetch logs with pagination
        const logs = await tx.rateChangeLog.findMany({
          where: whereClause,
          include: {
            roomType: {
              select: {
                id: true,
                name: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: limit,
          skip: offset
        });

        return { logs, totalCount };
      }
    );

    // Format the response
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      roomType: {
        id: log.roomType.id,
        name: log.roomType.name
      },
      date: log.date ? format(log.date, "yyyy-MM-dd") : null,
      oldPrice: log.oldPrice,
      newPrice: log.newPrice,
      changeType: log.changeType,
      reason: log.reason,
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email
      },
      createdAt: log.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      filters: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        roomTypeId,
        changeType,
        userId
      }
    });
  } catch (error) {
    console.error("GET /api/rates/logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate logs", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rates/logs - Create manual rate change log entry
 * Body: {
 *   roomTypeId: string;
 *   date?: string;
 *   oldPrice?: number;
 *   newPrice: number;
 *   changeType: string;
 *   reason: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate property access (PROPERTY_MGR and above can create rate logs)
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.PROPERTY_MGR
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId, userId } = validation;

    const { roomTypeId, date, oldPrice, newPrice, changeType, reason } =
      await req.json();

    // Validate required fields
    if (!roomTypeId || typeof newPrice !== "number" || !changeType || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const logEntry = await withPropertyContext(propertyId!, async (tx) => {
      // Verify room type exists and belongs to property
      const roomType = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          propertyId: propertyId
        }
      });

      if (!roomType) {
        throw new Error(
          "Room type not found or doesn't belong to this property"
        );
      }

      // Create the log entry
      return await tx.rateChangeLog.create({
        data: {
          roomTypeId,
          date: date ? new Date(date) : null,
          oldPrice: oldPrice || null,
          newPrice,
          changeType,
          reason,
          userId: userId || "unknown"
        },
        include: {
          roomType: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Rate change log created successfully",
      data: {
        id: logEntry.id,
        roomType: logEntry.roomType,
        date: logEntry.date ? format(logEntry.date, "yyyy-MM-dd") : null,
        oldPrice: logEntry.oldPrice,
        newPrice: logEntry.newPrice,
        changeType: logEntry.changeType,
        reason: logEntry.reason,
        user: logEntry.user,
        createdAt: logEntry.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error("POST /api/rates/logs error:", error);
    return NextResponse.json(
      { error: "Failed to create rate log", details: (error as Error).message },
      { status: 500 }
    );
  }
}
