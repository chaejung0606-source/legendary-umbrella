import { PrismaClient } from "@prisma/client";

// Prisma 클라이언트 싱글턴 — 서버리스/HMR 에서 커넥션 폭증 방지.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
