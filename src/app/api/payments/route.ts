import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
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

    const payment = await prisma.payment.create({
      data: {
        reservationId,
        type,
        method,
        status,
        amount,
        notes
      }
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
