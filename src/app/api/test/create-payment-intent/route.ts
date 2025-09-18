// src/app/api/test/create-payment-intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'usd', metadata = {} } = await req.json();

    // Validate amount
    if (!amount || amount < 50) { // Minimum 50 cents
      return NextResponse.json(
        { error: 'Amount must be at least 50 cents' },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer (cents)
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        test: 'true',
        created_from: 'test-payments-page'
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

  } catch (error) {
    console.error('Error creating test payment intent:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}
