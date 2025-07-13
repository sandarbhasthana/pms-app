export const runtime = "nodejs"; // ✅ Use Node.js runtime for RLS context
import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { calculatePaymentStatus } from "@/lib/payments/utils";

export async function POST(req: NextRequest) {
  try {
    // Get organization context
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      reservationId,
      type = "charge",
      method = "manual",
      status = "succeeded",
      amount,
      notes
    } = body;

    if (!reservationId || !amount) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Create payment within tenant context
    const payment = await withTenantContext(orgId, async (tx) => {
      return await tx.payment.create({
        data: {
          reservationId,
          type,
          method,
          status,
          amount,
          notes
        }
      });
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("Payment creation error:", err);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
