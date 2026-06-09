// src/lib/db.ts
// Singleton PrismaClient — prevents connection exhaustion during Next.js HMR hot-reloads.
// In development, the module is re-evaluated on every change. Without the global guard,
// a new PrismaClient is spawned each time, exhausting the connection pool.
//
// Prisma 7 requires a driver adapter; we use @prisma/adapter-pg against PostgreSQL,
// reading the connection string from DATABASE_URL (loaded by Next.js from .env.local).

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
