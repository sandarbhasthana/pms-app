// File: lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma Client to prevent exhausting connections in development
 */
const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
