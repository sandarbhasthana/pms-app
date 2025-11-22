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

    let workersProcess = null;

    // Start Next.js server
    const server = spawn("npx", ["next", "start"], {
      stdio: "inherit",
      shell: true,
      detached: false
    });

    // Start workers after a short delay
    setTimeout(() => {
      console.log("🔧 Starting BullMQ workers...");
      workersProcess = spawn("npx", ["tsx", "scripts/start-workers.ts"], {
        stdio: "inherit",
        shell: true,
        detached: false
      });

      workersProcess.on("error", (error) => {
        console.error("❌ Workers error:", error);
      });

      workersProcess.on("exit", (code) => {
        console.log(`⚠️  Workers exited with code ${code}`);
        // Don't exit the main process if workers crash
        // They can be restarted independently
      });
    }, 3000);

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server error:", error);
      process.exit(1);
    });

    server.on("exit", (code) => {
      console.log(`⚠️  Server exited with code ${code}`);
      // Kill workers if server exits
      if (workersProcess) {
        workersProcess.kill("SIGTERM");
      }
      process.exit(code || 1);
    });

    // Handle process termination gracefully
    const shutdown = (signal) => {
      console.log(`🛑 Received ${signal}, shutting down gracefully...`);

      // Kill server first
      if (server && !server.killed) {
        server.kill("SIGTERM");
      }

      // Kill workers
      if (workersProcess && !workersProcess.killed) {
        workersProcess.kill("SIGTERM");
      }

      // Give processes time to clean up
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Keep the main process alive
    // This prevents Railway from thinking the process has exited
    const keepAlive = setInterval(() => {
      // Do nothing, just keep the event loop active
    }, 60000); // Check every minute

    // Clean up interval on exit
    process.on("exit", () => {
      clearInterval(keepAlive);
    });
  }
} catch (error) {
  console.error("❌ Start failed:", error.message);
  process.exit(1);
}
