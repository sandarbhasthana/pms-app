/**
 * Test Payment Webhook Simulation
 * 
 * Simulates Stripe webhook calls to test payment-triggered status updates
 */

import { prisma } from '../src/lib/prisma';
import { handlePaymentIntentSucceeded } from '../src/lib/webhooks/payment-handlers';
import '../src/lib/queue/workers/automation-worker'; // Initialize worker

// Mock Stripe PaymentIntent object
interface MockPaymentIntent {
  id: string;
  amount: number; // in cents
  currency: string;
  status: string;
  metadata: {
    reservationId: string;
    orgId?: string;
    propertyId?: string;
    type: string;
  };
  payment_method_types: string[];
}

async function testPaymentWebhookSimulation() {
  console.log('🧪 Testing Payment Webhook Simulation...\n');

  try {
    // Get test reservations
    const testReservations = await prisma.reservation.findMany({
      where: {
        guestName: {
          startsWith: 'Payment Test -'
        }
      },
      include: {
        property: {
          include: {
            organization: true,
            settings: true
          }
        }
      },
      orderBy: { guestName: 'asc' }
    });

    if (testReservations.length === 0) {
      console.error('❌ No test reservations found. Run create-payment-test-data.ts first.');
      return;
    }

    console.log(`📋 Found ${testReservations.length} test reservations\n`);

    // Test webhook scenarios
    const webhookScenarios = [
      {
        name: 'Same Day Full Payment Webhook',
        guestName: 'Payment Test - Same Day Full',
        paymentAmount: 20000, // $200.00 in cents
        description: 'Simulate full payment webhook for same-day booking'
      },
      {
        name: 'Same Day Partial Payment Webhook',
        guestName: 'Payment Test - Same Day Partial',
        paymentAmount: 10000, // $100.00 in cents (66.7% of $150)
        description: 'Simulate partial payment webhook above threshold'
      },
      {
        name: 'Future Full Payment Webhook',
        guestName: 'Payment Test - Future Full',
        paymentAmount: 30000, // $300.00 in cents
        description: 'Simulate full payment webhook for future booking'
      },
      {
        name: 'Future Partial Payment Webhook',
        guestName: 'Payment Test - Future Partial',
        paymentAmount: 5000, // $50.00 in cents (20% of $250)
        description: 'Simulate partial payment webhook below threshold'
      },
      {
        name: 'Additional Payment Webhook',
        guestName: 'Payment Test - Already Confirmed',
        paymentAmount: 8000, // $80.00 in cents (additional payment)
        description: 'Simulate additional payment for confirmed reservation'
      }
    ];

    // Execute webhook simulations
    for (const scenario of webhookScenarios) {
      const reservation = testReservations.find(r => r.guestName === scenario.guestName);
      
      if (!reservation) {
        console.log(`⚠️ Skipping ${scenario.name}: Reservation not found`);
        continue;
      }

      console.log(`\n🔄 Simulating: ${scenario.name}`);
      console.log(`   Reservation: ${reservation.id} (${reservation.guestName})`);
      console.log(`   Current Status: ${reservation.status}`);
      console.log(`   Current Paid: $${reservation.paidAmount || 0}`);
      console.log(`   Webhook Amount: $${scenario.paymentAmount / 100}`);
      console.log(`   Description: ${scenario.description}`);

      // Create mock PaymentIntent
      const mockPaymentIntent: MockPaymentIntent = {
        id: `pi_test_${reservation.id}_${Date.now()}`,
        amount: scenario.paymentAmount,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          reservationId: reservation.id,
          orgId: reservation.property.organizationId,
          propertyId: reservation.propertyId,
          type: 'reservation_payment'
        },
        payment_method_types: ['card']
      };

      try {
        // Record initial state
        const initialState = await prisma.reservation.findUnique({
          where: { id: reservation.id },
          select: {
            status: true,
            paidAmount: true,
            paymentStatus: true
          }
        });

        console.log(`   📸 Initial State: ${initialState?.status}, Paid: $${initialState?.paidAmount || 0}`);

        // Simulate webhook call
        await handlePaymentIntentSucceeded(mockPaymentIntent as any);

        console.log(`   ✅ Webhook processed successfully`);

        // Wait for queue processing
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check final state
        const finalState = await prisma.reservation.findUnique({
          where: { id: reservation.id },
          select: {
            status: true,
            paidAmount: true,
            paymentStatus: true,
            statusUpdatedAt: true,
            statusUpdatedBy: true,
            statusChangeReason: true
          }
        });

        if (finalState) {
          const statusChanged = finalState.status !== initialState?.status;
          const paymentUpdated = (finalState.paidAmount || 0) !== (initialState?.paidAmount || 0);
          
          console.log(`   📊 Final State: ${finalState.status}, Paid: $${finalState.paidAmount || 0}`);
          
          if (statusChanged) {
            console.log(`   🔄 Status Changed: ${initialState?.status} → ${finalState.status}`);
            if (finalState.statusChangeReason) {
              console.log(`   📝 Reason: ${finalState.statusChangeReason}`);
            }
          } else {
            console.log(`   ➡️ Status Unchanged: ${finalState.status}`);
          }
          
          if (paymentUpdated) {
            console.log(`   💰 Payment Updated: $${initialState?.paidAmount || 0} → $${finalState.paidAmount || 0}`);
          }

          // Check for payment transaction record
          const paymentTransaction = await prisma.paymentTransaction.findFirst({
            where: {
              reservationId: reservation.id,
              stripePaymentIntentId: mockPaymentIntent.id
            }
          });

          if (paymentTransaction) {
            console.log(`   💳 Payment Transaction Created: ${paymentTransaction.id}`);
          }

        } else {
          console.log(`   ❌ Failed to retrieve final state`);
        }

      } catch (error) {
        console.error(`   ❌ Error simulating ${scenario.name}:`, error);
      }
    }

    // Final summary
    console.log('\n📊 Final Summary:');
    const finalReservations = await prisma.reservation.findMany({
      where: {
        guestName: {
          startsWith: 'Payment Test -'
        }
      },
      select: {
        guestName: true,
        status: true,
        paidAmount: true,
        totalAmount: true,
        paymentStatus: true,
        statusUpdatedBy: true,
        statusChangeReason: true
      },
      orderBy: { guestName: 'asc' }
    });

    finalReservations.forEach(reservation => {
      const paymentPercentage = ((reservation.paidAmount || 0) / reservation.totalAmount * 100).toFixed(1);
      const automationIndicator = reservation.statusUpdatedBy === 'system-automation' ? '🤖' : '👤';
      
      console.log(`   ${automationIndicator} ${reservation.guestName}:`);
      console.log(`      Status: ${reservation.status} (${paymentPercentage}% paid)`);
      
      if (reservation.statusChangeReason) {
        console.log(`      Reason: ${reservation.statusChangeReason}`);
      }
    });

    console.log('\n✅ Payment webhook simulation completed!');
    console.log('🤖 = Automated status change');
    console.log('👤 = Manual status change');

  } catch (error) {
    console.error('❌ Error testing payment webhook simulation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the simulation
testPaymentWebhookSimulation();
