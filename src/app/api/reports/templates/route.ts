/**
 * API Route: Report Templates
 * GET /api/reports/templates
 *
 * List available report templates
 */

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { cacheTemplate } from "@/lib/reports/cache";
import { Prisma, ReportCategory } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    return await withTenantContext(orgId, async (tx) => {
      const { searchParams } = new URL(req.url);
      const propertyId = searchParams.get("propertyId");
      const category = searchParams.get("category");

      // Build where clause
      const where: Prisma.ReportTemplateWhereInput = {
        organizationId: orgId,
        isActive: true
      };

      if (propertyId) {
        where.OR = [
          { propertyId },
          { propertyId: null } // Include org-wide templates
        ];
      }

      if (
        category &&
        Object.values(ReportCategory).includes(category as ReportCategory)
      ) {
        where.category = category as ReportCategory;
      }

      // Fetch templates
      const templates = await tx.reportTemplate.findMany({
        where,
        orderBy: [
          { isSystem: "desc" }, // System templates first
          { name: "asc" }
        ]
      });

      // Cache each template
      for (const template of templates) {
        await cacheTemplate(template.id, template);
      }

      // Return only necessary fields to client
      const templatesResponse = templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        type: t.type,
        isSystem: t.isSystem,
        config: t.config,
        createdAt: t.createdAt
      }));

      return NextResponse.json({
        templates: templatesResponse,
        count: templatesResponse.length
      });
    });
  } catch (error) {
    console.error("Error fetching report templates:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch report templates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
