#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚂 Railway Start Process...");

try {
  // Check if Prisma client exists
  const prismaClientPath = path.join(
    __dirname,
    "..",
    "node_modules",
    ".prisma",
    "client"
  );

  if (!fs.existsSync(prismaClientPath)) {
    console.log("📦 Prisma client not found, generating now...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma client generated");

    console.log("📋 Running database migrations...");
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("✅ Migrations completed");
    } catch (error) {
      console.log("⚠️  Migrations failed:", error.message);
    }
  } else {
    console.log("✅ Prisma client already exists");
  }

  // Check if running on Vercel (serverless - no workers needed)
  const isVercel =
    process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;

  if (isVercel) {
    console.log("⚠️  Running on Vercel - Starting Next.js server only");
    console.log("💡 Workers are disabled on serverless platforms");
    execSync("next start", { stdio: "inherit" });
  } else {
    // Railway: Start both Next.js server and workers
    console.log("🚀 Starting Next.js server and BullMQ workers...");

    // Start Next.js server
    const server = spawn("npx", ["next", "start"], {
      stdio: "inherit",
      shell: true
    });

    // Start workers after a short delay
    setTimeout(() => {
      console.log("🔧 Starting BullMQ workers...");
      const workers = spawn("npx", ["tsx", "scripts/start-workers.ts"], {
        stdio: "inherit",
        shell: true
      });

      workers.on("error", (error) => {
        console.error("❌ Workers error:", error);
      });

      workers.on("exit", (code) => {
        console.log(`⚠️  Workers exited with code ${code}`);
      });
    }, 3000);

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server error:", error);
      process.exit(1);
    });

    server.on("exit", (code) => {
      console.log(`⚠️  Server exited with code ${code}`);
      process.exit(code || 1);
    });

    // Handle process termination
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      server.kill("SIGTERM");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      server.kill("SIGINT");
      process.exit(0);
    });
  }
} catch (error) {
  console.error("❌ Start failed:", error.message);
  process.exit(1);
}
