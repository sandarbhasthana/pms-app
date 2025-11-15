#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

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

  console.log("🚀 Starting Next.js server...");
  execSync("next start", { stdio: "inherit" });
} catch (error) {
  console.error("❌ Start failed:", error.message);
  process.exit(1);
}

