/**
 * Clear Next.js and Node.js caches
 * Run this when you make changes to worker code and they're not being picked up
 */

import fs from "fs";
import path from "path";

console.log("🧹 Clearing caches...\n");

// Paths to clear
const pathsToClear = [".next", "node_modules/.cache", ".turbo"];

let clearedCount = 0;

pathsToClear.forEach((dirPath) => {
  const fullPath = path.join(process.cwd(), dirPath);

  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Cleared: ${dirPath}`);
      clearedCount++;
    } catch (error) {
      console.log(`⚠️  Could not clear ${dirPath}: ${error.message}`);
    }
  } else {
    console.log(`⏭️  Skipped: ${dirPath} (doesn't exist)`);
  }
});

console.log(
  `\n✨ Cache clearing complete! Cleared ${clearedCount} directories.`
);
console.log("\n📝 Next steps:");
console.log("   1. Restart your dev server: npm run dev");
console.log("   2. Restart your workers: npm run workers");
