import { PrismaClient } from "@prisma/client";
import path from "node:path";

const runtimeDatabaseUrl = `file:${path.resolve(process.cwd(), "prisma/prisma/dev.db")}`;

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "file:./prisma/dev.db") {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
