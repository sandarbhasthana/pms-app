import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, BusinessRuleCategory } from "@prisma/client";

/**
 * GET /api/business-rules
 * List all business rules for a property
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status"); // "active" | "inactive" | "all"
    const type = searchParams.get("type"); // filter by category
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "name"; // "name" | "priority" | "created"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Build filter
    const where: Prisma.BusinessRuleWhereInput = { propertyId };

    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    if (type) where.category = type.toUpperCase() as BusinessRuleCategory;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    // Build sort
    const orderBy: Prisma.BusinessRuleOrderByWithRelationInput = {};
    switch (sort) {
      case "priority":
        orderBy.priority = "desc";
        break;
      case "created":
        orderBy.createdAt = "desc";
        break;
      default:
        orderBy.name = "asc";
    }

    // Fetch rules
    const rules = await prisma.businessRule.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    const total = await prisma.businessRule.count({ where });

    return NextResponse.json({
      rules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("GET /api/business-rules error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business-rules
 * Create a new business rule
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      category,
      priority,
      isActive,
      propertyId,
      organizationId,
      conditions,
      actions,
      metadata
    } = body;

    if (!name || !propertyId || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Create rule
    const rule = await prisma.businessRule.create({
      data: {
        name,
        description,
        category: category || "PRICING",
        priority: priority || 50,
        isActive: isActive !== false,
        propertyId,
        organizationId,
        conditions: conditions || [],
        actions: actions || [],
        metadata: metadata || {},
        createdBy: session.user.id,
        updatedBy: session.user.id
      }
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("POST /api/business-rules error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
