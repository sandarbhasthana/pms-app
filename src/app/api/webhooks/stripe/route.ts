import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.text(); // Stripe sends raw text
  const sig = req.headers.get("stripe-signature");

  // TODO: verify signature and use Stripe SDK
  console.log("Received Stripe Webhook:", { sig, payload });

  return NextResponse.json({ received: true });
}
