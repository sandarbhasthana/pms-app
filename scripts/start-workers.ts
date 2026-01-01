#!/usr/bin/env tsx
/**
 * Start All BullMQ Workers
 *
 * This script starts all background job workers for the application.
 * Workers process jobs from Redis queues asynchronously.
 *
 * Usage:
 *   npm run workers
 *   or
 *   tsx scripts/start-workers.ts
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("🚀 Starting BullMQ Workers...\n");

// Import workers (this will start them)
import("../src/lib/queue/workers/automation-worker");
import("../src/lib/queue/workers/report-worker");
import("../src/lib/queue/workers/channex-sync-worker");

console.log("\n✅ All workers started successfully!");
console.log("📊 Workers are now processing jobs from Redis queues");
console.log("🛑 Press Ctrl+C to stop all workers\n");

// Keep the process alive
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down all workers...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down all workers...");
  process.exit(0);
});

// Prevent the process from exiting
process.stdin.resume();
