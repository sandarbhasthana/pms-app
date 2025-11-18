#!/usr/bin/env node

import { execSync } from "child_process";

console.log("🚂 Railway Build Process Starting...");

try {
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not available during build phase");
    console.log("📦 Building Next.js without Prisma generation...");
    console.log("✅ Prisma will be generated at runtime");

    // Just build Next.js without Prisma
    execSync("next build", { stdio: "inherit" });

    console.log("✅ Build completed (Prisma deferred to runtime)");
  } else {
    console.log("✅ DATABASE_URL is available");
    console.log("📦 Generating Prisma client...");
    execSync("npx prisma generate", { stdio: "inherit" });

    console.log("📋 Running database migrations...");
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("✅ Migrations completed");
    } catch (error) {
      console.log("⚠️  Migrations failed, continuing...");
    }

    console.log("🏗️  Building Next.js application...");
    execSync("next build", { stdio: "inherit" });

    console.log("✅ Build completed successfully");
  }
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
