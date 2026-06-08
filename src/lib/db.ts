// src/lib/db.ts
// Singleton PrismaClient — prevents connection exhaustion during Next.js HMR hot-reloads.
// In development, the module is re-evaluated on every change. Without the global guard,
// a new PrismaClient is spawned each time, exhausting the SQLite connection pool.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}