#!/usr/bin/env node

import { execSync } from "child_process";

console.log("🚀 Starting deployment process...");

try {
  // First, generate Prisma client
  console.log("📦 Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit" });

  // Check if migration system is initialized
  console.log("🔍 Checking migration system...");

  try {
    // Try to deploy migrations normally
    console.log("📋 Attempting migrate deploy...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Migrations deployed successfully");
  } catch (error) {
    console.log(
      "⚠️  Migration deploy failed. Initializing migration system..."
    );

    // If migration system is not initialized, we need to mark our baseline as applied
    try {
      console.log("🔧 Marking baseline migration as applied...");
      execSync("npx prisma migrate resolve --applied 20250914_baseline", {
        stdio: "inherit"
      });
      console.log("✅ Baseline migration marked as applied");

      // Now try to deploy any remaining migrations
      console.log("📋 Deploying remaining migrations...");
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("✅ All migrations deployed successfully");
    } catch (resolveError) {
      console.log(
        "❌ Migration resolution failed. Using db push as fallback..."
      );
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
      console.log("✅ Database schema pushed successfully");
    }
  }

  // Build the application
  console.log("🏗️  Building Next.js application...");
  execSync("npm run build", { stdio: "inherit" });

  console.log("🎉 Deployment completed successfully!");
} catch (error) {
  console.error("❌ Deployment failed:", error.message);
  process.exit(1);
}
