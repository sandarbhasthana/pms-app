// File: src/app/api/rates/logs/summary/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { Prisma } from "@prisma/client";
import { PropertyRole } from "@prisma/client";
import { withPropertyContext, validatePropertyAccess } from "@/lib/property-context";

/**
 * GET /api/rates/logs/summary - Get rate change summary statistics
 * Query params:
 * - startDate?: string (default: 30 days ago)
 * - endDate?: string (default: today)
 * - roomTypeId?: string (optional filter)
 */
export async function GET(req: NextRequest) {
  try {
    // Validate property access (FRONT_DESK and above can view rate log summaries)
    const validation = await validatePropertyAccess(req, PropertyRole.FRONT_DESK);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403,
      });
    }

    const { propertyId } = validation;

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const roomTypeId = searchParams.get("roomTypeId");

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : subDays(endDate, 30);

    const summary = await withPropertyContext(propertyId!, async (tx) => {
      const whereClause: Prisma.RateChangeLogWhereInput = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        roomType: {
          propertyId: propertyId,
        },
      };

      if (roomTypeId) {
        whereClause.roomTypeId = roomTypeId;
      }

      // Get total changes
      const totalChanges = await tx.rateChangeLog.count({ where: whereClause });

      // Get changes by type
      const changesByType = await tx.rateChangeLog.groupBy({
        by: ["changeType"],
        where: whereClause,
        _count: { changeType: true },
      });

      // Get changes by user
      const changesByUser = await tx.rateChangeLog.groupBy({
        by: ["userId"],
        where: whereClause,
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      });

      // Get user details for top changers
      const userIds = changesByUser.map((c) => c.userId);
      const users = await tx.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });

      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, { id: string; name: string | null; email: string }>);

      return {
        totalChanges,
        changesByType: changesByType.map((c) => ({
          type: c.changeType,
          count: c._count.changeType,
        })),
        topUsers: changesByUser.map((c) => ({
          user: userMap[c.userId],
          changeCount: c._count.userId,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: summary,
      period: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      },
    });
  } catch (error) {
    console.error("GET /api/rates/logs/summary error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rate logs summary",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

