import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  // Ignore patterns (migrated from .eslintignore)
  {
    ignores: [
      // Dependencies
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",

      // Third-party libraries
      "public/swipecalendar/**",
      "public/lib/**",

      // Test files
      "coverage/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",

      // Build outputs
      "dist/**",
      ".vercel/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default eslintConfig;
