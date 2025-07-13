export const runtime = "nodejs"; // ✅ Use Node.js runtime for RLS context
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";

// Allowed roles for modifying rooms
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR"];

export async function PUT(req: NextRequest) {
  // Access control
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !ALLOWED_ROLES.includes(role as string)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Determine orgId context
  const orgId =
    req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;
  if (!orgId) {
    return new NextResponse("Organization context missing", { status: 400 });
  }

  // Expecting an array of rooms with id, name, description, doorlockId
  const roomsToUpdate: {
    id: string;
    name: string;
    description?: string;
    doorlockId?: string;
  }[] = await req.json();

  try {
    // Perform all updates in parallel within tenant context
    const updated = await withTenantContext(orgId, async (tx) => {
      return await Promise.all(
        roomsToUpdate.map((r) =>
          tx.room.update({
            where: { id: r.id },
            data: {
              name: r.name,
              description: r.description,
              doorlockId: r.doorlockId
            }
          })
        )
      );
    });
    return NextResponse.json({ rooms: updated });
  } catch (error: unknown) {
    console.error("Bulk update error:", error);
    return new NextResponse("Failed to update rooms", { status: 500 });
  }
}
