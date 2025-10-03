#!/usr/bin/env tsx

import { addJobToQueue } from "../src/lib/queue/queues";
import { LateCheckoutDetectionJobData } from "../src/lib/queue/types";

async function testApiLateCheckout() {
  console.log("🧪 Testing Late Checkout Detection via Queue API...");

  try {
    // Test data
    const propertyId = "cmfs7qxle0002njk44p5cacb3";
    
    console.log(`🏨 Testing late checkout detection for property: ${propertyId}`);

    // Create job data
    const jobData: LateCheckoutDetectionJobData = {
      jobType: "late-checkout-detection",
      propertyId,
      dryRun: true, // Start with dry run
      graceHours: 1, // 1 hour grace period for testing
      triggeredBy: "manual-api-test",
      timestamp: new Date()
    };

    console.log("📋 Job Data:");
    console.log(JSON.stringify(jobData, null, 2));

    // Add job to queue
    console.log("\n🚀 Adding job to automation queue...");
    const job = await addJobToQueue(
      "reservation-automation",
      `manual-late-checkout-detection-${propertyId}`,
      jobData,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        }
      }
    );

    console.log(`✅ Job added successfully with ID: ${job.id}`);
    console.log(`📊 Job Name: ${job.name}`);
    console.log(`⏰ Job Timestamp: ${job.timestamp}`);

    console.log("\n✅ Late checkout detection job submitted successfully!");
    console.log("🔍 The job will be processed by the automation worker.");
    console.log("📋 To see the full results, run the direct test script:");
    console.log("   npx tsx scripts/test-late-checkout-detection.ts");

  } catch (error) {
    console.error("❌ Error testing late checkout API:", error);
  }
}

// Run the test
testApiLateCheckout().catch(console.error);
