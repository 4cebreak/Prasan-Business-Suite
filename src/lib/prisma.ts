import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  // Use absolute path relative to project root to avoid 'ghost' databases
  const dbPath = path.resolve(process.cwd(), "dev.db")
  const adapter = new PrismaBetterSqlite3({ url: dbPath })

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
