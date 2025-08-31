// Simple test script for name formatter
import { formatGuestNameForCalendar } from "./src/lib/utils/nameFormatter.js";

// Test cases from your examples
const testCases = [
  "Sumit Bhatia",
  "Mark Waugh",
  "Ishesh Tyagi",
  "Marsh Waltershaman",
  "John",
  "Johnathan",
  "John Michael Doe",
  "Mary Jane Watson Smith",
  "",
  "   ",
  "A Bcdefghijk",
  "A Bcdefghijkl"
];

console.log("Testing name formatter:");
console.log("======================");

testCases.forEach((name) => {
  const formatted = formatGuestNameForCalendar(name);
  console.log(`"${name}" -> "${formatted}"`);
});
